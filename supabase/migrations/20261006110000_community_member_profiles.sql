begin;
-- Return only community identity. Never expose contact details or account controls.
create function public.get_community_member_profile(target_author uuid)
returns table(author_id uuid,display_name text,avatar_url text,joined_year integer)
language sql stable security definer set search_path=pg_catalog,public as $$
 select p.id,coalesce(nullif(trim(p.full_name),''),'Community member'),p.avatar_url,extract(year from p.created_at)::integer
 from public.profiles p
 where p.id=target_author and (
   p.id=auth.uid() or public.is_admin() or (
     not public.community_users_blocked(auth.uid(),p.id)
     and exists (
       select 1 from public.community_posts post join public.community_spaces space on space.id=post.community_id
       where post.author_id=p.id and post.status='published' and space.status='active'
       and (space.visibility='public' or exists(select 1 from public.community_memberships member where member.space_id=space.id and member.user_id=auth.uid()))
     )
   )
 );
$$;
revoke all on function public.get_community_member_profile(uuid) from public;
grant execute on function public.get_community_member_profile(uuid) to anon,authenticated;
commit;
