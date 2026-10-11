import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeUkPhone } from '../lib/uk-phone.ts';

test('UK phone numbers save in +44 format', () => {
  assert.equal(normalizeUkPhone('07917 322353'), '+447917322353');
  assert.equal(normalizeUkPhone('+44 7917 322353'), '+447917322353');
  assert.equal(normalizeUkPhone('0044 7917 322353'), '+447917322353');
  assert.equal(normalizeUkPhone(''), null);
  assert.equal(normalizeUkPhone('not a number'), null);
});
