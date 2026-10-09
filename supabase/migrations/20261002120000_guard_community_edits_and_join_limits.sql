begin;
-- Inserts retain the promotion entitlement trigger; edits cannot change the
-- billing identity, author, destination, or creation time of an existing post.
create or replace function public.guard_community_post_edit()
returns trigger language plpgsql
set search_path = pg_catalog, public
as $$
begin
  -- Trusted server writers and authorized moderation RPCs retain their paths.
  if current_user not in ('anon','authenticated') or public.is_admin() then return new; end if;
  if new.id is distinct from old.id or new.author_id is distinct from old.author_id
     or new.community_id is distinct from old.community_id
     or new.provider_id is distinct from old.provider_id
     or new.post_type is distinct from old.post_type
     or new.created_at is distinct from old.created_at
     or new.status is distinct from old.status
     or old.status <> 'published' then
    raise exception using errcode='42501',message='Community edits cannot change post identity, promotion type, or moderation status';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_community_post_edit() from public,anon,authenticated;
create trigger guard_community_post_edit before update on public.community_posts
for each row execute function public.guard_community_post_edit();

-- General automatically ensures membership on each post/comment. An existing
-- membership is not a new join and must not exhaust the daily join allowance.
create or replace function public.prepare_community_membership()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, auth
as $$
begin
  if not public.is_admin()
     and (auth.uid() is null or new.user_id is distinct from auth.uid() or new.role <> 'member') then
    raise exception using errcode='42501',message='Community memberships must be created by the joining member';
  end if;
  if not public.is_admin() and not exists (
    select 1 from public.community_memberships m where m.space_id=new.space_id and m.user_id=new.user_id
  ) then
    perform public.consume_community_rate_limit(new.user_id,'membership_24h',20,86400);
  end if;
  return new;
end;
$$;
revoke all on function public.prepare_community_membership() from public,anon,authenticated;
commit;
