import assert from 'node:assert/strict';
import test from 'node:test';

import { readBooleanFlag } from '../../src/config/runtime.js';

test('demo-style flags default to disabled', () => {
  assert.equal(readBooleanFlag(undefined), false);
  assert.equal(readBooleanFlag(''), false);
  assert.equal(readBooleanFlag('false'), false);
});

test('boolean flags accept only explicit true values', () => {
  for (const value of ['1', 'true', 'TRUE', ' yes ', 'on']) {
    assert.equal(readBooleanFlag(value), true, value);
  }
  for (const value of ['0', 'no', 'disabled', 'truthy']) {
    assert.equal(readBooleanFlag(value), false, value);
  }
});
