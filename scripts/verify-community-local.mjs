import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

// Deliberately hard-coded local container/database. No URL, project ref, or
// environment credentials are accepted by this verification tool.
const container = 'supabase_db_chodhiq';
const quote = (value) => "'" + String(value).replaceAll("'", "''") + "'";
function sql(statement, allowFailure = false) {
  return new Promise((resolve, reject) => {
    const process = spawn(
      'docker',
      [
        'exec',
        '-i',
        container,
        'psql',
        '-U',
        'postgres',
        '-d',
        'postgres',
        '-qAt',
        '-v',
        'ON_ERROR_STOP=1',
      ],
      { stdio: ['pipe', 'pipe', 'pipe'] },
    );
    let stdout = '',
      stderr = '';
    process.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    process.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    process.on('error', reject);
    process.on('close', (code) => {
      const result = { code, stdout: stdout.trim(), stderr };
      if (code && !allowFailure) reject(new Error(stderr));
      else resolve(result);
    });
    process.stdin.end(statement);
  });
}
const actor = randomUUID(),
  author = randomUUID();
const peers = Array.from({ length: 12 }, () => randomUUID());
const spaces = Array.from({ length: 12 }, () => randomUUID());
const post = randomUUID();
const provider = randomUUID();
const comments = Array.from({ length: 12 }, () => randomUUID());
const allUsers = [actor, author, ...peers];
const asActor = (statement) =>
  `begin; set local role authenticated; do $$begin perform set_config('request.jwt.claims',${quote(JSON.stringify({ sub: actor, role: 'authenticated' }))},true); end$$; ${statement}; commit;`;
