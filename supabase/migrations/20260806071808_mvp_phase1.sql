-- Phase 1 launch additions. Safe to apply after schema.sql.

create table if not exists public.provider_reports (
  id uuid primary key default uuid_generate_v4(),
  reporter_id uuid references auth.users(id) on delete set null,
  provider_id uuid references public.providers(id) on delete cascade not null,
  reason text not null,
  details text,
  status text default 'open',
  created_at timestamptz default now()
);

alter table public.provider_reports enable row level security;

do $$ begin
  create policy "Users submit provider reports" on public.provider_reports
    for insert with check ((select auth.uid()) = reporter_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users create their own profile" on public.profiles
    for insert with check ((select auth.uid()) = id);
exception when duplicate_object then null;
end $$;

create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz default now()
);

alter table public.notifications enable row level security;

do $$ begin
  create policy "Users read their own notifications" on public.notifications
    for select using ((select auth.uid()) = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users update their own notifications" on public.notifications
    for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
exception when duplicate_object then null;
end $$;

create index if not exists provider_reports_provider_idx on public.provider_reports(provider_id);
create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);
;
