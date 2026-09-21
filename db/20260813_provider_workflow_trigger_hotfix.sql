begin;

create or replace function public.protect_provider_security_fields()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  if current_setting('chodhiq.provider_workflow', true) = 'claim'
     and old.owner_id is null
     and coalesce(old.is_claimed, false) = false
     and new.owner_id = auth.uid()
     and new.is_claimed = true
     and new.verification_status = 'unverified'
     and new.is_verified is not distinct from old.is_verified then
    null;
  elsif current_setting('chodhiq.provider_workflow', true) = 'submit_verification'
     and old.owner_id = auth.uid()
     and new.owner_id is not distinct from old.owner_id
     and new.is_claimed is not distinct from old.is_claimed
     and new.is_verified is not distinct from old.is_verified
     and new.verification_status = 'pending' then
    null;
  elsif not public.is_admin() and (
    new.owner_id is distinct from old.owner_id or
    new.is_verified is distinct from old.is_verified or
    new.is_claimed is distinct from old.is_claimed or
    new.verification_status is distinct from old.verification_status
  ) then
    raise exception 'Protected provider fields require administrator access' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end
$$;

create or replace function public.claim_imported_provider(target_provider uuid)
returns public.providers
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare claimed public.providers;
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
  set owner_id=auth.uid(), is_claimed=true, verification_status='unverified', updated_at=now()
  where id=target_provider and owner_id is null and is_claimed=false and source_profile_id is not null
  returning * into claimed;
  if claimed.id is null then
    raise exception 'Listing is unavailable or has already been claimed' using errcode = 'P0002';
  end if;
  return claimed;
end
$$;

create or replace function public.submit_provider_verification(target_provider uuid, request_notes text default null)
returns uuid
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare request_uuid uuid;
begin
  if not exists (select 1 from public.providers where id=target_provider and owner_id=auth.uid()) then
    raise exception 'You do not own this provider' using errcode = '42501';
  end if;
  perform set_config('chodhiq.provider_workflow', 'submit_verification', true);
  select id into request_uuid from public.verification_requests
  where provider_id=target_provider and submitted_by=auth.uid()
    and status in ('draft','changes_requested') order by submitted_at desc limit 1;
  if request_uuid is null then
    insert into public.verification_requests(provider_id,submitted_by,status,notes)
    values(target_provider,auth.uid(),'draft',request_notes) returning id into request_uuid;
  end if;
  if not exists (select 1 from public.verification_documents where request_id=request_uuid) then
    raise exception 'Upload at least one verification document first' using errcode = '23514';
  end if;
  update public.verification_requests
  set status='pending', notes=coalesce(request_notes,notes), submitted_at=now(), reviewed_at=null, reviewed_by=null
  where id=request_uuid;
  update public.providers set verification_status='pending', updated_at=now() where id=target_provider;
  return request_uuid;
end
$$;

revoke all on function public.claim_imported_provider(uuid) from public;
grant execute on function public.claim_imported_provider(uuid) to authenticated;
revoke all on function public.submit_provider_verification(uuid,text) from public;
grant execute on function public.submit_provider_verification(uuid,text) to authenticated;

commit;
