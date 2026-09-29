import assert from 'node:assert/strict';
import test from 'node:test';

import { isReadyForSync, prepareQueuedPayload, remotePayload } from '../../src/data/syncPolicy.js';

test('queued operations keep remote data separate from local sync metadata', () => {
  const payload = prepareQueuedPayload(
    { remote: { message: 'hello' }, localId: 'local-one' },
    1,
    { status: 503, message: 'offline' },
    Date.parse('2026-08-19T00:00:00Z'),
  );
  assert.deepEqual(remotePayload(payload), { message: 'hello' });
  assert.equal(payload._sync.attempts, 1);
  assert.equal(payload._sync.status, 'pending');
});

test('failed operations use exponential backoff and eventually stop retrying', () => {
  const now = Date.parse('2026-08-19T00:00:00Z');
  let payload = prepareQueuedPayload({ message: 'hello' }, 1, { status: 503 }, now);
  let operation = { payload };
  assert.equal(payload._sync.nextAttemptAt, '2026-08-19T00:00:01.000Z');
  assert.equal(isReadyForSync(operation, now), false);
  payload = prepareQueuedPayload(payload, 5, { status: 503 }, now);
  operation = { payload };
  assert.equal(payload._sync.status, 'failed');
  assert.equal(payload._sync.attempts, 5);
  assert.equal(isReadyForSync(operation, now + 999999), false);
});
