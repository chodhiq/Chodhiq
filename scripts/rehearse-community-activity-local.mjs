import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// Transactional rehearsal on the local Docker database only. No production URLs or credentials.
const migrations = [
  '20261003100000_allow_community_post_images.sql',
  '20261003110000_community_images_and_post_notifications.sql',
  '20261003120000_connect_notification_push_delivery.sql',
  '20261004150000_community_activity_notifications.sql',
];
const unwrap = (sql) => sql.replace(/^begin;\s*/i, '').replace(/(?:commit|rollback);\s*$/i, '');
const sql =
  'begin;\n' +
  migrations.map((name) => unwrap(readFileSync('supabase/migrations/' + name, 'utf8'))).join('\n') +
  '\nalter table public.notifications disable trigger dispatch_notification_push_trigger;\n' +
  unwrap(readFileSync('supabase/tests/community_activity_notifications.test.sql', 'utf8')) +
  '\nrollback;';
const result = spawnSync(
  'docker',
  [
    'exec',
    '-i',
    'supabase_db_chodhiq',
    'psql',
    '-U',
    'postgres',
    '-d',
    'postgres',
    '-qAt',
    '-v',
    'ON_ERROR_STOP=1',
  ],
  { input: sql, encoding: 'utf8' },
);
process.stdout.write(result.stdout || '');
process.stderr.write(result.stderr || '');
if (result.error) throw result.error;
if (result.status || /not ok|Looks like you/.test(result.stdout)) process.exit(1);
if ((result.stdout.match(/^ok \d+/gm) || []).length !== 15)
  throw new Error('Expected 15 passing database assertions');
