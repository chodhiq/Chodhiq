begin;

create or replace function public.validate_booking_request_datetime()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  london_now timestamp without time zone := clock_timestamp() at time zone 'Europe/London';
begin
  if new.requested_date is null or new.requested_time is null then
    raise exception using errcode = '23514',
      message = 'Choose both a booking date and time';
  end if;
  if new.requested_date < london_now::date
     or (new.requested_date = london_now::date and new.requested_time <= london_now::time) then
    raise exception using errcode = '23514',
      message = 'Choose a future date and time';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_booking_request_datetime() from public, anon, authenticated;
drop trigger if exists validate_booking_request_datetime_trigger on public.bookings;
create trigger validate_booking_request_datetime_trigger
before insert or update of requested_date, requested_time on public.bookings
for each row execute function public.validate_booking_request_datetime();

commit;
