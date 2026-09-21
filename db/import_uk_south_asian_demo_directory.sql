-- Local schema companion for remote migration
-- 20260806123359_import_uk_south_asian_demo_directory
--
-- The 17 source rows were imported from uk_south_asian_demo_seed.json.
-- This file keeps the repository schema aligned with the live Supabase project.

create table if not exists public.directory_profiles (
  source_id text primary key,
  profile_type text not null check (profile_type in ('Business', 'Creator', 'Service Provider', 'Creator Community', 'Community')),
  name text not null,
  category text not null,
  subcategory text,
  city text,
  region text,
  address text,
  phone text,
  email text,
  website text,
  instagram text,
  facebook text,
  description text not null,
  language_tags text[] not null default '{}',
  verification_status text not null,
  demo_use text not null,
  source_url text not null,
  notes text,
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.directory_profiles enable row level security;

do $$ begin
  create policy "directory profiles are publicly readable"
    on public.directory_profiles for select to anon, authenticated using (true);
exception when duplicate_object then null;
end $$;

grant select on public.directory_profiles to anon, authenticated;

alter table public.providers add column if not exists source_profile_id text unique;
alter table public.providers add column if not exists contact_email text;
alter table public.providers add column if not exists street_address text;
alter table public.providers add column if not exists subcategory text;
alter table public.providers add column if not exists instagram text;
alter table public.providers add column if not exists facebook text;
alter table public.providers add column if not exists source_url text;
alter table public.providers add column if not exists data_notes text;

