import test from 'node:test';
import assert from 'node:assert/strict';
import { completeAuthCallback, createAuthCodeExchange } from '../../src/lib/authCallback.js';

test('a PKCE confirmation exchanges the code and returns the established session', async () => {
  const session = { user: { id: 'customer' } };
  let received;
  const auth = {
    exchangeCodeForSession: async (code) => {
      received = code;
      return { data: { session }, error: null };
    },
  };
  assert.equal(await completeAuthCallback(auth, { code: 'single-use-code' }), session);
  assert.equal(received, 'single-use-code');
});

test('a browser-confirmed email offers password sign-in without granting a session', async () => {
  const auth = {
    exchangeCodeForSession() {
      throw new Error('Must not exchange');
    },
  };
  assert.equal(await completeAuthCallback(auth, { confirmed: '1' }), null);
});

test('expired and incomplete callbacks never attempt an exchange', async () => {
  const auth = {
    exchangeCodeForSession() {
      throw new Error('Must not exchange');
    },
  };
  await assert.rejects(
    completeAuthCallback(auth, { error: 'access_denied', confirmed: '1' }),
    /expired.*new confirmation email/,
  );
  await assert.rejects(completeAuthCallback(auth, {}), /incomplete/);
});

test('a missing PKCE verifier on another device provides a password sign-in fallback', async () => {
  const auth = {
    exchangeCodeForSession: async () => ({ data: {}, error: { code: 'bad_code_verifier' } }),
  };
  await assert.rejects(
    completeAuthCallback(auth, { code: 'code' }),
    /sign in with your email and password/,
  );
});

test('OAuth and navigation exchange a duplicated single-use code once; sign-out clears the cache', async () => {
  let exchanges = 0;
  const session = { user: { id: 'customer' } };
  const exchange = createAuthCodeExchange({
    exchangeCodeForSession: async () => {
      exchanges += 1;
      return { data: { session }, error: null };
    },
  });
  const results = await Promise.all([
    completeAuthCallback(exchange, { code: 'code' }),
    completeAuthCallback(exchange, { code: 'code' }),
  ]);
  assert.deepEqual(results, [session, session]);
  assert.equal(exchanges, 1);
  exchange.reset();
  await completeAuthCallback(exchange, { code: 'code' });
  assert.equal(exchanges, 2);
});
