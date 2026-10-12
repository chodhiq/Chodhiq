import assert from 'node:assert/strict';
import test from 'node:test';
import { authErrorMessage, withAuthTimeout } from '../src/lib/authOperations.js';
import { runSingleFlight } from '../src/lib/singleFlight.js';

test('customer authentication returns completed work', async () => {
  assert.equal(await withAuthTimeout(Promise.resolve('complete'), 50), 'complete');
});

test('customer authentication times out instead of leaving the form busy', async () => {
  await assert.rejects(
    withAuthTimeout(new Promise(() => {}), 5),
    /timed out.*connection.*try again/i,
  );
});

test('authentication timeout message differs from an immediate network failure', () => {
  const timeout = Object.assign(new Error('The request timed out.'), { code: 'AUTH_TIMEOUT' });
  assert.equal(
    authErrorMessage(timeout),
    'This is taking longer than expected. Check your connection and try again.',
  );
  assert.equal(
    authErrorMessage(new Error('Network request failed')),
    'Check your internet connection and try again.',
  );
});

test('sign-in submission cannot be triggered again while a request is in flight', async () => {
  const lock = { current: false };
  let calls = 0;
  let finishRequest;
  const submit = () =>
    runSingleFlight(
      lock,
      () =>
        new Promise((resolve) => {
          calls += 1;
          finishRequest = resolve;
        }),
    );

  const first = submit();
  const second = submit();
  await Promise.resolve();
  assert.equal(calls, 1);
  assert.equal(await second, undefined);
  finishRequest('signed-in');
  assert.equal(await first, 'signed-in');
  assert.equal(lock.current, false);
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
  assert.match(
    authErrorMessage(new Error('DEVELOPER_ERROR')),
    /Android package and signing certificate.*Google Cloud OAuth client/,
  );
});
