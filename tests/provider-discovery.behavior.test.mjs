import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../src/data/providerDiscovery.js', import.meta.url), 'utf8');
const { distanceKm, isProviderOpenNow } = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
);

test('provider distance is zero for identical coordinates and symmetric', () => {
  assert.equal(distanceKm(52.6369, -1.1398, 52.6369, -1.1398), 0);
  assert.equal(
    distanceKm(52.6369, -1.1398, 52.4862, -1.8904),
    distanceKm(52.4862, -1.8904, 52.6369, -1.1398),
  );
});

test('opening-hours filter distinguishes open, closed, and unknown schedules', () => {
  const mondayAtNoon = new Date('2026-10-05T11:00:00.000Z');
  assert.equal(
    isProviderOpenNow(
      [{ day_of_week: 1, open_time: '09:00:00', close_time: '17:00:00' }],
      mondayAtNoon,
    ),
    true,
  );
  assert.equal(isProviderOpenNow([{ day_of_week: 1, is_closed: true }], mondayAtNoon), false);
  assert.equal(isProviderOpenNow([]), null);
});
