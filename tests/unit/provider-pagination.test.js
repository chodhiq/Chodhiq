import assert from 'node:assert/strict';
import test from 'node:test';
import { providerPageRange } from '../../src/lib/providerPagination.js';

test('provider pagination produces inclusive, contiguous ranges', () => {
  assert.deepEqual(providerPageRange(0), [0, 99]);
  assert.deepEqual(providerPageRange(1), [100, 199]);
  assert.deepEqual(providerPageRange(3, 25), [75, 99]);
});

test('provider pagination rejects invalid page inputs', () => {
  assert.throws(() => providerPageRange(-1), RangeError);
  assert.throws(() => providerPageRange(0, 0), RangeError);
});
