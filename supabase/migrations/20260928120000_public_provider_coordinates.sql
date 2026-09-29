-- Public discovery already exposes providers that pass the providers RLS
-- policy. Return only their ids and coordinates so the mobile app can compute
-- accurate distances without granting direct access to the PostGIS column.
create or replace function public.public_provider_coordinates()
returns table (id uuid, latitude double precision, longitude double precision)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select p.id, st_y(p.base_location::geometry), st_x(p.base_location::geometry)
  from public.providers p
  where p.base_location is not null;
$$;

revoke all on function public.public_provider_coordinates() from public;
grant execute on function public.public_provider_coordinates() to anon, authenticated;
