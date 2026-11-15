begin;

create or replace function public.notify_booking_participants() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  owner uuid;
  business text;
  notification_body text;
begin
  select p.owner_id, p.business_name
  into owner, business
  from public.providers p
  where p.id = new.provider_id;

  if tg_op = 'INSERT' and owner is not null then
    insert into public.notifications(user_id, title, body)
    values (
      owner,
      'New booking request',
      'A customer requested a booking for ' || coalesce(new.requested_date::text, 'a future date') || '.'
    );
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'cancelled' then
      if auth.uid() = new.user_id then
        notification_body := 'You cancelled your booking with ' || coalesce(business, 'the business') || '.';
      else
        notification_body := coalesce(business, 'The business') || ' cancelled your booking.';
      end if;
    else
      notification_body := coalesce(business, 'The business') || ' marked your booking ' || new.status || '.';
    end if;

    insert into public.notifications(user_id, title, body)
    values (new.user_id, 'Booking update', notification_body);
  end if;
  return new;
end $$;

commit;
