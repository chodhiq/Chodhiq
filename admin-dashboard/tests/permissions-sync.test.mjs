import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const here = new URL('.', import.meta.url);
const permissionFile = new URL('../lib/permissions.ts', here);
const basePermissionMigration = new URL('../../supabase/migrations/20261022120000_admin_targeted_notifications.sql', here);
const enforcementMigration = new URL('../../supabase/migrations/20261023110000_admin_permission_enforcement.sql', here);

test('database admin permissions and RLS guards match the TypeScript permission matrix', async () => {
  const source = await readFile(permissionFile, 'utf8');
  const typeMatch = source.match(/export type Permission\s*=\s*([^;]+);/);
  assert.ok(typeMatch, 'Permission type is present');
  const permissions = [...typeMatch[1].matchAll(/'([^']+)'/g)].map((match) => match[1]).sort();
  const matrixMatch = source.match(/export const PERMISSION_MATRIX:[\s\S]*?=\s*\{([\s\S]*?)\n\};/);
  assert.ok(matrixMatch, 'PERMISSION_MATRIX is present');
  const matrixBody = matrixMatch[1];
  const levels = ['super_admin', 'moderator', 'support', 'finance', 'analyst'];
  const expected = new Set();
  for (const level of levels) {
    if (new RegExp(`${level}:\\s*'\\*'`).test(matrixBody)) {
      for (const permission of permissions) expected.add(`${level}|${permission}`);
      continue;
    }
    const match = matrixBody.match(new RegExp(`${level}:\\s*\\[([^\\]]*)\\]`));
    assert.ok(match, `Matrix includes ${level}`);
    for (const [, permission] of match[1].matchAll(/'([^']+)'/g)) expected.add(`${level}|${permission}`);
  }

  const [baseSql, enforcementSql] = await Promise.all([
    readFile(basePermissionMigration, 'utf8'),
    readFile(enforcementMigration, 'utf8'),
  ]);
  const actual = new Set();
  for (const permission of permissions) actual.add(`super_admin|${permission}`);
  for (const sql of [baseSql, enforcementSql]) {
    for (const [, level, list] of sql.matchAll(/admin_level'?\s*=\s*'([^']+)'\s+and permission_name in \(([^)]+)\)/g)) {
      for (const [, permission] of list.matchAll(/'([^']+)'/g)) actual.add(`${level}|${permission}`);
    }
  }
  assert.deepEqual([...actual].sort(), [...expected].sort(), 'SQL permission grants match the TypeScript permission matrix');

  assert.match(enforcementSql, /from auth\.users u[\s\S]*?raw_app_meta_data/, 'Role checks read current Auth metadata');
  assert.match(enforcementSql, /grant execute on function public\.is_admin\(\) to anon, authenticated/, 'Public policies can evaluate is_admin safely');
  assert.match(enforcementSql, /as restrictive for all to authenticated/, 'Admin policies are constrained by restrictive RLS gates');
  const guardBlock = enforcementSql.match(
    /select \* from \(values([\s\S]*?)\) as guards\(table_name, permission_name\)/,
  )?.[1];
  assert.ok(guardBlock, 'Public-table permission gates are declared');
  const guards = [...guardBlock.matchAll(/\('([a-z_]+)',\s*'([^']+)'\)/g)];
  const guardedTables = new Set(guards.map(([, table]) => table));
  for (const [, table, permission] of guards) {
    assert.ok(permissions.includes(permission), `${table} uses a declared permission`);
  }
  const storageGuardBlock = enforcementSql.match(
    /select \* from \(values([\s\S]*?)\) as guards\(bucket_name, permission_name\)/,
  )?.[1];
  assert.ok(storageGuardBlock, 'Storage bucket permission gates are declared');
  const storageGuards = [...storageGuardBlock.matchAll(/\('([-a-z]+)',\s*'([^']+)'\)/g)];
  for (const [, bucket, permission] of storageGuards) {
    assert.ok(permissions.includes(permission), `${bucket} uses a declared permission`);
  }
  for (const table of [
    'admin_audit_log',
    'business_applications',
    'payment_records',
    'profiles',
    'providers',
    'reviews',
    'verification_requests',
  ]) {
    assert.ok(guardedTables.has(table), `${table} has an explicit permission gate`);
  }
});
