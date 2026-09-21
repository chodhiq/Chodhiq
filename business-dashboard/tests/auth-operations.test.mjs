import assert from 'node:assert/strict';
import test from 'node:test';
import { signInErrorMessage, withAuthTimeout } from '../lib/auth-operations.ts';

test('owner sign-in errors are safe and actionable', () => {
  assert.match(signInErrorMessage({ code: 'invalid_credentials' }), /incorrect/);
  assert.match(signInErrorMessage({ code: 'email_not_confirmed' }), /Confirm/);
  assert.doesNotMatch(signInErrorMessage(new Error('backend details')), /backend details/);
});

test('owner auth operations time out instead of leaving the form busy', async () => {
  await assert.rejects(
    withAuthTimeout(new Promise(() => {}), 5),
    (error) => error instanceof Error && error.message === 'auth_timeout',
  );
});
