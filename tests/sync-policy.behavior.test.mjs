import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifySyncError,
  isReadyForSync,
  nextRetryAt,
  prepareQueuedPayload,
  remotePayload,
} from '../src/data/syncPolicy.js';

test('sync errors distinguish retryable outages from permanent conflicts', () => {
  assert.equal(classifySyncError({ status: 503 }), 'retryable');
  assert.equal(classifySyncError({ status: 429 }), 'retryable');
  assert.equal(classifySyncError({ code: 'P0001', status: 400 }), 'permanent');
  assert.equal(classifySyncError({ code: '23505' }), 'permanent');
  assert.equal(classifySyncError({ status: 403 }), 'permanent');
});

test('retry scheduling backs off and failed work no longer blocks the queue', () => {
  const now = Date.parse('2026-08-17T00:00:00.000Z');
  assert.equal(nextRetryAt(3, now), '2026-08-17T00:00:04.000Z');
  const queued = prepareQueuedPayload({ value: 1 }, 2, { status: 503, message: 'offline' }, now);
  assert.equal(queued._sync.status, 'pending');
  assert.equal(isReadyForSync({ payload: queued }, now), false);
  assert.equal(isReadyForSync({ payload: queued }, now + 3000), true);
  const failed = prepareQueuedPayload({ value: 1 }, 1, { status: 409, message: 'conflict' }, now);
  assert.equal(failed._sync.status, 'failed');
});

test('sync metadata is never sent to the backend', () => {
  assert.deepEqual(remotePayload({ value: 1, _sync: { attempts: 2 } }), { value: 1 });
  assert.deepEqual(remotePayload({ remote: { value: 2 }, _sync: { attempts: 1 } }), { value: 2 });
});
