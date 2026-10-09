import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readConfirmationLink, confirmationErrorMessage } from '../lib/email-confirmation.ts';

registerHooks({
  resolve(specifier, context, nextResolve) {
    return specifier === 'cloudflare:workers'
      ? { url: specifier, shortCircuit: true }
      : nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    return url === 'cloudflare:workers'
      ? { format: 'module', source: 'export const tracing = undefined;', shortCircuit: true }
      : nextLoad(url, context);
  },
});

test('hashed email links wait for an explicit confirmation action', () => {
  assert.deepEqual(
    readConfirmationLink('https://example.com/auth/confirm?token_hash=one-use-hash&type=email'),
    { kind: 'token', tokenHash: 'one-use-hash' },
  );
});

test('PKCE codes return to the fixed native callback, never an arbitrary destination', () => {
  assert.deepEqual(
    readConfirmationLink(
      'https://example.com/auth/confirm?code=abc%26def&redirect_to=https://untrusted.example',
    ),
    { kind: 'confirmed', appUrl: 'chodhiq://auth/callback?code=abc%26def' },
  );
});

test('missing, expired, and wrong-purpose tokens show recovery instead of success', () => {
  for (const query of [
    '',
    '?token_hash=hash&type=recovery',
    '?code=code&error=access_denied',
    '#error=access_denied',
  ]) {
    assert.deepEqual(readConfirmationLink(`https://example.com/auth/confirm${query}`), {
      kind: 'invalid',
    });
  }
});

test('verification errors explain reuse and retries without exposing server details', () => {
  assert.match(
    confirmationErrorMessage({ code: 'otp_expired' }),
    /already been used.*signing in.*new email/,
  );
  assert.doesNotMatch(
    confirmationErrorMessage(new Error('secret transport payload')),
    /secret transport payload/,
  );
});

test('the hosted confirmation route renders its fallback with private security headers', async () => {
  const { default: worker } = await import('../dist/server/index.js');
  const response = await worker.fetch(
    new Request('https://example.com/auth/confirm'),
    { ASSETS: { fetch: async () => new Response('Not found', { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.match(response.headers.get('cache-control'), /no-store/);
  assert.match(await response.text(), /Confirm your email/);
});
