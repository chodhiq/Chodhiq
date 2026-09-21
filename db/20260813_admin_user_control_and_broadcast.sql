begin;

create table if not exists public.user_moderation_status (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active','suspended')),
  reason text not null check (char_length(reason) between 5 and 500),
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now()
);
alter table public.user_moderation_status enable row level security;
drop policy if exists "Admins manage user moderation status" on public.user_moderation_status;
create policy "Admins manage user moderation status" on public.user_moderation_status
for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.user_moderation_status to authenticated;

create or replace function public.admin_broadcast_notification(message_title text, message_body text)
returns integer language plpgsql security definer
set search_path = pg_catalog, public as $$
declare inserted_count integer;
begin
  if not public.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
  if char_length(trim(message_title)) not between 3 and 100 then raise exception 'Title must be 3 to 100 characters'; end if;
  if char_length(trim(message_body)) not between 5 and 500 then raise exception 'Message must be 5 to 500 characters'; end if;
  insert into public.notifications(user_id,title,body)
  select id, trim(message_title), trim(message_body) from auth.users where banned_until is null or banned_until < now();
  get diagnostics inserted_count = row_count;
  return inserted_count;
end $$;
revoke all on function public.admin_broadcast_notification(text,text) from public, anon;
grant execute on function public.admin_broadcast_notification(text,text) to authenticated;

commit;
