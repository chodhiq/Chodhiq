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
  const tables = [...match[1].matchAll(/'([a-z_]+)'/g)].map((item) => item[1]);
  for (const table of tables) {
    assert.match(
      schema,
      new RegExp(`create\\s+table(?:\\s+if\\s+not\\s+exists)?\\s+(?:public\\.)?${table}\\b`, 'i'),
      `Missing schema table ${table}`,
    );
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
