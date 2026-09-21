-- Emergency remediation for Supabase Security Advisor:
-- rls_disabled_in_public
--
-- Safe to run more than once. Existing RLS policies are not changed.
-- Any public table that does not already use RLS becomes deny-by-default for
-- requests made through PostgREST with the anon/authenticated roles. Backend
-- jobs using the service role continue to bypass RLS.

begin;

do $block$
declare
  exposed_table record;
begin
  for exposed_table in
    select n.nspname as schema_name, c.relname as table_name
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not c.relrowsecurity
      -- Skip extension/system tables such as PostGIS spatial_ref_sys. Only
      -- an owner may alter a table, and those tables are managed separately.
      and pg_catalog.pg_get_userbyid(c.relowner) = current_user
  loop
    execute format(
      'alter table %I.%I enable row level security',
      exposed_table.schema_name,
      exposed_table.table_name
    );

    raise notice 'Enabled RLS on %.%',
      exposed_table.schema_name,
      exposed_table.table_name;
  end loop;
end
$block$;

commit;

-- Verification: this query must return zero rows after the transaction.
select n.nspname as schema_name, c.relname as table_name
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
  and not c.relrowsecurity
  and pg_catalog.pg_get_userbyid(c.relowner) = current_user
order by c.relname;
