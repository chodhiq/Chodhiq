import assert from 'node:assert/strict';
import test from 'node:test';

import {
  cleanEmail,
  cleanPassword,
  cleanText,
  requireUuid,
  validateProfile,
  validateQuote,
  validateReport,
} from '../../src/lib/validation.js';

const UUID = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';

test('cleanText normalizes whitespace and strips control characters', () => {
  assert.equal(cleanText('  ChodhiQ\u0007   Community  '), 'ChodhiQ Community');
});

test('cleanText preserves normalized newlines when multiline is enabled', () => {
  assert.equal(cleanText('First\r\nSecond\rThird', { multiline: true }), 'First\nSecond\nThird');
});

test('cleanText enforces minimum and maximum lengths', () => {
  assert.throws(() => cleanText('a', { field: 'Title', min: 2 }), /at least 2/);
  assert.throws(() => cleanText('abcd', { field: 'Title', max: 3 }), /3 characters or fewer/);
});

test('cleanEmail normalizes valid addresses and rejects malformed ones', () => {
  assert.equal(cleanEmail('  Member@ChodhiQ.App '), 'member@chodhiq.app');
  assert.throws(() => cleanEmail('member-at-chodhiq'), /valid email/);
});

test('cleanPassword preserves password bytes and enforces safe bounds', () => {
  assert.equal(cleanPassword('long enough password'), 'long enough password');
  assert.throws(() => cleanPassword('short'), /between 10 and 128/);
});

test('requireUuid accepts supported UUIDs and rejects arbitrary identifiers', () => {
  assert.equal(requireUuid(UUID), UUID);
  assert.throws(() => requireUuid('provider-1', 'Provider'), /Provider is invalid/);
});

test('validateProfile sanitizes every editable profile field', () => {
  assert.deepEqual(
    validateProfile({
      name: '  Anjali   Menon ',
      email: 'ANJALI@EXAMPLE.COM',
      phone: '  +44 7000 000000 ',
      location: ' Birmingham ',
    }),
    {
      name: 'Anjali Menon',
      email: 'anjali@example.com',
      phone: '+44 7000 000000',
      location: 'Birmingham',
    },
  );
});

test('validateQuote applies a safe contact default and sanitizes content', () => {
  const result = validateQuote({
    providerId: UUID,
    providerName: ' Provider ',
    message: ' Hello ',
    preferredContact: 'fax',
  });
  assert.equal(result.preferredContact, 'whatsapp');
  assert.equal(result.message, 'Hello');
});

test('validateReport allows known reasons and rejects unknown reasons', () => {
  assert.equal(validateReport('fraud', 'Suspicious listing').reason, 'fraud');
  assert.throws(() => validateReport('spam', 'Details'), /reason is invalid/);
});
