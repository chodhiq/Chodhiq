-- Reject quote requests and bookings for place listings at the database layer.
begin;

create or replace function public.reject_place_quote_request()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if exists (
    select 1
    from public.providers p
    where p.id = new.provider_id
      and p.listing_type = 'place'
  ) then
    raise exception using
      errcode = '42501',
      message = 'Quote requests are not available for place listings';
  end if;
  return new;
end;
$$;

revoke all on function public.reject_place_quote_request() from public, anon, authenticated;

drop trigger if exists reject_place_quote_request_trigger on public.quote_requests;
create trigger reject_place_quote_request_trigger
  before insert or update on public.quote_requests
  for each row execute function public.reject_place_quote_request();

create or replace function public.reject_place_booking()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if exists (
    select 1
    from public.providers p
    where p.id = new.provider_id
      and p.listing_type = 'place'
  ) then
    raise exception using
      errcode = '42501',
      message = 'Bookings are not available for place listings';
  end if;
  return new;
end;
$$;

revoke all on function public.reject_place_booking() from public, anon, authenticated;

drop trigger if exists reject_place_booking_trigger on public.bookings;
create trigger reject_place_booking_trigger
  before insert or update on public.bookings
  for each row execute function public.reject_place_booking();

commit;
