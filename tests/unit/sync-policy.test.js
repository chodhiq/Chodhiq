import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isReadyForSync,
  nextFailureState,
  normalizePendingOperation,
  operationSignature,
  stableStringify,
} from '../../src/data/syncPolicy.js';

test('stableStringify and operation signatures ignore object key order', () => {
  assert.equal(stableStringify({ b: 2, a: 1 }), stableStringify({ a: 1, b: 2 }));
  assert.equal(
    operationSignature('quote', { b: 2, a: 1 }),
    operationSignature('quote', { a: 1, b: 2 }),
  );
});

test('legacy pending operations are normalized without losing payload data', () => {
  const item = normalizePendingOperation({
    id: 'one',
    operation: 'quote',
    payload: { message: 'hello' },
  });
  assert.deepEqual(item.data, { message: 'hello' });
  assert.equal(item.sync.attempts, 0);
  assert.equal(item.sync.deadLetter, false);
});

test('failed operations use exponential backoff and eventually dead-letter', () => {
  let operation = normalizePendingOperation({ payload: { message: 'hello' } });
  const now = Date.parse('2026-08-19T00:00:00Z');
  operation = { ...operation, sync: nextFailureState(operation, 'offline', now) };
  assert.equal(operation.sync.attempts, 1);
  assert.equal(operation.sync.nextAttemptAt, '2026-08-19T00:00:05.000Z');
  assert.equal(isReadyForSync(operation, now), false);
  for (let index = 1; index < 5; index += 1)
    operation = { ...operation, sync: nextFailureState(operation, 'offline', now) };
  assert.equal(operation.sync.deadLetter, true);
  assert.equal(operation.sync.attempts, 5);
  assert.equal(isReadyForSync(operation, now + 999999), false);
});
