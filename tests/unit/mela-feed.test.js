import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isNewMember,
  offerProgress,
  phoneParts,
  postVariant,
  spaceAccent,
} from '../../src/components/community/melaFeedUtils.js';

test('Mela variants preserve current post types and use promotion for offers', () => {
  for (const post_type of ['discussion', 'experience', 'recommendation', 'complaint', 'unknown']) {
    assert.equal(postVariant({ post_type }), 'discussion');
  }
  assert.equal(postVariant({ post_type: 'promotion' }), 'provider_offer');
  assert.equal(postVariant({ post_type: 'marketplace' }), 'marketplace');
});

test('UK phone masking recognizes local and international formats without losing body text', () => {
  for (const phone of [
    '07700 900123',
    '020 7946 0958',
    '0161 496 0123',
    '+44 7700 900123',
    '+44 (0)7700 900123',
    '0044 20 7946 0958',
  ]) {
    const body = `Call ${phone}, thanks.`;
    const parts = phoneParts(body);
    assert.equal(parts.map((part) => part.text).join(''), body);
    assert.deepEqual(
      parts.filter((part) => part.phone).map((part) => part.text),
      [phone],
    );
  }
  assert.equal(
    phoneParts('Call 07700 900123 or 020 7946 0958').filter((part) => part.phone).length,
    2,
  );
});

test('phone masking leaves short numbers, embedded identifiers and longer digit sequences visible', () => {
  for (const body of [
    'Order 12345',
    '£20.00',
    'ref07700900123',
    '077009001234',
    '20261002130000',
  ]) {
    assert.equal(
      phoneParts(body).some((part) => part.phone),
      false,
    );
    assert.equal(
      phoneParts(body)
        .map((part) => part.text)
        .join(''),
      body,
    );
  }
});

test('offer countdown advances with elapsed time, becomes urgent in final hour and clamps expired offers', () => {
  const start = '2026-10-02T10:00:00Z';
  const end = '2026-10-02T12:00:00Z';
  assert.equal(offerProgress(start, end, Date.parse(start)).progress, 0);
  const finalHour = offerProgress(start, end, Date.parse('2026-10-02T11:30:00Z'));
  assert.equal(finalHour.progress, 0.75);
  assert.equal(finalHour.urgency, 0.5);
  assert.equal(finalHour.label, '30m');
  const expired = offerProgress(start, end, Date.parse('2026-10-02T13:00:00Z'));
  assert.equal(expired.progress, 1);
  assert.equal(expired.label, 'Expired');
  assert.equal(offerProgress(start, 'invalid'), null);
});

test('new-member badge requires a known timestamp within the 14-day window', () => {
  const now = Date.parse('2026-10-02T12:00:00Z');
  assert.equal(isNewMember('2026-10-01T12:00:00Z', now), true);
  assert.equal(isNewMember('2026-09-18T12:00:00Z', now), false);
  assert.equal(isNewMember('2026-10-03T12:00:00Z', now), false);
  assert.equal(isNewMember(undefined, now), false);
});

test('space colors stay stable across renders with General pinned to teal', () => {
  assert.equal(spaceAccent('general'), '#0E6B5C');
  assert.equal(spaceAccent('local-food'), spaceAccent('local-food'));
  assert.ok(['#0E6B5C', '#F4A125', '#C5392B'].includes(spaceAccent('local-food')));
});
