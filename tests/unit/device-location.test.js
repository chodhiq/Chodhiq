import assert from 'node:assert/strict';
import test from 'node:test';
import { getDeviceLocation } from '../../src/lib/deviceLocation.js';

test('device location returns coordinates even when reverse geocoding fails', async () => {
  const previousWarn = console.warn;
  console.warn = () => {};
  try {
    const location = await getDeviceLocation({
      Accuracy: { Balanced: 'balanced' },
      requestForegroundPermissionsAsync: async () => ({ granted: true }),
      getCurrentPositionAsync: async () => ({
        coords: { latitude: 51.5, longitude: -0.12 },
      }),
      reverseGeocodeAsync: async () => {
        throw new Error('Geocoder unavailable');
      },
    });
    assert.deepEqual(location, { latitude: 51.5, longitude: -0.12, city: null });
  } finally {
    console.warn = previousWarn;
  }
});

test('device location reports denied permission explicitly', async () => {
  await assert.rejects(
    getDeviceLocation({
      requestForegroundPermissionsAsync: async () => ({ granted: false }),
    }),
    (error) => error.code === 'LOCATION_PERMISSION_DENIED',
  );
});
