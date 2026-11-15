import assert from 'node:assert/strict';
import { test } from 'node:test';
import { geocodeUkPostcode, saveProviderCoordinates } from '../../src/lib/providerGeocoding.ts';

test('geocodes terminated postcodes using the fallback endpoint', async () => {
  const requests = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    requests.push(String(input));
    return requests.length === 1
      ? new Response(JSON.stringify({ status: 404 }), { status: 404 })
      : new Response(
          JSON.stringify({
            status: 200,
            result: { latitude: 51.497329, longitude: -0.144796 },
          }),
          { status: 200 },
        );
  };

  try {
    assert.deepEqual(await geocodeUkPostcode('SW1W 0RH'), {
      latitude: 51.497329,
      longitude: -0.144796,
    });
    assert.match(requests[0], /\/postcodes\/SW1W0RH$/);
    assert.match(requests[1], /\/terminated_postcodes\/SW1W0RH$/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('saves coordinates through the provider-coordinate RPC and surfaces RPC errors', async () => {
  const calls = [];
  const client = {
    rpc: async (...args) => {
      calls.push(args);
      return { error: null };
    },
  };
  await saveProviderCoordinates(client, 'provider-1', { latitude: 51.5, longitude: -0.1 });
  assert.deepEqual(calls, [
    [
      'set_provider_coordinates',
      { target_provider: 'provider-1', latitude: 51.5, longitude: -0.1 },
    ],
  ]);

  await assert.rejects(
    saveProviderCoordinates(
      { rpc: async () => ({ error: new Error('RPC failed') }) },
      'provider-1',
      { latitude: 51.5, longitude: -0.1 },
    ),
    /RPC failed/,
  );
});
