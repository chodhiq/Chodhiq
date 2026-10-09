-- Keep aggregate reads inside the same space boundaries as the feed.
create or replace function public.community_post_engagement()
returns table (post_id uuid, like_count bigint, comment_count bigint, is_liked boolean)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select p.id,
    (select count(*) from public.community_post_likes l where l.post_id = p.id),
    (select count(*) from public.community_comments c where c.post_id = p.id and c.status = 'published'
      and not public.community_users_blocked((select auth.uid()), c.author_id)),
    exists (select 1 from public.community_post_likes l where l.post_id = p.id and l.user_id = (select auth.uid()))
  from public.community_posts p
  join public.community_spaces s on s.id = p.community_id
  where p.status = 'published'
    and (public.is_admin() or (s.status = 'active' and (s.visibility = 'public' or exists (
      select 1 from public.community_memberships m where m.space_id = s.id and m.user_id = (select auth.uid())
    ))))
    and (public.is_admin() or not public.community_users_blocked((select auth.uid()), p.author_id));
$$;
revoke all on function public.community_post_engagement() from public;
grant execute on function public.community_post_engagement() to anon, authenticated;

-- Reactions and bookmarks must target a post visible to the caller.
drop policy if exists "Community votes require readable published posts" on public.community_post_likes;
create policy "Community votes require readable published posts"
on public.community_post_likes as restrictive for insert to authenticated
with check (exists (select 1 from public.community_posts p where p.id = post_id and p.status = 'published'));
drop policy if exists "Community saves require readable published posts" on public.community_saved_posts;
create policy "Community saves require readable published posts"
on public.community_saved_posts as restrictive for insert to authenticated
with check (exists (select 1 from public.community_posts p where p.id = post_id and p.status = 'published'));

-- A narrowly scoped lookup avoids spaces -> memberships -> spaces RLS recursion.
create or replace function public.community_has_membership(target_space uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, public, auth
as $$
  select exists (select 1 from public.community_memberships m
    where m.space_id = target_space and m.user_id = (select auth.uid()));
$$;
revoke all on function public.community_has_membership(uuid) from public, anon;
grant execute on function public.community_has_membership(uuid) to authenticated;
drop policy "Members read their private community spaces" on public.community_spaces;
create policy "Members read their private community spaces" on public.community_spaces
for select to authenticated
using (public.is_admin() or public.community_has_membership(id));
