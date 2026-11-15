-- Add curated place listings alongside owner-managed providers.
-- Existing rows default to listed providers; new place rows start hidden.
-- Keep is_admin() out of policies applying to anon: anon may lack EXECUTE on
-- that helper. Authenticated admins get a separate policy for provider reads.
begin;

alter table public.providers
  add column if not exists is_listed boolean not null default true,
  add column if not exists listing_type text not null default 'provider'
    check (listing_type in ('provider', 'place'));

grant select (listing_type, is_listed) on public.providers to anon, authenticated;

-- Production policy before:
--   create policy "Public reads providers" on public.providers
--     for select to public using (true);
-- Keep the same policy name and role; unpublished places stay visible to their
-- owner and admins.
drop policy if exists "Public reads providers" on public.providers;
create policy "Public reads providers"
  on public.providers for select to public
  using (is_listed or owner_id = (select auth.uid()));

drop policy if exists "Admins read all providers" on public.providers;
create policy "Admins read all providers"
  on public.providers for select to authenticated
  using (public.is_admin());

create or replace function public.protect_provider_listing_type()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if current_user not in ('authenticated', 'anon') or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' and new.listing_type <> 'provider' then
    raise exception using
      errcode = '42501',
      message = 'Only an administrator or service role may insert place listings';
  end if;

  if tg_op = 'UPDATE' and new.listing_type is distinct from old.listing_type then
    raise exception using
      errcode = '42501',
      message = 'Only an administrator or service role may change listing_type';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_provider_listing_type_trigger on public.providers;
create trigger protect_provider_listing_type_trigger
  before insert or update on public.providers
  for each row execute function public.protect_provider_listing_type();

create or replace function public.protect_place_publication()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  -- Every place starts hidden, including inserts by privileged callers.
  if tg_op = 'INSERT' and new.listing_type = 'place' then
    new.is_listed := false;
  elsif tg_op = 'UPDATE'
     and new.listing_type = 'place'
     and old.is_listed = false
     and new.is_listed = true
     and not (current_user not in ('authenticated', 'anon') or public.is_admin()) then
    raise exception using
      errcode = '42501',
      message = 'Only an administrator or service role may publish place listings';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_place_publication_trigger on public.providers;
create trigger protect_place_publication_trigger
  before insert or update on public.providers
  for each row execute function public.protect_place_publication();

create table if not exists public.place_sources (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null unique references public.providers(id) on delete cascade,
  source text not null default 'fsa_fhrs',
  source_id text not null,
  source_authority_id integer,
  fetched_at timestamptz not null default now(),
  fetched_name text not null,
  fetched_postcode text not null,
  fetched_address text,
  business_type text,
  rating_value text,
  rating_date date,
  attribution_text text not null default
    'Contains data from the Food Standards Agency. © Crown copyright. Licensed under the Open Government Licence.',
  constraint place_sources_source_unique unique (source, source_id),
  constraint place_sources_rating_chk check (
    rating_value is null
    or rating_value in ('0', '1', '2', '3', '4', '5', 'AwaitingInspection', 'Exempt')
  ),
  constraint place_sources_numeric_needs_date check (
    rating_value is null
    or rating_value in ('AwaitingInspection', 'Exempt')
    or rating_date is not null
  )
);

alter table public.place_sources enable row level security;
revoke all on public.place_sources from public, anon, authenticated;
grant select (
  listing_id, source, source_id, fetched_name, fetched_postcode,
  fetched_address, business_type, rating_value, rating_date,
  attribution_text, fetched_at
) on public.place_sources to anon, authenticated;
grant select, insert, update, delete on public.place_sources to service_role;

drop policy if exists "place_sources readable by all" on public.place_sources;
-- Provider RLS already determines whether anon/authenticated can see the
-- referenced listing, so this policy does not call is_admin() itself.
create policy "place_sources readable by all"
  on public.place_sources for select to anon, authenticated
  using (exists (
    select 1 from public.providers p
    where p.id = listing_id
      and p.listing_type = 'place'
  ));

