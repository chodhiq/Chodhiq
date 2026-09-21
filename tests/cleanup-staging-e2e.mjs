import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;
assert.ok(url && serviceKey);
const db = createClient(url, serviceKey, { auth: { persistSession: false } });
const listed = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
assert.ifError(listed.error);
const users = listed.data.users.filter((user) => user.email?.startsWith('e2e-'));
const ids = users.map((user) => user.id);

if (ids.length) {
  const providers = await db.from('providers').select('id').in('owner_id', ids);
  assert.ifError(providers.error);
  const providerIds = providers.data.map((row) => row.id);
  if (providerIds.length) assert.ifError((await db.from('providers').delete().in('id', providerIds)).error);
  assert.ifError((await db.from('business_applications').delete().in('applicant_id', ids)).error);
  assert.ifError((await db.from('verification_requests').delete().in('submitted_by', ids)).error);
  assert.ifError((await db.from('community_posts').delete().in('author_id', ids)).error);
  assert.ifError((await db.from('admin_audit_log').delete().in('admin_id', ids)).error);
  assert.ifError((await db.from('user_moderation_status').delete().in('user_id', ids)).error);
  for (const user of users) {
    const result = await db.auth.admin.deleteUser(user.id);
    assert.ifError(result.error, `delete ${user.email}`);
  }
}

console.log(`removed_e2e_users=${users.length}`);
