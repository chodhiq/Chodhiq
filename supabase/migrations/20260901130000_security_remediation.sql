begin;

-- Canonical moderation state used by both the admin UI and trusted control function.
create table if not exists public.user_moderation_status (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'suspended')),
  reason text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
alter table public.user_moderation_status enable row level security;
drop policy if exists "Admins view user moderation" on public.user_moderation_status;
create policy "Admins view user moderation" on public.user_moderation_status
for select to authenticated using (public.is_admin());
revoke all on public.user_moderation_status from public, anon, authenticated;
grant select on public.user_moderation_status to authenticated;

-- The Edge Function has already changed Auth by this point. Persist the matching
-- database state and audit entry in one transaction or fail the whole RPC.
create or replace function public.record_user_moderation_change(
  target_user_id uuid,
  next_status text,
  moderation_reason text,
  actor_user_id uuid,
  request_id uuid,
  previous_status text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if next_status not in ('active', 'suspended')
    or previous_status not in ('active', 'suspended')
    or char_length(trim(moderation_reason)) not between 8 and 500 then
    raise exception 'Invalid moderation change' using errcode = '22023';
  end if;
  if not exists (
    select 1 from auth.users
    where id = actor_user_id and raw_app_meta_data ->> 'role' = 'admin'
  ) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  insert into public.user_moderation_status(user_id, status, reason, updated_by, updated_at)
  values(target_user_id, next_status, trim(moderation_reason), actor_user_id, now())
  on conflict(user_id) do update
  set status = excluded.status,
      reason = excluded.reason,
      updated_by = excluded.updated_by,
      updated_at = excluded.updated_at;

  insert into public.admin_audit_log(admin_id, action, entity_type, entity_id, details)
  values(
    actor_user_id,
    'user_' || next_status,
    'user',
    target_user_id::text,
    jsonb_build_object(
      'reason', trim(moderation_reason),
      'source', 'admin_user_control',
      'idempotency_key', request_id,
      'previous_values', jsonb_build_object('status', previous_status),
      'new_values', jsonb_build_object('status', next_status)
    )
  );
end;
$$;
revoke all on function public.record_user_moderation_change(uuid,text,text,uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.record_user_moderation_change(uuid,text,text,uuid,uuid,text) to service_role;

-- Client-side analytics writes are replaced by a validated, rate-limited Edge Function.
drop policy if exists "Clients record MVP events" on public.mvp_events;
revoke insert on public.mvp_events from anon, authenticated;

-- Remove older client-callable moderation RPC now that Auth and database state are
-- coordinated through admin-user-control.
revoke all on function public.admin_set_user_moderation(text,text,text) from public, anon, authenticated;

alter table public.providers drop constraint if exists providers_website_https;
alter table public.providers add constraint providers_website_https
check (website is null or website ~* '^https://[a-z0-9][a-z0-9.-]+(?::[0-9]{1,5})?(?:[/?#].*)?$') not valid;

-- Apply one resolution rule to every privileged function, including historical
-- functions that previously trusted public or pg_temp ahead of system objects.
do $$
declare function_signature regprocedure;
begin
  for function_signature in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and not exists (
        select 1
        from pg_depend d
        join pg_extension e on e.oid = d.refobjid
        where d.classid = 'pg_proc'::regclass
          and d.objid = p.oid
          and d.deptype = 'e'
      )
  loop
    execute format('alter function %s set search_path = pg_catalog, public', function_signature);
  end loop;
end $$;

commit;
