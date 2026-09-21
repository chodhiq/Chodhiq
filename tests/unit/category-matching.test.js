import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesProviderSearch, providerMatchesCategory } from '../../src/data/categoryMatching.js';

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
