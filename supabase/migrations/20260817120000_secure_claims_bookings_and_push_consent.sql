begin;
-- Imported listings remain unowned until an administrator approves evidence.
drop function if exists public.claim_imported_provider(uuid);
create function public.claim_imported_provider(target_provider uuid)
returns table(provider_id uuid, request_id uuid, business_name text)
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  provider_row public.providers;
  created_request uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  update public.verification_requests vr set status = 'rejected',
    admin_notes = coalesce(admin_notes, 'Draft claim expired before submission'), reviewed_at = now()
  where vr.status = 'draft' and vr.submitted_at < now() - interval '24 hours'
    and (vr.submitted_by = auth.uid() or vr.provider_id = target_provider);
  if exists (select 1 from public.providers where owner_id = auth.uid()) then
    raise exception 'This account already has a business workspace' using errcode = '23505';
  end if;
  if exists (
    select 1 from public.verification_requests
    where submitted_by = auth.uid() and status in ('draft', 'pending', 'changes_requested')
  ) then
    raise exception 'This account already has an open business claim' using errcode = '23505';
  end if;
  select * into provider_row from public.providers
  where id = target_provider and owner_id is null and coalesce(is_claimed, false) = false
    and source_profile_id is not null
    and not exists (
      select 1 from public.verification_requests vr
      where vr.provider_id = target_provider and vr.status in ('draft', 'pending', 'changes_requested')
    )
  for update;
  if provider_row.id is null then
    raise exception 'Listing is unavailable or already has an open claim' using errcode = 'P0002';
  end if;
  insert into public.verification_requests(provider_id, submitted_by, status)
  values(target_provider, auth.uid(), 'draft') returning id into created_request;
  return query select provider_row.id, created_request, provider_row.business_name;
end $$;
revoke all on function public.claim_imported_provider(uuid) from public;
grant execute on function public.claim_imported_provider(uuid) to authenticated;
create or replace function public.list_claimable_providers()
returns table(id uuid, business_name text, base_city text, base_postcode text)
language sql stable security definer set search_path = pg_catalog, public as $$
  select p.id, p.business_name, p.base_city, p.base_postcode
  from public.providers p
  where p.owner_id is null and coalesce(p.is_claimed, false) = false and p.source_profile_id is not null
    and not exists (
      select 1 from public.verification_requests vr
      where vr.provider_id = p.id and (
        vr.status in ('pending', 'changes_requested')
        or (vr.status = 'draft' and vr.submitted_at >= now() - interval '24 hours')
      )
    )
  order by p.business_name limit 100
$$;
drop policy if exists "Claimants create verification metadata" on public.verification_documents;
create policy "Claimants create verification metadata" on public.verification_documents
for insert to authenticated with check (
  uploaded_by = auth.uid() and exists (
    select 1 from public.verification_requests vr
    where vr.id = request_id and vr.provider_id = provider_id
      and vr.submitted_by = auth.uid() and vr.status in ('draft', 'changes_requested')
      and (vr.status <> 'draft' or vr.submitted_at >= now() - interval '24 hours')
  )
);
create or replace function public.submit_provider_verification(target_provider uuid, request_notes text default null)
returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare request_uuid uuid;
begin
  select id into request_uuid from public.verification_requests
  where provider_id = target_provider and submitted_by = auth.uid()
    and (status = 'changes_requested' or (status = 'draft' and submitted_at >= now() - interval '24 hours'))
  order by submitted_at desc limit 1;
  if request_uuid is null then
    if not exists (select 1 from public.providers where id = target_provider and owner_id = auth.uid()) then
      raise exception 'No open claim or owned provider was found' using errcode = '42501';
    end if;
    insert into public.verification_requests(provider_id, submitted_by, status, notes)
    values(target_provider, auth.uid(), 'draft', request_notes) returning id into request_uuid;
  end if;
  if not exists (select 1 from public.verification_documents where request_id = request_uuid) then
    raise exception 'Upload at least one verification document first' using errcode = '23514';
  end if;
  update public.verification_requests set status = 'pending', notes = coalesce(request_notes, notes),
    submitted_at = now(), reviewed_at = null, reviewed_by = null where id = request_uuid;
  update public.providers set verification_status = 'pending', updated_at = now()
    where id = target_provider and owner_id = auth.uid();
  return request_uuid;
end $$;
create or replace function public.assign_approved_claim_owner()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    if exists (select 1 from public.providers where owner_id = new.submitted_by and id <> new.provider_id) then
      raise exception 'Claimant already owns another business workspace' using errcode = '23505';
    end if;
    update public.providers set owner_id = new.submitted_by, is_claimed = true,
      is_verified = true, verification_status = 'verified', updated_at = now()
    where id = new.provider_id and (owner_id is null or owner_id = new.submitted_by);
    if not found then
      raise exception 'Listing was assigned to another owner' using errcode = '23505';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists assign_approved_claim_owner_trigger on public.verification_requests;
create trigger assign_approved_claim_owner_trigger
after update of status on public.verification_requests for each row
execute function public.assign_approved_claim_owner();
-- RLS decides who may update a booking; this trigger decides which fields that
-- actor may change, preventing customers from forging provider responses.
create or replace function public.protect_booking_actor_fields()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if auth.uid() = old.user_id and not public.owns_provider(old.provider_id) then
    if new.status <> 'cancelled'
       or new.provider_message is distinct from old.provider_message
       or new.responded_at is distinct from old.responded_at
       or new.user_id is distinct from old.user_id
       or new.provider_id is distinct from old.provider_id
       or new.service_id is distinct from old.service_id
       or new.requested_date is distinct from old.requested_date
       or new.requested_time is distinct from old.requested_time
       or new.notes is distinct from old.notes then
      raise exception 'Customers may only cancel their own booking' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists protect_booking_actor_fields_trigger on public.bookings;
create trigger protect_booking_actor_fields_trigger before update on public.bookings
for each row execute function public.protect_booking_actor_fields();
create or replace function public.validate_booking_service_provider()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if new.service_id is not null and not exists (
    select 1 from public.services where id = new.service_id and provider_id = new.provider_id
  ) then
    raise exception 'Selected service does not belong to this provider' using errcode = '23514';
  end if;
  return new;
end $$;
drop trigger if exists validate_booking_service_provider_trigger on public.bookings;
create trigger validate_booking_service_provider_trigger
before insert or update of provider_id, service_id on public.bookings
for each row execute function public.validate_booking_service_provider();
commit;
