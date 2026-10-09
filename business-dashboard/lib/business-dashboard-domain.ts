export type Section =
  | 'overview'
  | 'bookings'
  | 'calendar'
  | 'profile'
  | 'services'
  | 'team'
  | 'customers'
  | 'hours'
  | 'reviews'
  | 'earnings'
  | 'settings'
  | 'promotions'
  | 'leads'
  | 'analytics'
  | 'plans';

export type Provider = {
  id: string;
  owner_id: string;
  business_name: string;
  description: string | null;
  base_city: string | null;
  base_postcode: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  cover_image_url: string | null;
  avg_rating: number;
  review_count: number;
  is_verified: boolean;
  verification_status: string;
};

export type Service = {
  id: string;
  name: string;
  description: string | null;
  starting_price: number | null;
  is_featured: boolean;
};

export type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  review_replies?: { id: string; body: string }[];
};

export type Lead = {
  id: string;
  user_id: string;
  message: string | null;
  preferred_contact: string;
  status: string;
  response_message: string | null;
  responded_at: string | null;
  created_at: string;
};

export type Booking = {
  id: string;
  requested_date: string;
  requested_time: string;
  status: string;
  notes: string | null;
  provider_message: string | null;
  created_at: string;
};

export type Notification = {
  id: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export type ClaimableProvider = {
  id: string;
  business_name: string;
  base_city: string | null;
  base_postcode: string | null;
};

export const providerColumns =
  'id,owner_id,business_name,description,base_city,base_postcode,phone,whatsapp,website,cover_image_url,avg_rating,review_count,is_verified,verification_status';

export const businessNavigation: { id: Section; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '⌂' },
  { id: 'bookings', label: 'Bookings', icon: '▣' },
  { id: 'calendar', label: 'Calendar', icon: '▦' },
  { id: 'services', label: 'Services', icon: '◇' },
  { id: 'team', label: 'Team', icon: '♙' },
  { id: 'customers', label: 'Customers', icon: '♧' },
  { id: 'reviews', label: 'Reviews', icon: '☆' },
  { id: 'earnings', label: 'Earnings', icon: '◉' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
];

export const businessWeek = [
  { label: 'Monday', dayOfWeek: 1 },
  { label: 'Tuesday', dayOfWeek: 2 },
  { label: 'Wednesday', dayOfWeek: 3 },
  { label: 'Thursday', dayOfWeek: 4 },
  { label: 'Friday', dayOfWeek: 5 },
  { label: 'Saturday', dayOfWeek: 6 },
  { label: 'Sunday', dayOfWeek: 0 },
];
