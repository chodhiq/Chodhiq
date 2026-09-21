-- Shared owner predicate required by later booking, claim, and dashboard policies.
create or replace function public.owns_provider(target_provider uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.providers
    where id = target_provider
      and owner_id = auth.uid()
  )
$$;
revoke all on function public.owns_provider(uuid) from public, anon;
grant execute on function public.owns_provider(uuid) to authenticated;
