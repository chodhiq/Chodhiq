import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const wrapper = `
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions,pg_temp;
create temporary table deployment_tap_results(result text);
create function pg_temp.assert_tap(result text) returns text language plpgsql security definer set search_path=pg_catalog,pg_temp as $check$
begin
 if result like 'not ok%' or result like '# Looks like%' then raise exception 'Community test failed: %',result; end if;
 insert into pg_temp.deployment_tap_results values(result);
 return result;
end;
$check$;
`;
const migrations = [
  '20261003100000_allow_community_post_images.sql',
  '20261003110000_community_images_and_post_notifications.sql',
  '20261003120000_connect_notification_push_delivery.sql',
];
const sql =
  'begin;\n' +
  (process.argv.includes('--deployed')
    ? ''
    : migrations
        .map((name) =>
          readFileSync('supabase/migrations/' + name, 'utf8')
            .replace(/^begin;\s*/i, '')
            .replace(/commit;\s*$/i, ''),
        )
        .join('\n')) +
  'alter table public.notifications disable trigger dispatch_notification_push_trigger;\n' +
  wrapper +
  readFileSync('supabase/tests/community_notifications.test.sql', 'utf8')
    .replace(/^begin;\s*/i, '')
    .replace(/^select is\((.*)\);$/gm, 'select pg_temp.assert_tap(is($1));')
    .replace(
      'select * from finish();',
      'select pg_temp.assert_tap(result) from finish() as result;',
    )
    .replace(/rollback;\s*$/i, '') +
  `
do $$ begin
 if (select count(*) from pg_temp.deployment_tap_results where result like 'ok %')<>12 then raise exception 'Expected twelve assertions'; end if;
end $$;
rollback;
select 'passed' as status,12 as assertions,'All synthetic data and network requests rolled back' as cleanup;
`;
const path = 'artifacts/community-notifications-rehearsal.sql';
writeFileSync(path, sql);
const local = process.argv.includes('--local');
const result = local
  ? spawnSync(
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
      { input: sql, encoding: 'utf8', maxBuffer: 1024 * 1024 },
    )
  : spawnSync(
      process.execPath,
      ['node_modules/supabase/dist/supabase.js', 'db', 'query', '--linked', '--file', path],
      { encoding: 'utf8', maxBuffer: 1024 * 1024 },
    );
if (result.status) {
  process.stderr.write(result.stderr);
  process.stdout.write(result.stdout);
  process.exit(result.status);
}
writeFileSync(
  `artifacts/community-notifications-${local ? 'local' : 'production'}-test-results.${local ? 'txt' : 'json'}`,
  result.stdout,
);
process.stdout.write(result.stdout);
