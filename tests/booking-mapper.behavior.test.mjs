import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../src/data/bookingMapper.js', import.meta.url), 'utf8');
const { mapBooking } = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
);
const base = {
  id: 'booking-1',
  user_id: 'user-1',
  provider_id: 'provider-1',
  service_id: 'service-1',
  requested_date: '2026-09-01',
  requested_time: '10:30:00',
  status: 'confirmed',
  notes: null,
  provider_message: null,
  created_at: '2026-08-17T10:00:00Z',
};

test('booking mapper accepts object-shaped Supabase relations', () => {
  const result = mapBooking({
    ...base,
    providers: { business_name: 'ChodhiQ Foods' },
    services: { name: 'Consultation' },
  });
  assert.equal(result.providerName, 'ChodhiQ Foods');
  assert.equal(result.userId, 'user-1');
  assert.equal(result.serviceName, 'Consultation');
  assert.equal(result.requestedTime, '10:30');
});

test('booking mapper accepts array-shaped Supabase relations', () => {
  const result = mapBooking({
    ...base,
    providers: [{ business_name: 'Array Business' }],
    services: [{ name: 'Array Service' }],
  });
  assert.equal(result.providerName, 'Array Business');
  assert.equal(result.serviceName, 'Array Service');
});

test('booking mapper supplies stable fallbacks for missing relations', () => {
  const result = mapBooking({ ...base, providers: null, services: [] });
  assert.equal(result.providerName, 'Provider');
  assert.equal(result.serviceName, 'General appointment');
  assert.equal(result.notes, '');
});
