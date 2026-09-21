-- Customer bookings, in-app quote responses, and publication-consent audit.
alter table public.quote_requests add column if not exists response_message text;
alter table public.quote_requests add column if not exists responded_at timestamptz;
alter table public.quote_requests drop constraint if exists quote_response_length;
alter table public.quote_requests add constraint quote_response_length check (response_message is null or char_length(response_message) between 1 and 2000) not valid;
alter table public.bookings add column if not exists provider_message text;
alter table public.bookings add column if not exists responded_at timestamptz;
alter table public.bookings drop constraint if exists booking_status_allowed;
alter table public.bookings add constraint booking_status_allowed check (status in ('pending','confirmed','completed','cancelled','declined')) not valid;
alter table public.bookings drop constraint if exists booking_notes_length;
alter table public.bookings add constraint booking_notes_length check (notes is null or char_length(notes) <= 1000) not valid;
alter table public.bookings drop constraint if exists booking_provider_message_length;
alter table public.bookings add constraint booking_provider_message_length check (provider_message is null or char_length(provider_message) <= 2000) not valid;
drop policy if exists "Users manage their own bookings" on public.bookings;
drop policy if exists "Customers read own bookings" on public.bookings;
drop policy if exists "Customers create own bookings" on public.bookings;
drop policy if exists "Customers cancel own bookings" on public.bookings;
drop policy if exists "Provider owners read received bookings" on public.bookings;
drop policy if exists "Provider owners update received bookings" on public.bookings;
create policy "Customers read own bookings" on public.bookings for select to authenticated using (user_id = auth.uid());
create policy "Customers create own bookings" on public.bookings for insert to authenticated with check (user_id = auth.uid() and status = 'pending');
create policy "Customers cancel own bookings" on public.bookings for update to authenticated using (user_id = auth.uid() and status in ('pending','confirmed')) with check (user_id = auth.uid() and status = 'cancelled');
create policy "Provider owners read received bookings" on public.bookings for select to authenticated using (public.owns_provider(provider_id));
create policy "Provider owners update received bookings" on public.bookings for update to authenticated using (public.owns_provider(provider_id)) with check (public.owns_provider(provider_id));
grant select, insert on public.bookings to authenticated;
grant update (status, provider_message, responded_at) on public.bookings to authenticated;
create table if not exists public.provider_publication_consents (
  provider_id uuid primary key references public.providers(id) on delete cascade,
  status text not null default 'not_contacted' check (status in ('not_contacted','contacted','consented','declined','expired')),
  contact_channel text,
  contact_reference text,
  contacted_at timestamptz,
  responded_at timestamptz,
  expires_at timestamptz,
  notes text check (notes is null or char_length(notes) <= 2000),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
alter table public.provider_publication_consents enable row level security;
drop policy if exists "Admins manage publication consent" on public.provider_publication_consents;
create policy "Admins manage publication consent" on public.provider_publication_consents for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, insert, update on public.provider_publication_consents to authenticated;
create or replace function public.notify_booking_participants() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare owner uuid; business text;
begin
  select p.owner_id,p.business_name into owner,business from public.providers p where p.id=new.provider_id;
  if tg_op='INSERT' and owner is not null then
    insert into public.notifications(user_id,title,body) values(owner,'New booking request','A customer requested a booking for '||coalesce(new.requested_date::text,'a future date')||'.');
  elsif tg_op='UPDATE' and new.status is distinct from old.status then
    insert into public.notifications(user_id,title,body) values(new.user_id,'Booking update',coalesce(business,'The business')||' marked your booking '||new.status||'.');
  end if;
  return new;
end $$;
drop trigger if exists notify_booking_participants_trigger on public.bookings;
create trigger notify_booking_participants_trigger after insert or update of status on public.bookings for each row execute function public.notify_booking_participants();
create or replace function public.notify_customer_on_quote_response() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare business text;
begin
  if new.response_message is distinct from old.response_message and new.response_message is not null then
    select business_name into business from public.providers where id=new.provider_id;
    insert into public.notifications(user_id,title,body) values(new.user_id,'Quote response received',coalesce(business,'A business')||' replied to your quote request.');
  end if;
  return new;
end $$;
drop trigger if exists notify_customer_on_quote_response_trigger on public.quote_requests;
create trigger notify_customer_on_quote_response_trigger after update of response_message on public.quote_requests for each row execute function public.notify_customer_on_quote_response();
create index if not exists bookings_provider_status_date_idx on public.bookings(provider_id,status,requested_date);
create index if not exists provider_publication_consents_status_idx on public.provider_publication_consents(status,updated_at desc);
