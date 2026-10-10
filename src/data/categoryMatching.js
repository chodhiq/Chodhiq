// @ts-check
import { serviceTaxonomy } from './serviceTaxonomy.js';
import { matchesPostcodePrefix } from './providerDiscovery.js';

/** @param {unknown} value */
const normalize = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** @type {Record<string, string[]>} */
const CATEGORY_TERMS = {
  grocery: ['grocery', 'grocer', 'supermarket', 'food shop'],
  restaurants: ['restaurant', 'catering', 'caterer', 'food delivery', 'takeaway'],
  'meat-fish': ['meat', 'fish', 'butcher', 'seafood'],
  beauty: ['beauty', 'bridal', 'henna', 'mehndi', 'salon', 'makeup', 'tailor', 'tailoring'],
  photography: ['photography', 'photographer', 'videography', 'videographer'],
  events: ['event', 'wedding planner', 'decorator', 'dj'],
  'home-services': [
    'home service',
    'interior design',
    'electrician',
    'electrical',
    'plumber',
    'plumbing',
    'cleaner',
    'handyman',
  ],
  professional: ['professional service', 'accountant', 'legal', 'solicitor', 'consultant'],
  healthcare: ['healthcare', 'health care', 'doctor', 'medical', 'clinic', 'dentist'],
  education: ['education', 'tutor', 'tuition', 'teacher', 'school'],
  bakery: ['bakery', 'baker', 'cake'],
  travel: ['travel', 'tour', 'flight', 'holiday'],
  'car-services': ['car service', 'mechanic', 'garage', 'mot', 'auto repair', 'automotive'],
  property: ['property', 'estate agent', 'real estate', 'letting'],
  ...Object.fromEntries(
    serviceTaxonomy.map((category) => [category.id, [category.name, ...category.services]]),
  ),
};

/** @param {any} provider */
export function providerSearchText(provider) {
  const categoryTerms = CATEGORY_TERMS[provider.categoryId] || [];
  const services = /** @type {any[]} */ (provider.services || []).flatMap((service) =>
    typeof service === 'string' ? [service] : [service?.name, service?.description],
  );
  return normalize(
    [
      provider.name,
      provider.category,
      provider.categoryId,
      provider.subcategory,
      provider.baseCity,
      provider.basePostcode,
      provider.address,
      provider.description,
      ...(provider.serviceAreas || []),
      ...services,
      ...categoryTerms,
    ]
      .filter(Boolean)
      .join(' '),
  );
}

/** @param {any} provider @param {any} category */
export function providerMatchesCategory(provider, category) {
  if (!category) return true;
  const providerText = providerSearchText(provider);
  const categoryId = normalize(category.id);
  const categoryName = normalize(category.name);
  if (
    [provider.categoryId, provider.category].some((value) => {
      const candidate = normalize(value);
      return candidate === categoryId || candidate === categoryName;
    })
  )
    return true;
  const terms = CATEGORY_TERMS[category.id] || [categoryName];
  return terms.some((term) => providerText.includes(normalize(term)));
}

/** @param {any} provider @param {string | null} serviceName */
export function providerMatchesService(provider, serviceName) {
  if (!serviceName) return true;
  return /** @type {any[]} */ (provider.services || []).some((service) => {
    const name = typeof service === 'string' ? service : service?.name;
    return normalize(name) === normalize(serviceName);
  });
}

/** @param {any} provider */
export function providerCardLabels(provider) {
  const services = /** @type {any[]} */ (provider.services || [])
    .map((service) => (typeof service === 'string' ? service : service?.name))
    .filter(Boolean);
  const labels = [...new Set(services)].slice(0, 2);
  if (!labels.length && (provider.subcategory || provider.category)) {
    labels.push(provider.subcategory || provider.category);
  }
  if (
    Number.isInteger(provider.priceRange) &&
    provider.priceRange >= 1 &&
    provider.priceRange <= 4
  ) {
    labels.push('£'.repeat(provider.priceRange));
  }
  return labels.slice(0, 3);
}

/** @param {any} provider @param {string} query */
export function matchesProviderSearch(provider, query) {
  const needle = normalize(query);
  if (!needle) return true;
  if (matchesPostcodePrefix(provider.basePostcode, query)) return true;
  const postcodeText = normalize(provider.basePostcode);
  const providerText = providerSearchText(provider);
  const searchable = postcodeText ? providerText.split(postcodeText).join(' ') : providerText;
  if (searchable.includes(needle)) return true;
  const words = searchable.split(' ').map(singular);
  return needle
    .split(' ')
    .map(singular)
    .every((word) =>
      words.some(
        (candidate) =>
          candidate === word ||
          (Math.min(candidate.length, word.length) >= 4 &&
            (candidate.startsWith(word) || word.startsWith(candidate))),
      ),
    );
}

/** @param {string} word */
function singular(word) {
  if (word.length > 4 && word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}
