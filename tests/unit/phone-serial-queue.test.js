import assert from 'node:assert/strict';
import test from 'node:test';
import { toWhatsAppNumber } from '../../src/lib/phone.js';
import { createSerialQueue } from '../../src/lib/serialQueue.js';
import { withTimeout } from '../../src/lib/withTimeout.js';

test('WhatsApp numbers are normalized to international digits', () => {
  assert.equal(toWhatsAppNumber('07917322353'), '447917322353');
  assert.equal(toWhatsAppNumber('+44 7917 322353'), '447917322353');
  assert.equal(toWhatsAppNumber('0044 7917 322353'), '447917322353');
  assert.equal(toWhatsAppNumber('abc'), null);
});

test('serial queue waits for each task to finish before starting the next', async () => {
  const queue = createSerialQueue();
  const events = [];
  let finishFirst;
  const first = queue.runExclusive(
    () =>
      new Promise((resolve) => {
        events.push('first:start');
        finishFirst = () => {
          events.push('first:end');
          resolve();
        };
      }),
  );
  const second = queue.runExclusive(async () => events.push('second:start'));
  await Promise.resolve();
  assert.deepEqual(events, ['first:start']);
  finishFirst();
  await Promise.all([first, second]);
  assert.deepEqual(events, ['first:start', 'first:end', 'second:start']);
});

test('notification sync deadline rejects a stalled operation with a reportable code', async () => {
  await assert.rejects(
    withTimeout(
      () => new Promise(() => {}),
      5,
      'Notification settings sync timed out.',
      'PUSH_TIMEOUT',
    ),
    (error) => error.code === 'PUSH_TIMEOUT',
  );
});
