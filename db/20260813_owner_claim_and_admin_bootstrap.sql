-- Safe owner claiming, verification submission invariants, and admin bootstrap.
-- Replace the bootstrap UUID before running this migration, or run only the
-- documented update statement separately through the Supabase SQL editor.

begin;

-- The onboarding client filters imported rows by this non-secret identifier.
grant select (source_profile_id) on public.providers to authenticated;

create unique index if not exists verification_one_open_request_per_provider_idx
  on public.verification_requests (provider_id)
  where status in ('draft', 'pending', 'changes_requested');

create or replace function public.require_verification_evidence()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if new.status = 'pending' and (tg_op = 'INSERT' or old.status is distinct from 'pending')
     and not exists (select 1 from public.verification_documents where request_id = new.id) then
    raise exception 'Upload at least one verification document first' using errcode = '23514';
  end if;
  return new;
end $$;

drop trigger if exists require_verification_evidence_trigger on public.verification_requests;
create constraint trigger require_verification_evidence_trigger
after insert or update of status on public.verification_requests
deferrable initially deferred for each row execute function public.require_verification_evidence();

create or replace function public.claim_imported_provider(target_provider uuid)
returns public.providers
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  claimed public.providers;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  perform set_config('chodhiq.provider_workflow', 'claim', true);
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  if exists (select 1 from public.providers where owner_id = auth.uid()) then
    raise exception 'This account already has a business workspace' using errcode = '23505';
  end if;

  update public.providers
  set owner_id = auth.uid(), is_claimed = true,
      verification_status = 'unverified', updated_at = now()
  where id = target_provider
    and owner_id is null
    and is_claimed = false
    and source_profile_id is not null
  returning * into claimed;

  if claimed.id is null then
    raise exception 'Listing is unavailable or has already been claimed' using errcode = 'P0002';
  end if;
  return claimed;
end
$$;

revoke all on function public.claim_imported_provider(uuid) from public;
grant execute on function public.claim_imported_provider(uuid) to authenticated;

create or replace function public.list_claimable_providers()
returns table(id uuid, business_name text, base_city text, base_postcode text)
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select p.id, p.business_name, p.base_city, p.base_postcode
  from public.providers p
  where p.owner_id is null
    and coalesce(p.is_claimed, false) = false
    and p.source_profile_id is not null
  order by p.business_name
  limit 100
$$;

revoke all on function public.list_claimable_providers() from public;
grant execute on function public.list_claimable_providers() to authenticated;

create or replace function public.submit_provider_verification(target_provider uuid, request_notes text default null)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare request_uuid uuid;
begin
  if not exists (select 1 from public.providers where id = target_provider and owner_id = auth.uid()) then
    raise exception 'You do not own this provider' using errcode = '42501';
  end if;
  perform set_config('chodhiq.provider_workflow', 'submit_verification', true);
  select id into request_uuid from public.verification_requests
    where provider_id = target_provider and submitted_by = auth.uid()
      and status in ('draft', 'changes_requested') order by submitted_at desc limit 1;
  if request_uuid is null then
    insert into public.verification_requests(provider_id, submitted_by, status, notes)
      values(target_provider, auth.uid(), 'draft', request_notes) returning id into request_uuid;
  end if;
  if not exists (select 1 from public.verification_documents where request_id = request_uuid) then
    raise exception 'Upload at least one verification document first' using errcode = '23514';
  end if;
  update public.verification_requests set status='pending', notes=coalesce(request_notes, notes), submitted_at=now(), reviewed_at=null, reviewed_by=null
    where id=request_uuid;
  update public.providers set verification_status='pending', updated_at=now() where id=target_provider;
  return request_uuid;
end
$$;

revoke all on function public.submit_provider_verification(uuid, text) from public;
grant execute on function public.submit_provider_verification(uuid, text) to authenticated;

commit;

-- ONE-TIME ADMIN BOOTSTRAP (run separately; never ship a service-role key):
-- update auth.users
-- set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
--   || '{"role":"admin"}'::jsonb
-- where id = '<ADMIN_USER_UUID>'::uuid;
-- The user must sign out and back in so the refreshed JWT contains the role.
