import test from 'node:test';
import assert from 'node:assert/strict';
import {
  matchesProviderSearch,
  providerCardLabels,
  providerMatchesCategory,
  providerMatchesService,
} from '../../src/data/categoryMatching.js';

const category = (id, name) => ({ id, name });
const provider = (categoryName, extra = {}) => ({
  name: 'Example Business',
  category: categoryName,
  serviceAreas: ['London'],
  ...extra,
});

test('matches exact backend category IDs', () => {
  assert.equal(
    providerMatchesCategory(
      provider('Food', { categoryId: 'restaurants' }),
      category('restaurants', 'Restaurants'),
    ),
    true,
  );
});

test('maps specific provider labels to broad browse categories', () => {
  assert.equal(
    providerMatchesCategory(provider('Catering'), category('restaurants', 'Restaurants')),
    true,
  );
  assert.equal(
    providerMatchesCategory(provider('Mechanic'), category('car-services', 'Car Services')),
    true,
  );
  assert.equal(
    providerMatchesCategory(
      provider('Interior Design'),
      category('home-services', 'Home Services'),
    ),
    true,
  );
  assert.equal(
    providerMatchesCategory(provider('Bridal & Beauty'), category('beauty', 'Beauty')),
    true,
  );
});

test('does not include unrelated providers', () => {
  assert.equal(
    providerMatchesCategory(provider('Photography'), category('restaurants', 'Restaurants')),
    false,
  );
});

test('search includes services, subcategory, and description', () => {
  assert.equal(
    matchesProviderSearch(provider('Services', { services: ['Boiler repair'] }), 'boiler'),
    true,
  );
  assert.equal(
    matchesProviderSearch(
      provider('Services', { description: 'Family wedding specialist' }),
      'wedding',
    ),
    true,
  );
});

test('search finds listings by postcode, with or without its space', () => {
  const listing = provider('Services', { basePostcode: 'LE4 5AT' });
  assert.equal(matchesProviderSearch(listing, 'LE4 5AT'), true);
  assert.equal(matchesProviderSearch(listing, 'LE45AT'), true);
});

test('postcode search does not confuse neighboring outward codes', () => {
  assert.equal(
    matchesProviderSearch(provider('Services', { basePostcode: 'LE1 1AA' }), 'LE1'),
    true,
  );
  assert.equal(
    matchesProviderSearch(provider('Services', { basePostcode: 'LE10 1AB' }), 'LE1'),
    false,
  );
  assert.equal(
    matchesProviderSearch(provider('Services', { basePostcode: 'LE11 2CD' }), 'LE1'),
    false,
  );
});

test('provider service filters match the selected real service only', () => {
  const listing = provider('Home Services', {
    services: [{ name: 'Boiler repair' }, { name: 'Bathroom fitting' }],
  });
  assert.equal(providerMatchesService(listing, 'Boiler repair'), true);
  assert.equal(providerMatchesService(listing, 'Takeaway'), false);
  assert.equal(providerMatchesService(listing, null), true);
});

test('provider card labels use provider services and price, not food defaults', () => {
  assert.deepEqual(
    providerCardLabels({
      category: 'Home Services',
      services: [{ name: 'Boiler repair' }, { name: 'Bathroom fitting' }],
      priceRange: 2,
    }),
    ['Boiler repair', 'Bathroom fitting', '££'],
  );
  assert.deepEqual(providerCardLabels({ category: 'Property', priceRange: null }), ['Property']);
});
