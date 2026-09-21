begin;
create table if not exists public.app_error_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null default auth.uid(),
  message text not null check (char_length(message) between 1 and 1000),
  error_name text not null check (char_length(error_name) between 1 and 100),
  platform text not null check (platform in ('ios','android','web','windows','macos','unknown')),
  app_area text not null check (char_length(app_area) between 1 and 100),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.app_error_events enable row level security;
drop policy if exists "Users submit own error events" on public.app_error_events;
create policy "Users submit own error events" on public.app_error_events for insert to authenticated
with check (user_id = auth.uid());
drop policy if exists "Admins read error events" on public.app_error_events;
create policy "Admins read error events" on public.app_error_events for select to authenticated using (public.is_admin());
grant insert on public.app_error_events to authenticated;
grant select on public.app_error_events to authenticated;
grant usage, select on sequence public.app_error_events_id_seq to authenticated;
create index if not exists app_error_events_created_idx on public.app_error_events(created_at desc);
create or replace function public.protect_provider_security_fields()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if current_setting('chodhiq.provider_workflow', true) = 'claim'
     and old.owner_id is null and coalesce(old.is_claimed, false) = false
     and new.owner_id = auth.uid() and new.is_claimed = true
     and new.verification_status = 'unverified' and new.is_verified is not distinct from old.is_verified then
    null;
  elsif current_setting('chodhiq.provider_workflow', true) = 'submit_verification'
     and old.owner_id = auth.uid() and new.owner_id is not distinct from old.owner_id
     and new.is_claimed is not distinct from old.is_claimed
     and new.is_verified is not distinct from old.is_verified and new.verification_status = 'pending' then
    null;
  elsif current_setting('chodhiq.provider_workflow', true) = 'account_deletion'
     and new.owner_id is null and new.is_claimed = false
     and new.is_verified = false and new.verification_status = 'unverified' then
    null;
  elsif not public.is_admin() and (
    new.owner_id is distinct from old.owner_id or new.is_verified is distinct from old.is_verified
    or new.is_claimed is distinct from old.is_claimed
    or new.verification_status is distinct from old.verification_status
  ) then
    raise exception 'Protected provider fields require administrator access' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end $$;
create or replace function public.prepare_account_deletion(target_user uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if auth.role() <> 'service_role' then raise exception 'Service role required' using errcode = '42501'; end if;
  perform set_config('chodhiq.provider_workflow', 'account_deletion', true);
  update public.providers set owner_id = null, is_claimed = false, is_verified = false,
    verification_status = 'unverified', updated_at = now()
  where owner_id = target_user and source_profile_id is not null;
  delete from public.providers where owner_id = target_user and source_profile_id is null;
  update public.profiles set expo_push_token = null, push_token_updated_at = now() where id = target_user;
end $$;
revoke all on function public.prepare_account_deletion(uuid) from public, anon, authenticated;
grant execute on function public.prepare_account_deletion(uuid) to service_role;
commit;
