import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(
  new URL('../../src/lib/googleSignIn.native.js', import.meta.url),
  'utf8',
)
  .replace(/^import .*;\r?\n/gm, '')
  .replaceAll('export async function', 'async function');

function loadGoogleSignIn(googleSignin) {
  return new Function(
    'GoogleSignin',
    'process',
    `${source}; return { getNativeGoogleIdToken, signOutNativeGoogleAccount };`,
  )(googleSignin, { env: {} });
}

test('Google account selection is cleared before each Android sign-in', async () => {
  const calls = [];
  const google = loadGoogleSignIn({
    configure: () => calls.push('configure'),
    hasPlayServices: async () => calls.push('play-services'),
    signOut: async () => calls.push('sign-out'),
    signIn: async () => {
      calls.push('sign-in');
      return { type: 'success', data: { idToken: 'test-token' } };
    },
  });

  assert.equal(await google.getNativeGoogleIdToken(), 'test-token');
  assert.equal(await google.getNativeGoogleIdToken(), 'test-token');
  assert.deepEqual(calls, [
    'configure',
    'play-services',
    'sign-out',
    'sign-in',
    'play-services',
    'sign-out',
    'sign-in',
  ]);
});

test('clearing Google state does not revoke the user grant', async () => {
  let signedOut = false;
  let revoked = false;
  const google = loadGoogleSignIn({
    signOut: async () => {
      signedOut = true;
    },
    revokeAccess: async () => {
      revoked = true;
    },
  });

  await google.signOutNativeGoogleAccount();
  assert.equal(signedOut, true);
  assert.equal(revoked, false);
});

test('a cancelled Google selection does not return an identity token', async () => {
  const google = loadGoogleSignIn({
    configure() {},
    hasPlayServices: async () => {},
    signOut: async () => {},
    signIn: async () => ({ type: 'cancelled' }),
  });

  await assert.rejects(google.getNativeGoogleIdToken(), /Google sign-in was cancelled/);
});
