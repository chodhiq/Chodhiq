-- Remove place-listing support, but preserve data if any place rows exist.
begin;

do $$
declare
  has_places boolean := false;
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'providers'
      and column_name = 'listing_type'
  ) then
    execute 'select exists (select 1 from public.providers where listing_type = ''place'')'
      into has_places;
  end if;

  if has_places then
    raise exception 'Rollback refused: public.providers contains place rows';
  end if;
end;
$$;

-- Reverse migration 2 first.
drop trigger if exists reject_place_booking_trigger on public.bookings;
drop function if exists public.reject_place_booking();
drop trigger if exists reject_place_quote_request_trigger on public.quote_requests;
drop function if exists public.reject_place_quote_request();

-- Reverse migration 1.
drop trigger if exists protect_place_publication_trigger on public.providers;
drop function if exists public.protect_place_publication();
drop trigger if exists protect_provider_listing_type_trigger on public.providers;
drop function if exists public.protect_provider_listing_type();

drop view if exists public.place_item_summary;
drop table if exists public.place_item_tags;
drop table if exists public.item_catalog;
drop table if exists public.place_source_reviews;
drop table if exists public.place_sources;

drop policy if exists "Admins read all providers" on public.providers;
drop policy if exists "Public reads providers" on public.providers;
create policy "Public reads providers"
  on public.providers for select to public
  using (true);

alter table public.providers
  drop column if exists listing_type,
  drop column if exists is_listed;

commit;
