import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  getUkFutureDate,
  requiresLateNightBookingConfirmation,
  validateBookingDateTime,
} from '../src/data/bookingValidation.js';

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

test('validates requested times against weekday opening hours, including overnight hours', () => {
  const now = new Date('2026-10-08T09:00:00.000Z');
  const fridayHours = [{ day_of_week: 5, open_time: '10:00:00', close_time: '17:00:00' }];
  assert.deepEqual(validateBookingDateTime('2026-10-09', '10:00', now, fridayHours), {
    date: '2026-10-09',
    time: '10:00',
  });
  assert.throws(
    () => validateBookingDateTime('2026-10-09', '09:00', now, fridayHours),
    /opening hours/,
  );
  assert.throws(
    () => validateBookingDateTime('2026-10-10', '12:00', now, fridayHours),
    /opening hours/,
  );

  const saturdayOvernight = [{ day_of_week: 6, open_time: '22:00:00', close_time: '02:00:00' }];
  assert.deepEqual(validateBookingDateTime('2026-10-11', '01:00', now, saturdayOvernight), {
    date: '2026-10-11',
    time: '01:00',
  });
});

test('warns on late hours only when the provider has no opening hours', () => {
  assert.equal(requiresLateNightBookingConfirmation('03:00', []), true);
  assert.equal(requiresLateNightBookingConfirmation('22:00', undefined), true);
  assert.equal(requiresLateNightBookingConfirmation('07:00', []), false);
  assert.equal(
    requiresLateNightBookingConfirmation('03:00', [
      { day_of_week: 5, open_time: '00:00:00', close_time: '06:00:00' },
    ]),
    false,
  );
});

test('suggested dates use the UK calendar even when UTC is on the previous date', () => {
  const now = new Date('2026-10-08T23:30:00.000Z');
  assert.equal(getUkFutureDate(1, now), '2026-10-10');
});

test('push and Activity notification bodies share the actor-aware database message', async () => {
  const migration = await readFile(
    new URL(
      '../supabase/migrations/20261106110000_attribute_booking_cancellation_notifications.sql',
      import.meta.url,
    ),
    'utf8',
  );
  const pushFunction = await readFile(
    new URL('../supabase/functions/push-notification/index.ts', import.meta.url),
    'utf8',
  );
  const accountMapper = await readFile(
    new URL('../src/data/accountMappers.js', import.meta.url),
    'utf8',
  );
  assert.match(migration, /auth\.uid\(\)\s*=\s*new\.user_id/);
  assert.match(migration, /You cancelled your booking with /);
  assert.match(migration, /cancelled your booking\./);
  assert.match(pushFunction, /body:\s*notification\.body/);
  assert.match(accountMapper, /body:\s*row\.body/);
});
