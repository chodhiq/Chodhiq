-- ChodhiQ â€” South Asian Services Marketplace
-- Postgres / Supabase schema
create extension if not exists postgis;
create extension if not exists "uuid-ossp";

-- ========== SERVICE CATEGORIES ==========
create table categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,              -- "Interior Design", "Mechanic & Auto Repair", etc.
  slug text unique not null,
  icon text not null,
  color text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- ========== USERS (extends Supabase auth.users) â€” customers ==========
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  phone text,
  city text,                        -- customer's home city, for default search location
  preferred_categories uuid[] default '{}',
  created_at timestamptz default now()
);

-- ========== SERVICE PROVIDERS (businesses only, per MVP scope) ==========
create table providers (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references auth.users(id),          -- null until business claims/verifies account
  business_name text not null,
  category_id uuid references categories(id) not null,
  description text,
  base_city text not null,                           -- e.g. "Birmingham"
  base_postcode text,
  base_location geography(Point, 4326),               -- for "near me" style sort when relevant
  service_areas text[] default '{}',                  -- e.g. {"Birmingham","Wolverhampton","Coventry"} â€” UK-wide reach
  languages_spoken text[] default '{}',                -- e.g. {"Punjabi","Urdu","English"}
  years_experience smallint,
  price_range smallint,                                -- 1-4 (Â£ to Â£Â£Â£Â£)
  phone text,
  whatsapp text,
  website text,
  google_place_id text,              -- reference for re-syncing data from Google Places later
  cover_image_url text,
  portfolio_urls text[] default '{}',                  -- gallery, esp. for design/photography/catering
  is_verified boolean default false,
  is_claimed boolean default false,
  avg_rating numeric(2,1) default 0,
  review_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index providers_category_idx on providers (category_id);
create index providers_location_idx on providers using gist (base_location);
create index providers_service_areas_idx on providers using gin (service_areas);
create index providers_languages_idx on providers using gin (languages_spoken);

-- ========== AVAILABILITY (business hours, optional per provider) ==========
create table provider_hours (
  id uuid primary key default uuid_generate_v4(),
  provider_id uuid references providers(id) on delete cascade,
  day_of_week smallint not null,     -- 0=Sunday ... 6=Saturday
  open_time time,
  close_time time,
  is_closed boolean default false
);

-- ========== SERVICES OFFERED (line items per provider, e.g. "Full Room Design", "Oil Change") ==========
create table services (
  id uuid primary key default uuid_generate_v4(),
  provider_id uuid references providers(id) on delete cascade,
  name text not null,
  description text,
  starting_price numeric(10,2),
  is_featured boolean default false,
  created_at timestamptz default now()
);

-- ========== REVIEWS ==========
create table reviews (
  id uuid primary key default uuid_generate_v4(),
  provider_id uuid references providers(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now(),
  unique (provider_id, user_id)
);

-- ========== SAVED / FAVORITES ==========
create table saved_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  provider_id uuid references providers(id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_id, provider_id)
);

-- ========== QUOTE REQUESTS (MVP contact flow â€” no in-app booking yet) ==========
create table quote_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  provider_id uuid references providers(id) on delete cascade,
  message text,
  preferred_contact text default 'whatsapp',  -- 'whatsapp' | 'call' | 'email'
  status text default 'sent',                  -- 'sent' | 'viewed' | 'responded'
  created_at timestamptz default now()
);

-- ========== BOOKINGS (schema ready now, UI/flow built later â€” v2) ==========
create table bookings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  provider_id uuid references providers(id) on delete cascade,
  service_id uuid references services(id),
  requested_date date,
  requested_time time,
  status text default 'pending',   -- 'pending' | 'confirmed' | 'completed' | 'cancelled'
  notes text,
  created_at timestamptz default now()
);

-- ========== RECENT SEARCHES ==========
create table recent_searches (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  query text not null,
  created_at timestamptz default now()
);

-- ========== HELPER: search providers by category + area/city ==========
create or replace function search_providers(
  p_category_slug text default null,
  p_city text default null,
  p_language text default null
)
returns table (
  id uuid,
  business_name text,
  category text,
  base_city text,
  service_areas text[],
  avg_rating numeric,
  review_count int,
  price_range smallint,
  cover_image_url text
) language sql stable as $$
  select
    p.id, p.business_name, c.name as category, p.base_city, p.service_areas,
    p.avg_rating, p.review_count, p.price_range, p.cover_image_url
  from providers p
  join categories c on c.id = p.category_id
  where (p_category_slug is null or c.slug = p_category_slug)
    and (p_city is null or p.base_city ilike p_city or p_city = any(p.service_areas))
    and (p_language is null or p_language = any(p.languages_spoken))
  order by p.avg_rating desc nulls last;
$$;

-- Row Level Security
alter table saved_items enable row level security;
create policy "Users manage their own saved items" on saved_items
  for all using (auth.uid() = user_id);

alter table reviews enable row level security;
create policy "Anyone can read reviews" on reviews for select using (true);
create policy "Users write their own reviews" on reviews
  for insert with check (auth.uid() = user_id);

alter table quote_requests enable row level security;
create policy "Users manage their own quote requests" on quote_requests
  for all using (auth.uid() = user_id);

alter table bookings enable row level security;
create policy "Users manage their own bookings" on bookings
  for all using (auth.uid() = user_id);


alter table public.providers add constraint providers_business_postcode_key unique (business_name, base_postcode);
alter table public.categories enable row level security;
alter table public.providers enable row level security;
alter table public.provider_hours enable row level security;
alter table public.services enable row level security;
alter table public.profiles enable row level security;
alter table public.recent_searches enable row level security;
create policy "Public reads categories" on public.categories for select using (true);
create policy "Public reads providers" on public.providers for select using (true);
create policy "Public reads provider hours" on public.provider_hours for select using (true);
create policy "Public reads services" on public.services for select using (true);
create policy "Users read their own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users update their own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "Users manage their own recent searches" on public.recent_searches for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
;
