import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../../src/lib/supabase.js', import.meta.url), 'utf8');
const functionStart = source.indexOf('export async function signInWithOAuth(provider) {');
const functionEnd = source.indexOf('\nexport async function signOutGoogleAccount()', functionStart);
assert.notEqual(functionStart, -1, 'signInWithOAuth must exist in src/lib/supabase.js');
assert.notEqual(functionEnd, -1, 'signInWithOAuth must end before signOutGoogleAccount');

const functionSource = source
  .slice(functionStart, functionEnd)
  .replace('export async function', 'async function')
  .replace("await import('./googleSignIn')", 'await Promise.resolve(googleSignIn)');

function createOAuthHarness({ executionEnvironment, appOwnership }) {
  const calls = [];
  const session = { user: { id: 'test-user' } };
  const supabase = {
    auth: {
      signInWithIdToken: async (credentials) => {
        calls.push(['signInWithIdToken', credentials]);
        return { data: { session }, error: null };
      },
      signInWithOAuth: async (credentials) => {
        calls.push(['signInWithOAuth', credentials]);
        return { data: { url: 'https://auth.example.test/authorize' }, error: null };
      },
    },
  };
  const googleSignIn = {
    getNativeGoogleIdToken: async () => {
      calls.push(['getNativeGoogleIdToken']);
      return 'test-id-token';
    },
  };
  const WebBrowser = {
    openAuthSessionAsync: async (url, redirectTo) => {
      calls.push(['openAuthSessionAsync', url, redirectTo]);
      return { type: 'cancel' };
    },
  };
  const Linking = {
    addEventListener: () => ({ remove() {} }),
  };
  const makeRedirectUri = ({ path }) => `exp://192.168.1.2:8081/--/${path}`;
  const getAuthCallbackRedirectUrl = (platform, expoGo, makeRedirectUri) =>
    platform === 'web' || expoGo
      ? makeRedirectUri({ path: 'auth/callback' })
      : 'chodhiq://auth/callback';
  const withAuthTimeout = async (work) => work;
  const isSafeAppLink = () => true;
  const authCodeExchange = {};
  const invoke = new Function(
    'supabase',
    'Platform',
    'Constants',
    'isExpoGo',
    'googleSignIn',
    'withAuthTimeout',
    'getAuthCallbackRedirectUrl',
    'makeRedirectUri',
    'WebBrowser',
    'Linking',
    'isSafeAppLink',
    'authCodeExchange',
    `${functionSource}; return signInWithOAuth;`,
  )(
    supabase,
    { OS: 'android' },
    { executionEnvironment, appOwnership },
    executionEnvironment === 'storeClient' || appOwnership === 'expo',
    googleSignIn,
    withAuthTimeout,
    getAuthCallbackRedirectUrl,
    makeRedirectUri,
    WebBrowser,
    Linking,
    isSafeAppLink,
    authCodeExchange,
  );
  return { calls, invoke, session };
}

test('Expo Go uses browser OAuth and the Expo Go callback URL', async () => {
  const { calls, invoke } = createOAuthHarness({
    executionEnvironment: 'storeClient',
    appOwnership: 'expo',
  });

  await assert.rejects(invoke('google'), /Google sign-in was cancelled/);

  assert.equal(calls.filter(([name]) => name === 'signInWithOAuth').length, 1);
  assert.equal(calls.filter(([name]) => name === 'openAuthSessionAsync').length, 1);
  assert.equal(calls.filter(([name]) => name === 'getNativeGoogleIdToken').length, 0);
  assert.equal(calls.filter(([name]) => name === 'signInWithIdToken').length, 0);
  assert.equal(calls.find(([name]) => name === 'signInWithOAuth')[1].options.redirectTo,
    'exp://192.168.1.2:8081/--/auth/callback');
});

for (const [label, executionEnvironment, appOwnership] of [
  ['development build', 'storeClient', null],
  ['standalone', 'standalone', null],
  ['bare', 'bare', null],
]) {
  test(`${label} uses native Google sign-in and Supabase ID-token exchange`, async () => {
    const { calls, invoke, session } = createOAuthHarness({
      executionEnvironment,
      appOwnership,
    });

    assert.equal(await invoke('google'), session);

    assert.equal(calls.filter(([name]) => name === 'getNativeGoogleIdToken').length, 1);
    assert.equal(calls.filter(([name]) => name === 'signInWithIdToken').length, 1);
    assert.equal(calls.filter(([name]) => name === 'signInWithOAuth').length, 0);
    assert.equal(calls.filter(([name]) => name === 'openAuthSessionAsync').length, 0);
    assert.deepEqual(calls.find(([name]) => name === 'signInWithIdToken')[1], {
      provider: 'google',
      token: 'test-id-token',
    });
  });
}
