import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../src/data/bookingValidation.js', import.meta.url), 'utf8');
const { validateBookingDateTime } = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
);

test('accepts a future local date and time in canonical form', () => {
  const now = new Date('2026-10-08T09:00:00.000Z');
  assert.deepEqual(validateBookingDateTime('2026-10-09', '09:00', now), {
    date: '2026-10-09',
    time: '09:00',
  });
});

test('rejects malformed and impossible dates', () => {
  const now = new Date('2026-10-08T09:00:00.000Z');
  assert.throws(() => validateBookingDateTime('2026-10-9', '09:00', now), /calendar/);
  assert.throws(() => validateBookingDateTime('2026-02-30', '09:00', now), /valid booking date/);
});

test('rejects malformed, past, and current-in-the-past times', () => {
  const now = new Date('2026-10-08T09:00:00.000Z');
  assert.throws(() => validateBookingDateTime('2026-10-09', '9:00', now), /valid booking time/);
  assert.throws(() => validateBookingDateTime('2026-10-08', '09:59', now), /future/);
  assert.throws(() => validateBookingDateTime('2026-10-08', '10:00', now), /future/);
});
