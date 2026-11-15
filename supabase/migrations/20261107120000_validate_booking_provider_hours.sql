begin;

create or replace function public.validate_booking_request_datetime()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  london_now timestamp without time zone := clock_timestamp() at time zone 'Europe/London';
  has_opening_hours boolean;
  is_open boolean;
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  if current_user = 'authenticated' and public.is_admin() then
    return new;
  end if;

  if new.requested_date is null or new.requested_time is null then
    raise exception using errcode = '23514',
      message = 'Choose both a booking date and time';
  end if;
  if new.requested_date < london_now::date
     or (new.requested_date = london_now::date and new.requested_time <= london_now::time) then
    raise exception using errcode = '23514',
      message = 'Choose a future date and time';
  end if;

  select exists (
    select 1
    from public.provider_hours as hours
    where hours.provider_id = new.provider_id
  ) into has_opening_hours;

  if not has_opening_hours then
    return new;
  end if;

  -- Bookings and provider hours store UK wall time, not instants. Do not
  -- convert requested wall time through a timezone: that would reject the
  -- nonexistent spring-forward hour or choose one fall-back occurrence.
  select exists (
    select 1
    from public.provider_hours as hours
    where hours.provider_id = new.provider_id
      and coalesce(hours.is_closed, false) = false
      and hours.open_time is not null
      and hours.close_time is not null
      and hours.open_time <> hours.close_time
      and (
        (
          extract(dow from new.requested_date)::integer = hours.day_of_week
          and (
            (
              hours.open_time < hours.close_time
              and new.requested_time >= hours.open_time
              and new.requested_time < hours.close_time
            )
            or (
              hours.open_time > hours.close_time
              and new.requested_time >= hours.open_time
            )
          )
        )
        or (
          extract(dow from new.requested_date)::integer = (hours.day_of_week + 1) % 7
          and hours.open_time > hours.close_time
          and new.requested_time < hours.close_time
        )
      )
  ) into is_open;

  if not is_open then
    raise exception using errcode = 'PZH01',
      message = 'Choose a time within the business’s opening hours.';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_booking_request_datetime() from public, anon, authenticated;

drop trigger if exists validate_booking_request_datetime_trigger on public.bookings;
create trigger validate_booking_request_datetime_trigger
before insert on public.bookings
for each row execute function public.validate_booking_request_datetime();

commit;

