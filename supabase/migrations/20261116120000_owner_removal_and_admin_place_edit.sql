-- Owner removal reports and audited administration of curated place listings.

alter table public.provider_reports drop constraint if exists provider_reports_reason_check;
alter table public.provider_reports add constraint provider_reports_reason_check
  check (reason in ('incorrect_information','closed_business','fraud','other','owner_removal_request'));

-- Coordinates may be edited through the existing RPC by an admin, including
-- for ownerless places. Apply the dashboard's UK map bounds server-side too.
create or replace function public.set_provider_coordinates(
  target_provider uuid,
  latitude double precision,
  longitude double precision
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if latitude is null or longitude is null
    or latitude < 49 or latitude > 61
    or longitude < -9 or longitude > 2 then
    raise exception 'Valid provider coordinates are required' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.providers p
    where p.id = target_provider
      and (
        p.owner_id = auth.uid()
        or public.is_admin()
        or exists (
          select 1
          from public.verification_requests vr
          where vr.provider_id = p.id
            and vr.submitted_by = auth.uid()
            and vr.status in ('draft', 'pending', 'changes_requested')
        )
      )
  ) then
    raise exception 'Provider access required to update coordinates' using errcode = '42501';
  end if;

  update public.providers
  set base_location = public.st_setsrid(
    public.st_makepoint(longitude, latitude),
    4326
  )::public.geography,
  updated_at = now()
  where id = target_provider;
end;
$$;
revoke all on function public.set_provider_coordinates(uuid, double precision, double precision)
  from public, anon;
grant execute on function public.set_provider_coordinates(uuid, double precision, double precision)
  to authenticated;

create or replace function public.admin_hide_reported_listing(
  report_id uuid,
  expected_status text,
  expected_updated_at timestamptz,
  resolution_note text
) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  current_report public.provider_reports%rowtype;
  previous_provider jsonb;
  new_provider jsonb;
begin
  if not public.is_admin()
     or not public.admin_has_permission('reports.resolve') then
    raise exception using errcode = '42501', message = 'administrator permission required';
  end if;
  if length(trim(coalesce(resolution_note, ''))) < 8 then
    raise exception using errcode = '22023', message = 'resolution note must be at least 8 characters';
  end if;
  select * into current_report from public.provider_reports where id = report_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'report not found'; end if;
  -- provider_reports has no updated_at column; keep the parameter for caller compatibility.
  if current_report.status is distinct from expected_status then
    raise exception using errcode = '40001', message = 'report changed; reload and retry';
  end if;
  if current_report.status not in ('open', 'reviewing') then
    raise exception using errcode = '40001', message = 'report is already closed';
  end if;
  if current_report.reason <> 'owner_removal_request' then
    raise exception using errcode = '22023', message = 'report is not an owner removal request';
  end if;
  select to_jsonb(p) into previous_provider from public.providers p where p.id = current_report.provider_id for update;
  if previous_provider is null then raise exception using errcode = 'P0002', message = 'listing not found'; end if;
  update public.providers set is_listed = false, updated_at = now()
    where id = current_report.provider_id returning to_jsonb(providers) into new_provider;
  update public.provider_reports set status = 'resolved' where id = report_id;
  insert into public.admin_audit_log(admin_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'provider_report_hidden', 'provider_report', report_id,
    jsonb_build_object('source','admin_hide_reported_listing','reason',trim(resolution_note),
      'outcome','succeeded','target_type','provider','target_id',current_report.provider_id,
      'previous_values',jsonb_build_object('status',current_report.status,'provider',previous_provider),
      'new_values',jsonb_build_object('status','resolved','provider',new_provider),
      'correlation_id',gen_random_uuid()));
  return jsonb_build_object('ok',true,'status','resolved');
end;
$$;
revoke all on function public.admin_hide_reported_listing(uuid,text,timestamptz,text) from public, anon;
grant execute on function public.admin_hide_reported_listing(uuid,text,timestamptz,text) to authenticated;

create or replace function public.admin_update_place(provider_id uuid, changes jsonb, reason text)
returns jsonb
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  current_place public.providers%rowtype;
  saved_place public.providers%rowtype;
  allowed_keys text[] := array['business_name','category_id','street_address','base_postcode','base_city','phone','website','description','subcategory'];
  supplied_key text;
begin
  if not public.is_admin()
     or not public.admin_has_permission('providers.suspend') then
    raise exception using errcode = '42501', message = 'administrator permission required';
  end if;
  if length(trim(coalesce(reason,''))) < 8 then raise exception using errcode = '22023', message = 'reason must be at least 8 characters'; end if;
  if changes is null or jsonb_typeof(changes) <> 'object' or changes = '{}'::jsonb then
    raise exception using errcode = '22023', message = 'changes must be a non-empty object';
  end if;
  for supplied_key in select jsonb_object_keys(changes) loop
    if not supplied_key = any(allowed_keys) then
      raise exception using errcode = '22023', message = 'unsupported place field: ' || supplied_key;
    end if;
  end loop;
  if changes ? 'website' and nullif(trim(changes->>'website'),'') is not null
    and changes->>'website' !~* '^https://[^[:space:]]+$' then
    raise exception using errcode = '22023', message = 'website must use https';
  end if;
  if changes ? 'category_id' and changes->>'category_id' is not null
    and not exists(select 1 from public.categories c where c.id=(changes->>'category_id')::uuid and c.is_active) then
    raise exception using errcode = '22023', message = 'Choose an active category';
  end if;
  select * into current_place from public.providers where id=provider_id and listing_type='place' for update;
  if not found then raise exception using errcode = 'P0002', message = 'place listing not found'; end if;
  update public.providers set
    business_name = case when changes ? 'business_name' then changes->>'business_name' else business_name end,
    category_id = case when changes ? 'category_id' then nullif(changes->>'category_id','')::uuid else category_id end,
    street_address = case when changes ? 'street_address' then changes->>'street_address' else street_address end,
    base_postcode = case when changes ? 'base_postcode' then changes->>'base_postcode' else base_postcode end,
    base_city = case when changes ? 'base_city' then changes->>'base_city' else base_city end,
    phone = case when changes ? 'phone' then changes->>'phone' else phone end,
    website = case when changes ? 'website' then changes->>'website' else website end,
    description = case when changes ? 'description' then changes->>'description' else description end,
    subcategory = case when changes ? 'subcategory' then changes->>'subcategory' else subcategory end,
    updated_at = now()
  where id=provider_id returning * into saved_place;
  insert into public.admin_audit_log(admin_id,action,entity_type,entity_id,details)
  values(auth.uid(),'place_updated','provider',provider_id,
    jsonb_build_object('source','admin_update_place','reason',trim(reason),'outcome','succeeded',
      'previous_values',to_jsonb(current_place),'new_values',to_jsonb(saved_place),'correlation_id',gen_random_uuid()));
  return to_jsonb(saved_place);
end;
$$;
revoke all on function public.admin_update_place(uuid,jsonb,text) from public, anon;
grant execute on function public.admin_update_place(uuid,jsonb,text) to authenticated;