create table if not exists public.place_source_reviews (
  listing_id uuid primary key references public.providers(id) on delete cascade,
  needs_review boolean not null default true,
  review_flags text[] not null default '{}',
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz
);

alter table public.place_source_reviews enable row level security;
revoke all on public.place_source_reviews from public, anon, authenticated;
grant select, insert, update on public.place_source_reviews to authenticated;
grant select, insert, update, delete on public.place_source_reviews to service_role;

drop policy if exists "admins read place source reviews" on public.place_source_reviews;
create policy "admins read place source reviews"
  on public.place_source_reviews for select to authenticated
  using (public.is_admin());

drop policy if exists "admins insert place source reviews" on public.place_source_reviews;
create policy "admins insert place source reviews"
  on public.place_source_reviews for insert to authenticated
  with check (public.is_admin());

drop policy if exists "admins update place source reviews" on public.place_source_reviews;
create policy "admins update place source reviews"
  on public.place_source_reviews for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create table if not exists public.item_catalog (
  slug text primary key,
  label text not null
);

insert into public.item_catalog (slug, label) values
  ('basmati_rice', 'Basmati rice'),
  ('matta_rice', 'Matta rice'),
  ('pickles', 'Pickles'),
  ('curry_leaves', 'Curry leaves'),
  ('coconut_oil', 'Coconut oil'),
  ('banana_chips', 'Banana chips'),
  ('parotta', 'Parotta'),
  ('spices', 'Spices')
on conflict (slug) do nothing;

alter table public.item_catalog enable row level security;
revoke all on public.item_catalog from public, anon, authenticated;
grant select on public.item_catalog to anon, authenticated;
grant select, insert, update, delete on public.item_catalog to service_role;

drop policy if exists "item_catalog readable by all" on public.item_catalog;
create policy "item_catalog readable by all"
  on public.item_catalog for select to anon, authenticated
  using (true);

create table if not exists public.place_item_tags (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.providers(id) on delete cascade,
  item_slug text not null references public.item_catalog(slug),
  reported_by uuid not null references auth.users(id) on delete cascade,
  reported_at timestamptz not null default now(),
  unique (listing_id, item_slug, reported_by)
);

create index if not exists place_item_tags_listing_idx
  on public.place_item_tags (listing_id);
create index if not exists place_item_tags_item_idx
  on public.place_item_tags (item_slug);

alter table public.place_item_tags enable row level security;
revoke all on public.place_item_tags from public, anon, authenticated;
grant select on public.place_item_tags to anon, authenticated;
grant insert, delete on public.place_item_tags to authenticated;
grant select, insert, update, delete on public.place_item_tags to service_role;

drop policy if exists "place item tags readable by all" on public.place_item_tags;
-- Provider RLS already determines whether anon/authenticated can see the
-- referenced listing, so this policy does not call is_admin() itself.
create policy "place item tags readable by all"
  on public.place_item_tags for select to anon, authenticated
  using (exists (
    select 1 from public.providers p
    where p.id = listing_id
      and p.listing_type = 'place'
  ));

drop policy if exists "signed-in users add own place tags" on public.place_item_tags;
create policy "signed-in users add own place tags"
  on public.place_item_tags for insert to authenticated
  with check (
    reported_by = (select auth.uid())
    and exists (
      select 1 from public.providers p
      where p.id = listing_id
        and p.listing_type = 'place'
        and p.is_listed = true
    )
  );

drop policy if exists "users remove own place tags" on public.place_item_tags;
create policy "users remove own place tags"
  on public.place_item_tags for delete to authenticated
  using (reported_by = (select auth.uid()));

create or replace view public.place_item_summary
with (security_invoker = true) as
select listing_id, item_slug, count(*) as confirmations, max(reported_at) as last_confirmed
from public.place_item_tags
group by listing_id, item_slug;

grant select on public.place_item_summary to anon, authenticated;

commit;
