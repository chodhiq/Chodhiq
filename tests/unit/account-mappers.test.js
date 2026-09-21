import assert from 'node:assert/strict';
import test from 'node:test';

import { mapNotification, mapProfile, mapQuote } from '../../src/data/accountMappers.js';

test('mapQuote joins provider identity across string-compatible IDs', () => {
  const result = mapQuote({ id: 'q1', provider_id: 42, message: 'Hello', status: 'responded' }, [
    { id: '42', name: 'Malabar Foods' },
  ]);
  assert.equal(result.providerName, 'Malabar Foods');
  assert.equal(result.status, 'Responded');
  assert.equal(result.responseMessage, '');
});

test('mapNotification derives read state without leaking database fields', () => {
  assert.deepEqual(
    Object.keys(
      mapNotification({ id: 'n1', title: 'Update', body: 'Ready', read_at: null }),
    ).sort(),
    ['body', 'id', 'read', 'time', 'title'],
  );
  assert.equal(mapNotification({ id: 'n1', read_at: null }).read, false);
  assert.equal(mapNotification({ id: 'n2', read_at: '2026-08-19T00:00:00Z' }).read, true);
});

test('mapProfile applies trusted fallbacks and local avatar precedence', () => {
  const result = mapProfile(
    { full_name: '', city: '', avatar_url: 'remote.png', created_at: '2025-01-01' },
    {
      email: 'member@example.com',
      created_at: '2024-01-01',
      user_metadata: { full_name: 'Anjali' },
    },
    'local.png',
  );
  assert.equal(result.name, 'Anjali');
  assert.equal(result.location, 'Birmingham');
  assert.equal(result.avatarUri, 'local.png');
  assert.equal(result.memberSince, '2025');
});
