import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('new Auth accounts create and backfill public customer profiles', async () => {
  const migration = await read(
    'supabase/migrations/20260916090000_sync_auth_users_to_profiles.sql',
  );
  assert.match(migration, /after insert on auth\.users/i);
  assert.match(migration, /insert into public\.profiles \(id, full_name\)/i);
  assert.match(migration, /raw_user_meta_data\s*->>\s*'full_name'/i);
  assert.match(migration, /security definer/i);
  assert.match(migration, /set search_path = ''/i);
  assert.match(migration, /revoke all on function/i);
  assert.match(migration, /from auth\.users as users/i);
  assert.match(migration, /on conflict \(id\) do update/i);
});

test('account export references tables defined by the Supabase schema', async () => {
  const repository = await read('src/data/accountRepository.js');
  const migrationDirectory = new URL('../supabase/migrations/', import.meta.url);
  const migrationFiles = (await readdir(migrationDirectory)).filter((name) =>
    name.endsWith('.sql'),
  );
  const schema = (
    await Promise.all(migrationFiles.map((name) => read(`supabase/migrations/${name}`)))
  ).join('\n');
  const match = repository.match(/const tables = \[([\s\S]*?)\];/);
  assert.ok(match, 'Account export table list is missing');
  const tables = [...match[1].matchAll(/\['([a-z_]+)',\s*'[a-z_]+',\s*'[a-z_]+'\]/g)].map(
    (item) => item[1],
  );
  for (const table of tables) {
    assert.match(
      schema,
      new RegExp(`create\\s+table(?:\\s+if\\s+not\\s+exists)?\\s+(?:public\\.)?${table}\\b`, 'i'),
      `Missing schema table ${table}`,
    );
  }
});

test('PostGIS platform-owned metadata is documented outside customer-table RLS checks', async () => {
  const audit = await read('db/SECURITY_POSTURE_AUDIT.sql');
  assert.match(audit, /spatial_ref_sys/);
  assert.match(audit, /expected platform warning, not customer-data exposure/i);
  assert.doesNotMatch(audit, /API roles can modify PostGIS spatial_ref_sys metadata/i);
});

test('quote requests are rate-limited before lead notification triggers', async () => {
  const migration = await read('supabase/migrations/20261007130000_quote_request_rate_limits.sql');
  assert.match(migration, /security definer\s+set search_path = pg_catalog, public/i);
  assert.match(migration, /auth\.uid\(\)/i);
  assert.match(migration, /new\.user_id is distinct from caller/i);
  assert.match(migration, /customer-quote-requests/i);
  assert.match(migration, /floor\(extract\(epoch from clock_timestamp\(\)\) \/ 3600\)/i);
  assert.match(migration, /if rate_count > 5 then/i);
  assert.match(migration, /before insert on public\.quote_requests/i);
  assert.match(migration, /message_length[\s\S]*?between 1 and 2000/i);
  assert.match(migration, /preferred_contact[\s\S]*?whatsapp','call','email/i);
});

test('customer saved items and profile changes sync through owner-scoped records', async () => {
  const account = await read('src/data/accountRepository.js');
  const sync = await read('src/data/syncRepository.js');
  const rls = await read(
    'supabase/migrations/20260805193127_harden_rls_and_add_foreign_key_indexes.sql',
  );
  const grants = await read(
    'supabase/migrations/20261009003000_grant_customer_profile_saved_item_access.sql',
  );
  assert.match(account, /from\('saved_items'\)\.upsert/);
  assert.match(account, /from\('profiles'\)\s*\.upsert/);
  assert.match(account, /hasImportedLocalSavedItems/);
  assert.match(account, /markLocalSavedItemsImported/);
  assert.match(sync, /item\.operation === 'saved_item'/);
  assert.match(sync, /item\.operation === 'profile_update'/);
  assert.match(rls, /Users manage their own saved items[\s\S]*?auth\.uid\(\)\) = user_id/);
  assert.match(rls, /Users update their own profile[\s\S]*?auth\.uid\(\)\) = id/);
  assert.match(grants, /grant select, insert, update on table public\.profiles to authenticated/i);
  assert.match(
    grants,
    /grant select, insert, update, delete on table public\.saved_items to authenticated/i,
  );
});

