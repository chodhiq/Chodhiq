import assert from 'node:assert/strict';
import test from 'node:test';
import { checkRateLimit } from '../supabase/functions/rate-limit-helper.ts';

test('persistent limiter reports the database-backed remaining quota', async () => {
  const calls = [];
  const client = {
    async rpc(name, args) {
      calls.push({ name, args });
      return { data: [{ request_count: 3 }], error: null };
    },
  };
  const result = await checkRateLimit(client, 'user-1', 'mutation', {
    maxRequests: 5,
    windowSeconds: 60,
  });
  assert.equal(result.allowed, true);
  assert.equal(result.remaining, 2);
  assert.equal(calls[0].name, 'consume_edge_rate_limit');
  assert.deepEqual(calls[0].args, {
    rate_scope: 'mutation',
    rate_identifier: 'user-1',
    maximum_requests: 5,
    window_seconds: 60,
  });
});

test('persistent limiter blocks counters above quota', async () => {
  const client = {
    async rpc() {
      return { data: [{ request_count: 6 }], error: null };
    },
  };
  const result = await checkRateLimit(client, 'user-1', 'mutation', {
    maxRequests: 5,
    windowSeconds: 60,
  });
  assert.equal(result.allowed, false);
  assert.equal(result.remaining, 0);
  assert.ok(result.headers['Retry-After']);
});

test('persistent limiter fails closed when storage is unavailable', async () => {
  const client = {
    async rpc() {
      return { data: null, error: { message: 'database offline' } };
    },
  };
  const result = await checkRateLimit(client, 'user-1', 'mutation');
  assert.equal(result.allowed, false);
  assert.equal(result.error, 'database offline');
});
