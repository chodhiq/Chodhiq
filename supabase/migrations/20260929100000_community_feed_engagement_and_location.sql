alter table public.community_posts
  add column if not exists region_key text,
  add column if not exists location_city text;

alter table public.community_posts
  add constraint community_posts_region_key_check
  check (region_key is null or region_key in ('kerala','tamilnadu','karnataka','andhratelangana'));

create table if not exists public.community_post_likes (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.community_post_likes enable row level security;
create policy "Users read their own community likes" on public.community_post_likes
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Users like community posts" on public.community_post_likes
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Users remove their community likes" on public.community_post_likes
  for delete to authenticated using (user_id = (select auth.uid()));
grant select, insert, delete on public.community_post_likes to authenticated;

create table if not exists public.community_saved_posts (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.community_saved_posts enable row level security;
create policy "Users manage their own saved community posts" on public.community_saved_posts
  for all to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
grant select, insert, delete on public.community_saved_posts to authenticated;

create or replace function public.community_post_engagement()
returns table (post_id uuid, like_count bigint, comment_count bigint, is_liked boolean)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select p.id,
    (select count(*) from public.community_post_likes l where l.post_id = p.id),
    (select count(*) from public.community_comments c where c.post_id = p.id),
    exists (select 1 from public.community_post_likes l where l.post_id = p.id and l.user_id = (select auth.uid()))
  from public.community_posts p
  where p.status = 'published';
$$;
revoke all on function public.community_post_engagement() from public;
grant execute on function public.community_post_engagement() to anon, authenticated;

create index if not exists community_posts_city_created_idx
  on public.community_posts(location_city, created_at desc) where status = 'published';
create index if not exists community_posts_region_created_idx
  on public.community_posts(region_key, created_at desc) where status = 'published';
