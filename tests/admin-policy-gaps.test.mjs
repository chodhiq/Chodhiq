import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migration = await readFile(
  new URL('../supabase/migrations/20260904120000_close_admin_rls_policy_gaps.sql', import.meta.url),
  'utf8',
);

test('administrators receive explicit category CRUD policy and grants', () => {
  assert.match(migration, /policy "Admins manage categories"[\s\S]*?for all[\s\S]*?is_admin\(\)/i);
  assert.match(migration, /grant insert, update, delete on public\.categories to authenticated/i);
});

test('review moderation is admin-only and column-scoped', () => {
  assert.match(
    migration,
    /policy "Admins moderate reviews"[\s\S]*?for update[\s\S]*?is_admin\(\)/i,
  );
  assert.match(migration, /grant update \(moderation_status\) on public\.reviews/i);
  assert.doesNotMatch(migration, /grant update on public\.reviews/i);
});

test('administrators can delete provider review replies without weakening owner policy', () => {
  assert.match(
    migration,
    /policy "Admins delete review replies"[\s\S]*?for delete[\s\S]*?is_admin\(\)/i,
  );
  assert.doesNotMatch(migration, /drop policy if exists "Owners manage review replies"/i);
});
