import assert from 'node:assert/strict';
import test from 'node:test';
import { authErrorMessage, withAuthTimeout } from '../src/lib/authOperations.js';

test('customer authentication returns completed work', async () => {
  assert.equal(await withAuthTimeout(Promise.resolve('complete'), 50), 'complete');
});

test('customer authentication times out instead of leaving the form busy', async () => {
  await assert.rejects(
    withAuthTimeout(new Promise(() => {}), 5),
    /timed out.*connection.*try again/i,
  );
});

test('customer authentication clears its timeout after completed work', async () => {
  const startedAt = Date.now();
  await withAuthTimeout(Promise.resolve('complete'), 500);
  assert.ok(Date.now() - startedAt < 100, 'completed authentication should return immediately');
});

test('authentication errors never expose Supabase response metadata', () => {
  const leaked = new Error(
    '{"status":500,"headers":{"set-cookie":"secret","sb-request-id":"abc"},"bodyBlob":{}}',
  );
  assert.equal(
    authErrorMessage(leaked),
    'Authentication is temporarily unavailable. Please try again.',
  );
  assert.doesNotMatch(authErrorMessage(leaked), /cookie|request-id|bodyblob/i);
});

test('authentication errors provide concise actionable messages', () => {
  assert.equal(
    authErrorMessage(new Error('Invalid login credentials')),
    'The email address or password is incorrect.',
  );
  assert.equal(
    authErrorMessage(new Error('Email not confirmed')),
    'Confirm your email address before signing in.',
  );
});
