import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const deployed = process.argv.includes('--deployed');
if (readFileSync('supabase/.temp/project-ref', 'utf8').trim() !== 'gfjhvsajwjrrlylgrkhf')
  throw new Error('Unexpected linked project');
const unwrap = (sql) => sql.replace(/^begin;\s*/i, '').replace(/(?:commit|rollback);\s*$/i, '');
const migrations = [
  '20261006120000_scoped_community_engagement.sql',
  '20261006130000_push_receipt_tracking.sql',
];
const wrapper = `create extension if not exists pgtap with schema extensions;set local search_path=public,extensions,pg_temp;create temporary table beta_tap(result text);create function pg_temp.assert_tap(result text)returns text language plpgsql security definer set search_path=pg_catalog,pg_temp as $fn$begin if result like 'not ok%' or result like '# Looks like%' then raise exception 'Beta assertion failed: %',result;end if;insert into pg_temp.beta_tap values(result);return result;end $fn$;`;
const results = [];
for (const suite of ['community_engagement_scoped', 'push_receipt_tracking']) {
  const source = readFileSync('supabase/tests/' + suite + '.test.sql', 'utf8');
  const count = Number(source.match(/select plan\((\d+)\)/i)[1]);
  const body = unwrap(source)
    .replace(
      /^select ((?:is|ok|has_column|throws_ok|lives_ok)\(.*\));$/gm,
      'select pg_temp.assert_tap($1);',
    )
    .replace('select * from finish();', 'select pg_temp.assert_tap(line) from finish() as line;');
  const sql =
    'begin;\n' +
    (deployed
      ? ''
      : migrations
          .map((name) => unwrap(readFileSync('supabase/migrations/' + name, 'utf8')))
          .join('\n')) +
    '\nalter table public.notifications disable trigger dispatch_notification_push_trigger;\n' +
    wrapper +
    '\n' +
    body +
    `reset role;do $$begin if(select count(*)from pg_temp.beta_tap where result like 'ok %')<>${count} then raise exception 'Incorrect beta assertion count';end if;end $$;rollback;select 'passed' as status,${count} as assertions,'${suite}' as suite;`;
  const file = 'artifacts/beta-' + (deployed ? 'deployed' : 'preflight') + '-' + suite + '.sql';
  writeFileSync(file, sql);
  const result = spawnSync(
    process.execPath,
    ['node_modules/supabase/dist/supabase.js', 'db', 'query', '--linked', '--file', file],
    { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, timeout: 60000 },
  );
  if (result.status) throw new Error(result.stdout + result.stderr);
  const row = JSON.parse(result.stdout).rows[0];
  if (row.status !== 'passed') throw new Error('Unexpected beta result');
  results.push(row);
  console.log(suite + ': ' + row.assertions + ' assertions passed (rolled back)');
}
writeFileSync(
  'artifacts/beta-db-' + (deployed ? 'deployed' : 'preflight') + '-20261006.json',
  JSON.stringify(results, null, 2),
);
