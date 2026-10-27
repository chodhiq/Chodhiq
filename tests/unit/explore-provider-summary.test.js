import assert from 'node:assert/strict';
import test from 'node:test';
import { providerMatchesService } from '../../src/data/categoryMatching.js';
import { matchesProviderOpenNow } from '../../src/data/providerDiscovery.js';

test('Explore service filter matches summary tags without loading service rows', () => {
  const provider = { serviceTags: ['Oil Change', 'Brake Inspection'], services: [] };
  assert.equal(providerMatchesService(provider, 'oil change'), true);
  assert.equal(providerMatchesService(provider, 'Wheel Alignment'), false);
});

test('Explore open-now filter uses compact hours summary', () => {
  const mondayAtNoon = new Date('2026-10-05T11:00:00.000Z');
  const provider = {
    openingHoursSummary: [
      { day_of_week: 1, is_closed: false, open_time: '09:00:00', close_time: '17:00:00' },
    ],
  };
  assert.equal(matchesProviderOpenNow(provider, true, mondayAtNoon), true);
  assert.equal(
    matchesProviderOpenNow(
      {
        openingHoursSummary: [
          { day_of_week: 1, is_closed: true, open_time: null, close_time: null },
        ],
      },
      true,
      mondayAtNoon,
    ),
    false,
  );
});

test('providers without hours remain unknown and do not match the open-now filter', () => {
  assert.equal(matchesProviderOpenNow({ openingHoursSummary: [] }, true), false);
  assert.equal(matchesProviderOpenNow({}, true), false);
  assert.equal(matchesProviderOpenNow({}, false), true);
});
