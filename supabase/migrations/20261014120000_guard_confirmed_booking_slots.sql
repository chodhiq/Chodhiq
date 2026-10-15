begin;

-- A confirmed appointment occupies its provider's exact date/time slot. Pending
-- requests remain available for provider review; declined/cancelled/completed
-- bookings do not reserve a slot.
create or replace function public.prevent_confirmed_booking_slot_conflicts()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.status = 'confirmed' and exists (
    select 1
    from public.bookings existing
    where existing.provider_id = new.provider_id
      and existing.requested_date = new.requested_date
      and existing.requested_time = new.requested_time
      and existing.status = 'confirmed'
      and existing.id is distinct from new.id
  ) then
    raise exception using
      errcode = '23P01',
      message = 'This time is already booked. Choose a different date or time.';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_confirmed_booking_slot_conflicts() from public, anon, authenticated;
drop trigger if exists prevent_confirmed_booking_slot_conflicts_trigger on public.bookings;
create trigger prevent_confirmed_booking_slot_conflicts_trigger
before insert or update of provider_id, requested_date, requested_time, status
on public.bookings
for each row execute function public.prevent_confirmed_booking_slot_conflicts();

create unique index if not exists bookings_confirmed_provider_slot_key
on public.bookings(provider_id, requested_date, requested_time)
where status = 'confirmed';

commit;
