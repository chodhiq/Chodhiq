// Central catalogue for the current HQ asset pack only.
// Supabase/provider images always take priority over these local fallbacks.
export const categoryAssets = {
  'home-property': require('../../assets/categories-hq/real_estate.webp'),
  automotive: require('../../assets/categories-hq/car_service.webp'),
  'personal-family': require('../../assets/categories-hq/healthcare.webp'),
  'business-professional': require('../../assets/categories-hq/real_estate.webp'),
  'moving-delivery': require('../../assets/categories-hq/food_delivery.webp'),
  'beauty-wellness': require('../../assets/categories-hq/beauty_salon.webp'),
  events: require('../../assets/categories-hq/photography.webp'),
  education: require('../../assets/categories-hq/healthcare.webp'),
  'commercial-services': require('../../assets/categories-hq/real_estate.webp'),
  grocery: require('../../assets/categories-hq/grocery.webp'),
  restaurants: require('../../assets/generated/restaurant-interior.webp'),
  'meat-fish': require('../../assets/categories-hq/meat_fish.webp'),
  bakery: require('../../assets/categories-hq/bakery.webp'),
  beauty: require('../../assets/categories-hq/beauty_salon.webp'),
  photography: require('../../assets/categories-hq/photography.webp'),
  healthcare: require('../../assets/categories-hq/healthcare.webp'),
  travel: require('../../assets/categories-hq/travel.webp'),
  'car-services': require('../../assets/categories-hq/car_service.webp'),
  property: require('../../assets/categories-hq/real_estate.webp'),
  delivery: require('../../assets/categories-hq/food_delivery.webp'),
  events: require('../../assets/categories-hq/photography.webp'),
  'home-services': require('../../assets/categories-hq/car_service.webp'),
  professional: require('../../assets/categories-hq/real_estate.webp'),
  education: require('../../assets/categories-hq/healthcare.webp'),
  creators: require('../../assets/categories-hq/photography.webp'),
  freelancers: require('../../assets/categories-hq/real_estate.webp'),
};

export const categoryNameAssets = {
  grocery: categoryAssets.grocery,
  restaurant: categoryAssets.restaurants,
  restaurants: categoryAssets.restaurants,
  bakery: categoryAssets.bakery,
  catering: categoryAssets.restaurants,
  beauty: categoryAssets.beauty,
  'bridal & beauty': categoryAssets.beauty,
  photography: categoryAssets.photography,
  healthcare: categoryAssets.healthcare,
  travel: categoryAssets.travel,
  mechanic: categoryAssets['car-services'],
  'car services': categoryAssets['car-services'],
  property: categoryAssets.property,
  'real estate': categoryAssets.property,
  electrician: categoryAssets['home-services'],
  plumber: categoryAssets['home-services'],
  tailoring: categoryAssets.professional,
};

export const banners = {
  featured: require('../../assets/hero/london-golden-hour-v2.webp'),
  premium: require('../../assets/hero/tower-bridge-premium.webp'),
  soft: require('../../assets/hero/lake-district-soft.webp'),
  community: require('../../assets/categories-hq/beauty_salon.webp'),
  offer: require('../../assets/categories-hq/grocery.webp'),
  dosa: require('../../assets/categories-hq/restaurant.webp'),
  map: require('../../assets/hero/uk_home_hero.webp'),
};
export const people = {
  creator: require('../../assets/categories-hq/photography.webp'),
  professional: require('../../assets/categories-hq/beauty_salon.webp'),
  team: require('../../assets/categories-hq/real_estate.webp'),
  storefront: require('../../assets/categories-hq/grocery.webp'),
};
export const eventAssets = [
  require('../../assets/hero/uk_home_hero.webp'),
  require('../../assets/categories-hq/photography.webp'),
  require('../../assets/categories-hq/real_estate.webp'),
];
export const locationAssets = { map: require('../../assets/hero/uk_home_hero.webp') };
export const generatedAssets = {
  onboarding: require('../../assets/generated/onboarding-london.webp'),
  restaurantInterior: require('../../assets/generated/restaurant-interior.webp'),
  dosaOffer: require('../../assets/generated/dosa-offer.webp'),
};

export function categoryFallback(category, categoryId) {
  return (
    categoryAssets[categoryId] ||
    categoryNameAssets[String(category || '').toLowerCase()] ||
    categoryAssets.professional
  );
}
export function categoryArtwork(category, categoryId) {
  return (
    categoryAssets[categoryId] || categoryNameAssets[String(category || '').toLowerCase()] || null
  );
}
export function isPlaceholderImage(image) {
  return typeof image === 'string' && /picsum\.photos|placeholder\.com|placehold\.co/i.test(image);
}
export function imageSource(image, fallback) {
  return typeof image === 'string' && !isPlaceholderImage(image)
    ? { uri: image }
    : image && !isPlaceholderImage(image)
      ? image
      : fallback;
}
