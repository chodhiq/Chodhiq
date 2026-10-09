import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Local-only destructive rehearsal: reset to the pre-community foundation,
// commit synthetic content, apply pending migrations, and compare every row.
function run(command, args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '',
      stderr = '';
    child.stdout.on('data', (c) => {
      stdout += c;
    });
    child.stderr.on('data', (c) => {
      stderr += c;
    });
    child.on('error', reject);
    child.on('close', (code) => (code ? reject(new Error(stderr || stdout)) : resolve(stdout)));
    child.stdin.end(input);
  });
}
const cli = (...args) =>
  run(process.execPath, [resolve('node_modules/supabase/dist/supabase.js'), ...args]);
const sql = (statement) =>
  run(
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
    statement,
  );
const q = (v) => "'" + String(v).replaceAll("'", "''") + "'";
const owner = randomUUID(),
  reader = randomUUID(),
  provider = randomUUID();
const posts = Array.from({ length: 4 }, () => randomUUID());
const comments = Array.from({ length: 3 }, () => randomUUID());
const reports = Array.from({ length: 2 }, () => randomUUID());
const snapshot = () =>
  sql(`select jsonb_build_object(
 'posts',(select jsonb_agg(to_jsonb(p)-'community_id' order by id) from public.community_posts p where id in (${posts.map(q)})),
 'comments',(select jsonb_agg(to_jsonb(c)-'parent_comment_id'-'status' order by id) from public.community_comments c where id in (${comments.map(q)})),
 'likes',(select jsonb_agg(to_jsonb(l) order by post_id,user_id) from public.community_post_likes l where post_id in (${posts.map(q)})),
 'saves',(select jsonb_agg(to_jsonb(s) order by post_id,user_id) from public.community_saved_posts s where post_id in (${posts.map(q)})),
 'reports',(select jsonb_agg(to_jsonb(r)-'comment_id'-'updated_at' order by id) from public.community_post_reports r where id in (${reports.map(q)})),
 'entitlements',(select to_jsonb(e) from public.provider_entitlements e where provider_id=${q(provider)}));`);
console.log('Resetting LOCAL database to 20261001120000 (pre-community upgrade)');
await cli('db', 'reset', '--local', '--version', '20261001120000', '--no-seed', '--yes');
try {
  await sql(`begin;
 insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data) values
 (${q(owner)},'authenticated','authenticated','upgrade-owner@example.test','{}','{}'),
 (${q(reader)},'authenticated','authenticated','upgrade-reader@example.test','{}','{}');
 insert into public.providers(id,owner_id,business_name,category_id,base_city,is_claimed,is_verified,verification_status)
 select ${q(provider)},${q(owner)},'Upgrade rehearsal provider',id,'London',true,true,'verified' from public.categories order by id limit 1;
 insert into public.provider_entitlements(provider_id,offers_active,expires_at) values(${q(provider)},true,now()+interval '30 days');
 select set_config('request.jwt.claims',${q(JSON.stringify({ sub: owner }))},true);
 insert into public.community_posts(id,author_id,body,status,created_at,region_key,location_city) values
 (${q(posts[0])},${q(owner)},'Existing published discussion','published','2026-09-01T10:00:00Z','kerala','London'),
 (${q(posts[1])},${q(owner)},'Existing post under review','under_review','2026-09-02T10:00:00Z','tamilnadu','Leicester'),
 (${q(posts[2])},${q(owner)},'Existing removed post','removed','2026-09-03T10:00:00Z',null,null);
 insert into public.community_posts(id,author_id,provider_id,post_type,body,image_url,created_at)
 values(${q(posts[3])},${q(owner)},${q(provider)},'promotion','Existing paid promotion','https://example.test/legacy-poster.jpg','2026-09-04T10:00:00Z');
 insert into public.community_comments(id,post_id,author_id,body,created_at) values
 (${q(comments[0])},${q(posts[0])},${q(reader)},'Existing first comment','2026-09-05T10:00:00Z'),
 (${q(comments[1])},${q(posts[0])},${q(owner)},'Existing response','2026-09-06T10:00:00Z'),
 (${q(comments[2])},${q(posts[3])},${q(reader)},'Existing promotion comment','2026-09-07T10:00:00Z');
 insert into public.community_post_likes(post_id,user_id) values(${q(posts[0])},${q(reader)}),(${q(posts[3])},${q(reader)});
 insert into public.community_saved_posts(post_id,user_id) values(${q(posts[0])},${q(reader)}),(${q(posts[3])},${q(reader)});
 insert into public.community_post_reports(id,post_id,reporter_id,reason,status,created_at) values
 (${q(reports[0])},${q(posts[0])},${q(reader)},'spam_or_scam','open','2026-09-08T10:00:00Z'),
 (${q(reports[1])},${q(posts[3])},${q(reader)},'other','resolved','2026-09-09T10:00:00Z');
 commit;`);
  const before = JSON.parse(await snapshot());
  await writeFile('tmp/community-upgrade-before.json', JSON.stringify(before, null, 2));
  console.log(
    'Committed fixtures: 4 posts across statuses, 3 comments, 2 likes, 2 saves, 2 reports, paid entitlement',
  );
  console.log('Applying pending migrations ONLY to local database');
  await cli('migration', 'up', '--local', '--yes');
  const after = JSON.parse(await snapshot());
  await writeFile('tmp/community-upgrade-after.json', JSON.stringify(after, null, 2));
  assert.deepEqual(
    after,
    before,
    'Existing IDs, relationships, values, timestamps, statuses, and entitlement usage must survive upgrade',
  );
  assert.equal(
    (
      await sql(
        `select count(*) from public.community_posts p join public.community_spaces s on s.id=p.community_id where p.id in (${posts.map(q)}) and s.slug='general';`,
      )
    ).trim(),
    '4',
  );
  assert.equal(
    (
      await sql(
        `select count(*) from public.community_memberships m join public.community_spaces s on s.id=m.space_id where m.user_id=${q(owner)} and s.slug='general';`,
      )
    ).trim(),
    '1',
  );
  const publicPosts = await sql(
    `begin;set local role anon;select set_config('request.jwt.claims','{}',true);select count(*) from public.community_posts where id in (${posts.map(q)});commit;`,
  );
  assert.equal(publicPosts.trim().split(/\r?\n/).at(-1), '2');
  console.log(
    'PASS populated upgrade: existing data unchanged, all posts assigned to General, author membership backfilled, public visibility preserved',
  );
} finally {
  await sql(
    `delete from public.providers where id=${q(provider)}; delete from auth.users where id in (${q(owner)},${q(reader)});`,
  );
  console.log('Upgrade fixtures cleaned up; local database remains on latest migrations');
}
