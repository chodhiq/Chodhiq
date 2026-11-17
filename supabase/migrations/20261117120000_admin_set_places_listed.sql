-- Publish or hide curated place listings in one audited admin operation.
create or replace function public.admin_set_places_listed(
  provider_ids uuid[],
  listed boolean,
  reason text
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  changed_count integer;
  previous_values jsonb;
  new_values jsonb;
begin
  if not public.is_admin()
     or not public.admin_has_permission('providers.suspend') then
    raise exception using errcode = '42501', message = 'administrator permission required';
  end if;

  if provider_ids is null or cardinality(provider_ids) > 200 then
    raise exception using errcode = '22023', message = 'at most 200 place ids may be submitted';
  end if;
  if listed is null then
    raise exception using errcode = '22023', message = 'listed must be provided';
  end if;
  if length(trim(coalesce(reason, ''))) < 8 then
    raise exception using errcode = '22023', message = 'reason must be at least 8 characters';
  end if;

  with changed as (
    update public.providers p
    set is_listed = admin_set_places_listed.listed,
        updated_at = now()
    where p.id = any(provider_ids)
      and p.listing_type = 'place'
      and p.is_listed is distinct from admin_set_places_listed.listed
    returning p.id, p.is_listed
  )
  select count(*)::integer,
         coalesce(jsonb_agg(jsonb_build_object('id', id, 'is_listed', not is_listed)), '[]'::jsonb),
         coalesce(jsonb_agg(jsonb_build_object('id', id, 'is_listed', is_listed)), '[]'::jsonb)
  into changed_count, previous_values, new_values
  from changed;

  insert into public.admin_audit_log(admin_id, action, entity_type, entity_id, details)
  values (
    auth.uid(),
    case when listed then 'places_published' else 'places_hidden' end,
    'provider',
    null,
    jsonb_build_object(
      'source', 'admin_set_places_listed',
      'reason', trim(reason),
      'outcome', 'succeeded',
      'count', changed_count,
      'previous_values', previous_values,
      'new_values', new_values,
      'correlation_id', gen_random_uuid()
    )
  );

  return changed_count;
end;
$$;

revoke all on function public.admin_set_places_listed(uuid[], boolean, text)
  from public, anon;
grant execute on function public.admin_set_places_listed(uuid[], boolean, text)
  to authenticated;
