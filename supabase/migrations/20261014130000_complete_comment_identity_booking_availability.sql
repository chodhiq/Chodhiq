begin;

-- Community profile details are visible when the member is the author of a
-- readable published post or comment. Contact details remain private.
create or replace function public.get_community_member_profile(target_author uuid)
returns table(author_id uuid, display_name text, avatar_url text, joined_year integer)
language sql stable security definer set search_path = pg_catalog, public as $$
  select
    p.id,
    coalesce(nullif(trim(p.full_name), ''), 'Community member'),
    p.avatar_url,
    extract(year from p.created_at)::integer
  from public.profiles p
  where p.id = target_author
    and (
      p.id = auth.uid()
      or public.is_admin()
      or (
        not public.community_users_blocked(auth.uid(), p.id)
        and (
          exists (
            select 1
            from public.community_posts post
            join public.community_spaces space on space.id = post.community_id
            where post.author_id = p.id
              and post.status = 'published'
              and space.status = 'active'
              and (
                space.visibility = 'public'
                or exists (
                  select 1 from public.community_memberships member
                  where member.space_id = space.id and member.user_id = auth.uid()
                )
              )
          )
          or exists (
            select 1
            from public.community_comments comment
            join public.community_posts post on post.id = comment.post_id
            join public.community_spaces space on space.id = post.community_id
            where comment.author_id = p.id
              and comment.status = 'published'
              and post.status = 'published'
              and space.status = 'active'
              and (
                space.visibility = 'public'
                or exists (
                  select 1 from public.community_memberships member
                  where member.space_id = space.id and member.user_id = auth.uid()
                )
              )
          )
        )
      )
    );
$$;
revoke all on function public.get_community_member_profile(uuid) from public;
grant execute on function public.get_community_member_profile(uuid) to anon, authenticated;

-- Expose only confirmed times for a public provider; never return booking or
-- customer identifiers to marketplace visitors.
create or replace function public.get_confirmed_booking_slots(
  target_provider uuid,
  target_date date
)
returns table(requested_time time without time zone)
language sql stable security definer set search_path = pg_catalog, public as $$
  select booking.requested_time
  from public.bookings booking
  where booking.provider_id = target_provider
    and booking.requested_date = target_date
    and booking.status = 'confirmed'
    and exists (select 1 from public.providers provider where provider.id = target_provider)
  order by booking.requested_time;
$$;
revoke all on function public.get_confirmed_booking_slots(uuid, date) from public;
grant execute on function public.get_confirmed_booking_slots(uuid, date) to anon, authenticated;

commit;
