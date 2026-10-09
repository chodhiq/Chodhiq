begin;
create function public.community_post_engagement_for_posts(requested_posts uuid[])
returns table(post_id uuid,like_count bigint,comment_count bigint,is_liked boolean)
language plpgsql stable security definer set search_path=pg_catalog,public as $$
begin
 if requested_posts is null or cardinality(requested_posts)=0 then return; end if;
 if cardinality(requested_posts)>100 then raise exception using errcode='22023',message='Request engagement for at most 100 posts'; end if;
 return query select p.id,
   (select count(*) from public.community_post_likes l where l.post_id=p.id),
   (select count(*) from public.community_comments c where c.post_id=p.id and c.status='published' and not public.community_users_blocked(auth.uid(),c.author_id)),
   exists(select 1 from public.community_post_likes l where l.post_id=p.id and l.user_id=auth.uid())
 from public.community_posts p join public.community_spaces s on s.id=p.community_id
 where p.id=any(requested_posts) and p.status='published'
   and (public.is_admin() or (s.status='active' and (s.visibility='public' or exists(select 1 from public.community_memberships m where m.space_id=s.id and m.user_id=auth.uid()))))
   and (public.is_admin() or not public.community_users_blocked(auth.uid(),p.author_id));
end $$;
revoke all on function public.community_post_engagement_for_posts(uuid[]) from public;
grant execute on function public.community_post_engagement_for_posts(uuid[]) to anon,authenticated;
commit;
