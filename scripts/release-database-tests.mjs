import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const phase = process.argv[2];
if (!['preflight', 'deployed'].includes(phase)) throw new Error('Specify preflight or deployed');
if (readFileSync('supabase/.temp/project-ref', 'utf8').trim() !== 'gfjhvsajwjrrlylgrkhf')
  throw new Error('Unexpected linked project');
const suites = [
  'admin_feed_operations',
  'community_member_profiles',
  'business_application_workflow',
  'community_privileges',
  'database_security',
  'community_backend',
  'community_images',
];
const results = [];
for (const suite of suites) {
  const file = 'artifacts/release-' + phase + '-' + suite + '.sql';
  const sql = readFileSync(file, 'utf8');
  if (
    !sql.includes('disable trigger dispatch_notification_push_trigger') ||
    !sql.includes('rollback;')
  )
    throw new Error('Unsafe test wrapper');
  const result = spawnSync(
    process.execPath,
    ['node_modules/supabase/dist/supabase.js', 'db', 'query', '--linked', '--file', file],
    { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 },
  );
  if (result.status) {
    console.error(suite + ' failed: ' + result.stderr + result.stdout);
    process.exit(result.status || 1);
  }
  const row = JSON.parse(result.stdout).rows?.[0];
  if (row?.status !== 'passed' || row.suite !== suite) throw new Error('Unexpected test result');
  results.push(row);
  writeFileSync(
    'artifacts/release-db-' + phase + '-20261006.json',
    JSON.stringify(results, null, 2),
  );
  console.log(suite + ': ' + row.assertions + ' assertions passed (rolled back)');
}
