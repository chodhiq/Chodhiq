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
    or latitude < -90 or latitude > 90
    or longitude < -180 or longitude > 180 then
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

update public.providers
set base_location = public.st_setsrid(
  public.st_makepoint(-0.144796, 51.497329),
  4326
)::public.geography,
updated_at = now()
where business_name = 'DRD'
  and base_city = 'London'
  and regexp_replace(upper(coalesce(base_postcode, '')), '[^A-Z0-9]', '', 'g') = 'SW1W0RH'
  and base_location is null;