test('verification decision notifications use the ChodhiQ brand', async () => {
  const migration = await read(
    'supabase/migrations/20261009002000_rename_sanjha_verification_notification.sql',
  );
  const notificationFunction = migration.slice(migration.indexOf('create or replace function'));
  assert.match(notificationFunction, /verified on ChodhiQ/i);
  assert.doesNotMatch(notificationFunction, /Sanjha/i);
});

test('dashboard workers secure image optimization responses and avoid public caching', async () => {
  for (const workerPath of [
    'admin-dashboard/worker/index.ts',
    'business-dashboard/worker/index.ts',
  ]) {
    const worker = await read(workerPath);
    assert.match(worker, /isImageOptimizationPath\(url\.pathname\)/);
    const imageRoute = worker.slice(
      worker.indexOf('if (isImageOptimizationPath'),
      worker.indexOf('\n    }', worker.indexOf('if (isImageOptimizationPath')),
    );
    assert.match(imageRoute, /X-Content-Type-Options/);
    assert.match(imageRoute, /X-Frame-Options/);
    assert.match(imageRoute, /Cache-Control', 'private, no-store/);
  }
});

test('community moderation is administrator-only, audited, and conflict safe', async () => {
  const migration = await read(
    'supabase/migrations/20260820120000_secure_live_community_moderation.sql',
  );
  assert.match(migration, /Admins read all community posts/i);
  assert.match(migration, /public\.is_admin\(\)/i);
  assert.match(migration, /for update/i);
  assert.match(migration, /current_post\.status <> expected_status/i);
  assert.match(migration, /length\(clean_reason\) < 8/i);
  assert.match(migration, /admin_audit_log/i);
  assert.match(migration, /revoke all on function/i);
});

test('business hours and quote replies use transactional owner-only functions', async () => {
  const migration = await read(
    'supabase/migrations/20260820130000_transactional_owner_dashboard_writes.sql',
  );
  assert.match(migration, /replace_provider_hours/i);
  assert.match(migration, /respond_to_quote/i);
  assert.match(migration, /public\.owns_provider/i);
  assert.match(migration, /for update/i);
  assert.match(migration, /current_quote\.status <> expected_status/i);
  assert.match(migration, /revoke all on function/gi);
});

test('Leicester import contains only FSA exact-match public fields', async () => {
  const migration = await read(
    'supabase/migrations/20260924120000_import_fsa_confirmed_leicester_food_businesses.sql',
  );
  const sourceIds = [...migration.matchAll(/'leicester-fsa-(\d+)'/g)].map((match) => match[1]);
  assert.equal(sourceIds.length, 28);
  assert.equal(new Set(sourceIds).size, 28);
  assert.doesNotMatch(migration, /Lala\?s/i);
  assert.doesNotMatch(migration, /\b(phone|contact_email|website|whatsapp)\b/i);
  assert.match(migration, /false,false,'unverified'/i);
  assert.match(migration, /on conflict \(business_name,base_postcode\) do update/i);
});

test('public data verification stays separate from business verification', async () => {
  const migration = await read(
    'supabase/migrations/20260924130000_public_data_verification_badges.sql',
  );
  const repository = await read('src/data/providerRepository.js');
  const cards = await read('src/components/ProviderCard.js');
  assert.match(migration, /data_verification_status/i);
  assert.match(migration, /source_checked/i);
  assert.doesNotMatch(migration, /set\s+is_verified\s*=\s*true/i);
  assert.match(repository, /isDataVerified:\s*row\.data_verification_status === 'source_checked'/i);
  assert.match(cards, /Data checked/i);
  assert.match(cards, /dataVerifiedGlow/i);
});