try {
  await sql(`begin;
    insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data) values ${allUsers.map((id) => `(${quote(id)},'authenticated','authenticated',${quote('local-community-' + id + '@example.test')},'{}','{}')`).join(',')};
    insert into public.community_spaces(id,slug,name) values ${spaces.map((id) => `(${quote(id)},${quote('check-' + id.slice(0, 20))},'Local concurrency test')`).join(',')};
    insert into public.providers(id,owner_id,business_name,category_id,base_city,is_claimed,is_verified,verification_status)
    select ${quote(provider)},${quote(actor)},'Local concurrent promotion provider',id,'London',true,true,'verified' from public.categories order by id limit 1;
    insert into public.provider_entitlements(provider_id,offers_active,expires_at) values(${quote(provider)},true,now()+interval '30 days');
    select set_config('request.jwt.claims',${quote(JSON.stringify({ sub: author }))},true);
    insert into public.community_posts(id,author_id,body) values(${quote(post)},${quote(author)},'Local concurrency fixture');
    insert into public.community_comments(id,post_id,author_id,body) values ${comments.map((id) => `(${quote(id)},${quote(post)},${quote(author)},'Report target fixture')`).join(',')};
    commit;`);
  const cases = [
    [
      'post_10m',
      5,
      600,
      () =>
        `insert into public.community_posts(author_id,body) values(${quote(actor)},'Concurrent ten-minute post')`,
    ],
    [
      'post_24h',
      20,
      86400,
      () =>
        `insert into public.community_posts(author_id,body) values(${quote(actor)},'Concurrent daily post')`,
    ],
    [
      'comment_10m',
      20,
      600,
      () =>
        `insert into public.community_comments(post_id,author_id,body) values(${quote(post)},${quote(actor)},'Concurrent comment')`,
    ],
    [
      'comment_24h',
      100,
      86400,
      () =>
        `insert into public.community_comments(post_id,author_id,body) values(${quote(post)},${quote(actor)},'Concurrent daily comment')`,
    ],
    [
      'report_1h',
      5,
      3600,
      (i) =>
        `insert into public.community_post_reports(post_id,comment_id,reporter_id,reason) values(${quote(post)},${quote(comments[i])},${quote(actor)},'spam_or_scam')`,
    ],
    [
      'membership_24h',
      20,
      86400,
      (i) =>
        `insert into public.community_memberships(space_id,user_id) values(${quote(spaces[i])},${quote(actor)})`,
    ],
    [
      'block_24h',
      20,
      86400,
      (i) =>
        `insert into public.community_user_blocks(blocker_id,blocked_id) values(${quote(actor)},${quote(peers[i])})`,
    ],
  ];
  for (const [action, limit, seconds, statement] of cases) {
    // Leave two slots, then race twelve independent PostgreSQL connections.
    await sql(`delete from public.community_rate_limit_buckets where user_id=${quote(actor)};
      insert into public.community_rate_limit_buckets(user_id,action,window_started_at,request_count)
      values(${quote(actor)},${quote(action)},to_timestamp(floor(extract(epoch from now())/${seconds})*${seconds}),${limit - 2});`);
    const results = await Promise.all(
      Array.from({ length: 12 }, (_, i) => sql(asActor(statement(i)), true)),
    );
    assert.equal(
      results.filter((result) => result.code === 0).length,
      2,
      `${action}: exactly two remaining requests must commit`,
    );
    for (const result of results.filter((result) => result.code !== 0))
      assert.match(
        result.stderr,
        /Community action limit reached/,
        `${action}: failures must be rate limits`,
      );
    const count = await sql(
      `select request_count from public.community_rate_limit_buckets where user_id=${quote(actor)} and action=${quote(action)};`,
    );
    assert.equal(
      Number(count.stdout),
      limit,
      `${action}: rejected requests must not corrupt committed count`,
    );
    console.log(`PASS ${action}: 12 concurrent requests, 2 committed, 10 rejected, count ${limit}`);
  }

  const promotions = await Promise.all(
    Array.from({ length: 12 }, (_, i) =>
      sql(
        asActor(
          `insert into public.community_posts(author_id,provider_id,post_type,body,image_url) values(${quote(actor)},${quote(provider)},'promotion',${quote('Concurrent paid promotion ' + i)},'https://example.test/poster.jpg')`,
        ),
        true,
      ),
    ),
  );
  assert.equal(promotions.filter((result) => result.code === 0).length, 3);
  for (const result of promotions.filter((result) => result.code !== 0))
    assert.match(result.stderr, /Monthly allowance of 3 promotional posters/);
  assert.equal(
    (
      await sql(
        `select offer_posts_used from public.provider_entitlements where provider_id=${quote(provider)};`,
      )
    ).stdout,
    '3',
  );
  console.log(
    'PASS promotion entitlement: 12 concurrent inserts, exactly 3 monthly promotions committed',
  );
  await sql(`delete from public.community_rate_limit_buckets where user_id=${quote(actor)};`);
  const queuedPayload = JSON.stringify({
    author_id: actor,
    body: 'Concurrent queued operation',
    post_type: 'discussion',
  });
  await Promise.all(
    Array.from({ length: 12 }, () =>
      sql(
        asActor(
          `select public.publish_queued_community_post('concurrent-queue-check',${quote(queuedPayload)}::jsonb)`,
        ),
      ),
    ),
  );
  assert.equal(
    (
      await sql(
        `select count(*) from public.community_posts where author_id=${quote(actor)} and body='Concurrent queued operation';`,
      )
    ).stdout,
    '1',
  );
  console.log('PASS concurrent queue retries: 12 acknowledgements, exactly one post');

  // Exercise the real queued-operation implementation with its storage and
  // transport dependencies supplied locally, including a real DB insertion.
  const source = await readFile(new URL('../src/data/syncRepository.js', import.meta.url), 'utf8');
  const policy = await import('../src/data/syncPolicy.js');
  const compile = new Function(
    'supabase',
    'loadPendingOperations',
    'removeLocalPost',
    'removePendingOperation',
    'updatePendingOperation',
    'recordError',
    'isReadyForSync',
    'prepareQueuedPayload',
    'remotePayload',
    source
      .replace(/import\s[\s\S]*?from\s+['"][^'"]+['"];?/g, '')
      .replace('export async function', 'async function') + '\nreturn flushPendingOperations;',
  );
  const queue = [
    {
      id: 'local-queue-check',
      operation: 'community_post',
      payload: {
        remote: {
          author_id: actor,
          body: 'Offline queued community post',
          post_type: 'discussion',
          region_key: 'kerala',
          location_city: 'London',
        },
        localId: 'post-local-check',
      },
    },
  ];
  const removed = [],
    updated = [],
    localRemoved = [];
  let unavailable = true,
    loseAcknowledgement = true;
  const client = {
    async rpc(name, { operation_id, payload }) {
      assert.equal(name, 'publish_queued_community_post');
      if (unavailable) return { error: { status: 503, message: 'Simulated offline transport' } };
      assert.equal(payload.localId, undefined);
      assert.equal(payload._sync, undefined);
      await sql(
        asActor(
          `select public.publish_queued_community_post(${quote(operation_id)},${quote(JSON.stringify(payload))}::jsonb)`,
        ),
      );
      if (loseAcknowledgement) {
        loseAcknowledgement = false;
        return { error: { status: 503, message: 'Response lost after server commit' } };
      }
      return { error: null };
    },
  };
  await sql(`delete from public.community_rate_limit_buckets where user_id=${quote(actor)};`);
  const flush = compile(
    client,
    async () => queue,
    async (id) => localRemoved.push(id),
    async (id) => removed.push(id),
    async (id, payload) => {
      updated.push(id);
      queue[0].payload = payload;
    },
    async () => {},
    policy.isReadyForSync,
    policy.prepareQueuedPayload,
    policy.remotePayload,
  );
  const now = Date.now();
  assert.deepEqual(await flush(now), { synced: 0, pending: 1, failed: 0 });
  assert.equal(removed.length, 0);
  assert.equal(updated.length, 1);
  unavailable = false;
  assert.deepEqual(await flush(now + 2000), { synced: 0, pending: 1, failed: 0 });
  assert.deepEqual(await flush(now + 5000), { synced: 1, pending: 0, failed: 0 });
  assert.deepEqual(removed, ['local-queue-check']);
  assert.deepEqual(localRemoved, ['post-local-check']);
  assert.equal(
    (
      await sql(
        `select count(*) from public.community_posts p join public.community_spaces s on s.id=p.community_id where p.author_id=${quote(actor)} and p.body='Offline queued community post' and s.slug='general' and p.region_key='kerala' and p.location_city='London';`,
      )
    ).stdout,
    '1',
  );
  console.log(
    'PASS real offline queue: transport failure and lost committed response recovered without duplicate posts; queue/cache entries removed',
  );
} finally {
  await sql(
    `delete from public.providers where id=${quote(provider)}; delete from auth.users where id in (${allUsers.map(quote).join(',')}); delete from public.community_spaces where id in (${spaces.map(quote).join(',')});`,
  );
  console.log('Local verification fixtures cleaned up');
}
