-- Read-only structural audit. Run in staging before the role/fixture RLS audit.
-- Fails when an API-exposed table lacks RLS, privileged functions have unsafe
-- search paths, or anonymous/authenticated roles retain direct access to
-- security-control tables.

do $$
declare failures text;
begin
  select string_agg(format('%I.%I', n.nspname, c.relname), ', ')
  into failures
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'storage')
    and c.relkind in ('r', 'p')
    and not c.relrowsecurity
    and c.relname not in ('schema_migrations', 'spatial_ref_sys');
  if failures is not null then
    raise exception 'API tables without RLS: %', failures;
  end if;

  select string_agg(format('%I.%I', n.nspname, p.proname), ', ')
  into failures
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef
    and not exists (
      select 1 from unnest(coalesce(p.proconfig, array[]::text[])) setting
      where setting = 'search_path=' or setting ~ '^search_path=pg_catalog, ?public$'
    );
  if failures is not null then
    raise exception 'Security-definer functions with unapproved search_path: %', failures;
  end if;

  if has_table_privilege('anon', 'public.edge_rate_limits', 'select,insert,update,delete')
    or has_table_privilege('authenticated', 'public.edge_rate_limits', 'select,insert,update,delete') then
    raise exception 'Client roles can access edge_rate_limits';
  end if;
  if has_table_privilege('anon', 'public.user_moderation_status', 'insert,update,delete')
    or has_table_privilege('authenticated', 'public.user_moderation_status', 'insert,update,delete') then
    raise exception 'Client roles can mutate user_moderation_status';
  end if;
  if has_table_privilege('anon', 'public.mvp_events', 'insert')
    or has_table_privilege('authenticated', 'public.mvp_events', 'insert') then
    raise exception 'Client roles can bypass analytics ingestion controls';
  end if;
end $$;

select 'Structural security posture audit passed' as result;
