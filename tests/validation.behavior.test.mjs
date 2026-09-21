import assert from 'node:assert/strict';
import test from 'node:test';

const validation = await import('../src/lib/validation.js');
const categoryMatching = await import('../src/data/categoryMatching.js');

test('text normalization removes controls and normalizes whitespace', () => {
  assert.equal(validation.cleanText('  hello\u0000   world  '), 'hello world');
  assert.equal(validation.cleanText('one\r\ntwo', { multiline: true }), 'one\ntwo');
});

test('email and password validation enforce account boundaries', () => {
  assert.equal(validation.cleanEmail(' PERSON@Example.COM '), 'person@example.com');
  assert.throws(() => validation.cleanEmail('not-an-email'), /valid email/);
  assert.throws(() => validation.cleanPassword('short'), /between 10 and 128/);
  assert.equal(validation.cleanPassword('long-enough-password'), 'long-enough-password');
});

test('external websites are restricted to credential-free HTTPS URLs', () => {
  assert.equal(validation.validateHttpsUrl('https://example.com/path'), 'https://example.com/path');
  assert.throws(() => validation.validateHttpsUrl('http://example.com'), /valid HTTPS URL/);
  assert.throws(() => validation.validateHttpsUrl('javascript:alert(1)'), /valid HTTPS URL/);
  assert.throws(
    () => validation.validateHttpsUrl('https://user:pass@example.com'),
    /valid HTTPS URL/,
  );
});

test('quote validation rejects invalid providers and limits content', () => {
  const providerId = '123e4567-e89b-42d3-a456-426614174000';
  assert.equal(
    validation.validateQuote({ providerId, message: ' Quote please ', preferredContact: 'email' })
      .message,
    'Quote please',
  );
  assert.equal(
    validation.validateQuote({ providerId, message: 'Hello', preferredContact: 'fax' })
      .preferredContact,
    'whatsapp',
  );
  assert.throws(
    () => validation.validateQuote({ providerId: 'bad', message: 'Hello' }),
    /Provider is invalid/,
  );
  assert.throws(
    () => validation.validateQuote({ providerId, message: 'x'.repeat(2001) }),
    /2,000|2000/,
  );
});

test('reports only accept known reasons and meaningful details', () => {
  assert.deepEqual(validation.validateReport('fraud', 'Suspicious listing'), {
    reason: 'fraud',
    details: 'Suspicious listing',
  });
  assert.throws(() => validation.validateReport('spam', 'Details'), /reason is invalid/);
  assert.throws(() => validation.validateReport('other', 'no'), /at least 3/);
});

test('explore search matches recent phrases, plurals, services, and category synonyms', () => {
  const provider = {
    name: 'Asha Design Studio',
    category: 'Home Services',
    categoryId: 'home-services',
    baseCity: 'Birmingham',
    serviceAreas: ['Solihull'],
    services: [{ name: 'Interior design consultation', description: 'Room planning' }],
  };
  assert.equal(
    categoryMatching.matchesProviderSearch(provider, 'Interior Designers Birmingham'),
    true,
  );
  assert.equal(categoryMatching.matchesProviderSearch(provider, 'Interior Designer'), true);
  assert.equal(categoryMatching.matchesProviderSearch(provider, 'Mechanic Bradford'), false);
  assert.equal(
    categoryMatching.providerMatchesCategory(provider, {
      id: 'home-services',
      name: 'Home Services',
    }),
    true,
  );
});
