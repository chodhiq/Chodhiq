create table if not exists public.app_config (
  config_key text primary key,
  config_value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.app_config enable row level security;

drop policy if exists "Public can read app config" on public.app_config;
create policy "Public can read app config"
  on public.app_config
  for select
  to anon, authenticated
  using (config_key = 'button_kill_switches');

revoke all on public.app_config from public, anon, authenticated;
grant select on public.app_config to anon, authenticated;

insert into public.app_config (config_key, config_value)
values ('button_kill_switches', '{"disabled_buttons": {}}'::jsonb)
on conflict (config_key) do nothing;
