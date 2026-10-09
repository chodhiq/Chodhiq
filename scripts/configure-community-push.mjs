import { randomBytes } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

// Run only as part of an authorized production rollout. Existing webhook secrets remain intact.
const projectRef = 'gfjhvsajwjrrlylgrkhf';
const secret = randomBytes(32).toString('hex');
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'chodhiq-community-push-'));
function cli(args) {
  const result = spawnSync(process.execPath, ['node_modules/supabase/dist/supabase.js', ...args], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  });
  if (result.status !== 0) {
    const message = (result.stderr + result.stdout).replaceAll(secret, '[REDACTED]');
    throw new Error(message || 'Push configuration command failed.');
  }
}
try {
  const envPath = join(temporaryDirectory, 'push.env');
  writeFileSync(envPath, `COMMUNITY_PUSH_WEBHOOK_SECRET=${secret}\n`, { mode: 0o600 });
  cli(['secrets', 'set', '--project-ref', projectRef, '--env-file', envPath]);
  const sqlPath = join(temporaryDirectory, 'push.sql');
  writeFileSync(
    sqlPath,
    `begin;
do $$ declare existing_id uuid; begin
 select id into existing_id from vault.secrets where name='community_push_secret';
 if existing_id is null then
  perform vault.create_secret('${secret}','community_push_secret','Notification webhook authentication');
 else
  perform vault.update_secret(existing_id,'${secret}');
 end if;
 select id into existing_id from vault.secrets where name='community_push_url';
 if existing_id is null then
  perform vault.create_secret('https://${projectRef}.supabase.co/functions/v1/push-notification','community_push_url','Notification delivery endpoint');
 else
  perform vault.update_secret(existing_id,'https://${projectRef}.supabase.co/functions/v1/push-notification');
 end if;
end $$;
commit;
select 'configured' as status;`,
    { mode: 0o600 },
  );
  cli(['db', 'query', '--linked', '--file', sqlPath]);
  console.log(
    'Community push credentials configured in Edge Functions and Vault. No credentials were logged.',
  );
} finally {
  // Only the fixed temporary files created above are removed; no recursive deletion.
  rmSync(join(temporaryDirectory, 'push.env'), { force: true });
  rmSync(join(temporaryDirectory, 'push.sql'), { force: true });
  rmdirSync(temporaryDirectory);
}
