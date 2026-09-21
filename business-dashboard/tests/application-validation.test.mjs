import assert from 'node:assert/strict';
import test from 'node:test';
import { applicationErrors, proofError } from '../lib/application-validation.ts';

const valid = { business_name: 'London Services', city: 'London', postcode: 'SW1A 1AA', phone: '+44 20 7946 0958', category_id: 'category' };
test('UK application accepts domestic and international phone formats', () => {
  assert.ok(Object.values(applicationErrors(valid)).every(value => !value));
  assert.equal(applicationErrors({ ...valid, phone: '020 7946 0958', postcode: 'sw1a1aa' }).phone, '');
});
test('application rejects incomplete details, overseas numbers and invalid postcodes', () => {
  for (const [field, value] of [['business_name', ' '], ['city', 'a'], ['postcode', '90210'], ['phone', '+1 212 555 0100'], ['category_id', '']]) {
    assert.ok(applicationErrors({ ...valid, [field]: value })[field], field);
  }
});
test('proof requires a supported non-empty file within the upload limit', () => {
  assert.ok(proofError(null));
  assert.ok(proofError({ size: 100, type: 'image/svg+xml' }));
  assert.ok(proofError({ size: 0, type: 'application/pdf' }));
  assert.ok(proofError({ size: 10485761, type: 'application/pdf' }));
  assert.equal(proofError({ size: 10485760, type: 'application/pdf' }), '');
});
