// Business cards never use category artwork as a substitute for a provider photo.
// Keep category identity in the icon mapping below instead.
import {
  BriefcaseBusiness as BriefcaseBusinessIcon,
  CalendarDays as CalendarDaysIcon,
  Camera as CameraIcon,
  CarFront as CarFrontIcon,
  Coffee as CoffeeIcon,
  Croissant as CroissantIcon,
  Fish as FishIcon,
  GraduationCap as GraduationCapIcon,
  HeartPulse as HeartPulseIcon,
  House as HouseIcon,
  Gem as GemIcon,
  Package as PackageIcon,
  Plane as PlaneIcon,
  Scissors as ScissorsIcon,
  ShoppingBag as ShoppingBagIcon,
  ShoppingBasket as ShoppingBasketIcon,
  Sparkles as SparklesIcon,
  Store as StoreIcon,
  Shirt as ShirtIcon,
  Church as ChurchIcon,
  Truck as TruckIcon,
  UtensilsCrossed as UtensilsCrossedIcon,
  Users as UsersIcon,
  Wrench as WrenchIcon,
} from 'lucide-react-native';

export const categoryAssets = {};
export const categoryNameAssets = {};

export const categoryIconNames = {
  'home-property': 'House',
  automotive: 'CarFront',
  'personal-family': 'Users',
  'business-professional': 'BriefcaseBusiness',
  'moving-delivery': 'Truck',
  'beauty-wellness': 'Sparkles',
  'temples-churches': 'Church',
  events: 'CalendarDays',
  education: 'GraduationCap',
  'commercial-services': 'Wrench',
  grocery: 'ShoppingBasket',
  restaurants: 'UtensilsCrossed',
  'south-indian-restaurant': 'UtensilsCrossed',
  'indian-restaurant': 'UtensilsCrossed',
  'restaurants-bars': 'UtensilsCrossed',
  'cafes-coffee-shops': 'Coffee',
  shops: 'ShoppingBag',
  'meat-fish': 'Fish',
  bakery: 'Croissant',
  beauty: 'Sparkles',
  photography: 'Camera',
  healthcare: 'HeartPulse',
  'health-medical': 'HeartPulse',
  jewellery: 'Gem',
  'fashion-tailoring': 'Shirt',
  travel: 'Plane',
  'car-services': 'CarFront',
  property: 'House',
  delivery: 'Package',
  'home-services': 'Wrench',
  professional: 'BriefcaseBusiness',
};

const categoryNameIcons = {
  grocery: 'ShoppingBasket', restaurant: 'UtensilsCrossed', restaurants: 'UtensilsCrossed',
  bakery: 'Croissant', catering: 'UtensilsCrossed', beauty: 'Sparkles',
  'bridal & beauty': 'Sparkles', photography: 'Camera', healthcare: 'HeartPulse',
  travel: 'Plane', mechanic: 'CarFront', 'car services': 'CarFront',
  property: 'House', 'real estate': 'House', electrician: 'Wrench', plumber: 'Wrench',
  tailoring: 'Scissors',
};

export function categoryIconName(category, categoryId) {
  return (
    categoryIconNames[categoryId] ||
    categoryNameIcons[String(category || '').toLowerCase()] ||
    'Store'
  );
}

const iconComponents = {
  BriefcaseBusiness: BriefcaseBusinessIcon,
  CalendarDays: CalendarDaysIcon,
  Camera: CameraIcon,
  CarFront: CarFrontIcon,
  Coffee: CoffeeIcon,
  Croissant: CroissantIcon,
  Fish: FishIcon,
  GraduationCap: GraduationCapIcon,
  HeartPulse: HeartPulseIcon,
  House: HouseIcon,
  Gem: GemIcon,
  Package: PackageIcon,
  Plane: PlaneIcon,
  Scissors: ScissorsIcon,
  ShoppingBag: ShoppingBagIcon,
  ShoppingBasket: ShoppingBasketIcon,
  Shirt: ShirtIcon,
  Sparkles: SparklesIcon,
  Store: StoreIcon,
  Truck: TruckIcon,
  UtensilsCrossed: UtensilsCrossedIcon,
  Users: UsersIcon,
  Wrench: WrenchIcon,
  Church: ChurchIcon,
};

export function categoryIcon(category, categoryId) {
  return categoryIconName(category, categoryId);
}

export function categoryIconComponent(iconName) {
  return iconComponents[iconName] || StoreIcon;
}

export const banners = {
  featured: require('../../assets/hero/london-golden-hour-v2.webp'),
  premium: require('../../assets/hero/tower-bridge-premium.webp'),
  soft: require('../../assets/hero/lake-district-soft.webp'),
  community: require('../../assets/categories-hq/beauty_salon.webp'),
  offer: require('../../assets/categories-hq/grocery.webp'),
  dosa: require('../../assets/categories-hq/restaurant.webp'),
  map: require('../../assets/hero/uk_home_hero.webp'),
};

export const generatedAssets = {
  onboarding: require('../../assets/generated/onboarding-london.webp'),
  restaurantInterior: require('../../assets/generated/restaurant-interior.webp'),
  dosaOffer: require('../../assets/generated/dosa-offer.webp'),
};

export function categoryFallback() {
  return null;
}
export function categoryArtwork() {
  return null;
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

