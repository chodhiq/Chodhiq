-- ChodhiQ admin dashboard Phase 5 production SQL handoff.
-- These migrations were replayed on the local Supabase database and passed
-- the repository database test suite (208 assertions). Apply each section in
-- order using the hosted SQL editor. This file was not run against production.

-- Migration 20261011120000_community_actor_names_in_notifications.sql
begin;

create or replace function public.notify_new_community_post()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare space public.community_spaces%rowtype; actor_name text;
begin
  if new.status <> 'published' then return new; end if;
  if tg_op='UPDATE' and old.status='published' then return new; end if;
  select * into space from public.community_spaces where id=new.community_id and status='active';
  if not found then return new; end if;
  select coalesce(nullif(trim(full_name),''),'A community member') into actor_name
  from public.profiles where id=new.author_id;
  insert into public.notifications(user_id,title,body,type,entity_type,entity_id)
  select p.id,'New post in ' || space.name,actor_name || ' shared a new post.',
    'community_post','community_post',new.id::text
  from public.profiles p
  where p.id<>new.author_id
    and not public.community_users_blocked(p.id,new.author_id)
    and (space.slug='general' and space.visibility='public'
      or exists(select 1 from public.community_memberships m where m.space_id=space.id and m.user_id=p.id))
    and not exists(select 1 from public.notifications n where n.user_id=p.id and n.entity_type='community_post' and n.entity_id=new.id::text);
  return new;
end $$;

create or replace function public.notify_community_engagement()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare owner_id uuid; parent_author uuid; actor_name text;
begin
  if tg_table_name='community_post_likes' then
    select author_id into owner_id from public.community_posts where id=new.post_id;
    select coalesce(nullif(trim(full_name),''),'A community member') into actor_name from public.profiles where id=new.user_id;
    perform public.send_community_activity_notification(new.post_id,owner_id,new.user_id,actor_name||' liked your post',actor_name||' liked your community post.','community_like','like:'||new.post_id||':'||new.user_id);
  else
    if new.status<>'published' then return new; end if;
    select author_id into owner_id from public.community_posts where id=new.post_id;
    select coalesce(nullif(trim(full_name),''),'A community member') into actor_name from public.profiles where id=new.author_id;
    perform public.send_community_activity_notification(new.post_id,owner_id,new.author_id,'New comment on your post',actor_name||' commented on your community post.','community_comment','comment:'||new.id);
    if new.parent_comment_id is not null then
      select author_id into parent_author from public.community_comments where id=new.parent_comment_id and post_id=new.post_id and status='published';
      if parent_author is distinct from owner_id then
        perform public.send_community_activity_notification(new.post_id,parent_author,new.author_id,'New reply to your comment',actor_name||' replied to your community comment.','community_reply','comment:'||new.id);
      end if;
    end if;
  end if;
  return new;
end $$;

commit;

-- Migration 20261011133000_quote_opened_status.sql
alter table public.quote_requests
  drop constraint if exists quote_request_status_allowed;
alter table public.quote_requests
  add constraint quote_request_status_allowed
  check (status in ('opened', 'sent', 'viewed', 'responded', 'closed')) not valid;

create or replace function public.respond_to_quote(
  target_quote uuid,
  expected_status text,
  response_text text
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  current_quote public.quote_requests%rowtype;
  clean_response text := trim(coalesce(response_text, ''));
begin
  if expected_status not in ('opened', 'sent', 'viewed')
    or length(clean_response) not between 2 and 2000 then
    raise exception using errcode = '22023', message = 'invalid quote response';
  end if;
  select * into current_quote from public.quote_requests where id = target_quote for update;
  if not found then raise exception using errcode = 'P0002', message = 'quote request not found'; end if;
  if not public.owns_provider(current_quote.provider_id) then
    raise exception using errcode = '42501', message = 'provider owner required';
  end if;
  if current_quote.status <> expected_status then
    raise exception using errcode = '40001', message = 'quote request changed; reload and retry';
  end if;
  update public.quote_requests
    set status = 'responded', response_message = clean_response, responded_at = now()
    where id = target_quote;
  return jsonb_build_object('ok', true, 'status', 'responded');
end;
$$;
revoke all on function public.respond_to_quote(uuid, text, text) from public;
grant execute on function public.respond_to_quote(uuid, text, text) to authenticated;

-- Migration 20261014120000_guard_confirmed_booking_slots.sql
begin;
create or replace function public.prevent_confirmed_booking_slot_conflicts()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if new.status = 'confirmed' and exists (
    select 1 from public.bookings existing
    where existing.provider_id = new.provider_id
      and existing.requested_date = new.requested_date
      and existing.requested_time = new.requested_time
      and existing.status = 'confirmed'
      and existing.id is distinct from new.id
  ) then
    raise exception using errcode = '23P01', message = 'This time is already booked. Choose a different date or time.';
  end if;
  return new;
end;
$$;
revoke all on function public.prevent_confirmed_booking_slot_conflicts() from public, anon, authenticated;
drop trigger if exists prevent_confirmed_booking_slot_conflicts_trigger on public.bookings;
create trigger prevent_confirmed_booking_slot_conflicts_trigger
before insert or update of provider_id, requested_date, requested_time, status
on public.bookings for each row execute function public.prevent_confirmed_booking_slot_conflicts();
create unique index if not exists bookings_confirmed_provider_slot_key
on public.bookings(provider_id, requested_date, requested_time) where status = 'confirmed';
commit;

-- Migration 20261014130000_complete_comment_identity_booking_availability.sql
begin;
create or replace function public.get_community_member_profile(target_author uuid)
returns table(author_id uuid, display_name text, avatar_url text, joined_year integer)
language sql stable security definer set search_path = pg_catalog, public as $$
  select p.id, coalesce(nullif(trim(p.full_name), ''), 'Community member'), p.avatar_url,
    extract(year from p.created_at)::integer
  from public.profiles p
  where p.id = target_author and (
    p.id = auth.uid() or public.is_admin() or (
      not public.community_users_blocked(auth.uid(), p.id) and (
        exists (
          select 1 from public.community_posts post
          join public.community_spaces space on space.id = post.community_id
          where post.author_id = p.id and post.status = 'published' and space.status = 'active'
            and (space.visibility = 'public' or exists (
              select 1 from public.community_memberships member
              where member.space_id = space.id and member.user_id = auth.uid()))
        ) or exists (
          select 1 from public.community_comments comment
          join public.community_posts post on post.id = comment.post_id
          join public.community_spaces space on space.id = post.community_id
          where comment.author_id = p.id and comment.status = 'published'
            and post.status = 'published' and space.status = 'active'
            and (space.visibility = 'public' or exists (
              select 1 from public.community_memberships member
              where member.space_id = space.id and member.user_id = auth.uid()))
        )
      )
    )
  );
$$;
revoke all on function public.get_community_member_profile(uuid) from public;
grant execute on function public.get_community_member_profile(uuid) to anon, authenticated;

create or replace function public.get_confirmed_booking_slots(target_provider uuid, target_date date)
returns table(requested_time time without time zone)
language sql stable security definer set search_path = pg_catalog, public as $$
  select booking.requested_time from public.bookings booking
  where booking.provider_id = target_provider and booking.requested_date = target_date
    and booking.status = 'confirmed'
    and exists (select 1 from public.providers provider where provider.id = target_provider)
  order by booking.requested_time;
$$;
revoke all on function public.get_confirmed_booking_slots(uuid, date) from public;
grant execute on function public.get_confirmed_booking_slots(uuid, date) to anon, authenticated;
commit;

-- Migration 20261014140000_complete_account_deletion_cleanup.sql
begin;
alter table public.verification_requests drop constraint if exists verification_requests_reviewed_by_fkey;
alter table public.verification_requests add constraint verification_requests_reviewed_by_fkey
  foreign key (reviewed_by) references auth.users(id) on delete set null;
alter table public.provider_publication_consents drop constraint if exists provider_publication_consents_updated_by_fkey;
alter table public.provider_publication_consents add constraint provider_publication_consents_updated_by_fkey
  foreign key (updated_by) references auth.users(id) on delete set null;
alter table public.ad_campaigns drop constraint if exists ad_campaigns_approved_by_fkey;
alter table public.ad_campaigns add constraint ad_campaigns_approved_by_fkey
  foreign key (approved_by) references auth.users(id) on delete set null;
alter table public.community_events drop constraint if exists community_events_created_by_fkey;
alter table public.community_events add constraint community_events_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;
alter table public.community_resources drop constraint if exists community_resources_created_by_fkey;
alter table public.community_resources add constraint community_resources_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;
alter table public.user_moderation_status drop constraint if exists user_moderation_status_updated_by_fkey;
alter table public.user_moderation_status add constraint user_moderation_status_updated_by_fkey
  foreign key (updated_by) references auth.users(id) on delete set null;
alter table public.business_applications drop constraint if exists business_applications_reviewed_by_fkey;
alter table public.business_applications add constraint business_applications_reviewed_by_fkey
  foreign key (reviewed_by) references auth.users(id) on delete set null;

create or replace function public.prepare_account_deletion(target_user uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;
  perform set_config('chodhiq.provider_workflow', 'account_deletion', true);
  update public.providers set owner_id = null, is_claimed = false, is_verified = false,
    verification_status = 'unverified', updated_at = now()
    where owner_id = target_user and source_profile_id is not null;
  delete from public.providers where owner_id = target_user and source_profile_id is null;
  update public.profiles set expo_push_token = null, push_token_updated_at = now() where id = target_user;
  delete from public.app_error_events where user_id = target_user;
  delete from public.push_delivery_attempts where user_id = target_user;
  delete from public.provider_analytics_events where user_id = target_user;
  delete from public.mvp_events where user_id = target_user;
end;
$$;
revoke all on function public.prepare_account_deletion(uuid) from public, anon, authenticated;
grant execute on function public.prepare_account_deletion(uuid) to service_role;
commit;

-- Migration 20261021100000_notification_actor_details.sql
begin;
alter table public.notifications add column if not exists actor_name text, add column if not exists actor_avatar_url text;

create or replace function public.send_community_activity_notification(
  post_id uuid, recipient uuid, actor uuid, message_title text, message_body text, kind text, activity_key text
)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare actor_name text; actor_avatar text;
begin
  if recipient is null or recipient=actor or public.community_users_blocked(recipient,actor) then return; end if;
  if not exists(select 1 from public.community_posts p join public.community_spaces s on s.id=p.community_id
    where p.id=post_id and p.status='published' and s.status='active'
      and not public.community_users_blocked(recipient,p.author_id)
      and (s.visibility='public' or exists(select 1 from public.community_memberships m where m.space_id=s.id and m.user_id=recipient))) then return; end if;
  select coalesce(nullif(trim(full_name),''),'A community member'), avatar_url into actor_name, actor_avatar
    from public.profiles where id=actor;
  insert into public.notifications(user_id,title,body,type,entity_type,entity_id,event_key,actor_name,actor_avatar_url)
  values(recipient,message_title,message_body,kind,'community_post',post_id::text,activity_key,coalesce(actor_name,'A community member'),actor_avatar)
  on conflict(user_id,event_key) where event_key is not null do nothing;
end $$;
revoke all on function public.send_community_activity_notification(uuid,uuid,uuid,text,text,text,text) from public,anon,authenticated;

create or replace function public.notify_community_engagement()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare owner_id uuid; parent_author uuid; actor_name text;
begin
  if tg_table_name='community_post_likes' then
    select author_id into owner_id from public.community_posts where id=new.post_id;
    select coalesce(nullif(trim(full_name),''),'A community member') into actor_name from public.profiles where id=new.user_id;
    perform public.send_community_activity_notification(new.post_id,owner_id,new.user_id,coalesce(actor_name,'A community member')||' liked your post',coalesce(actor_name,'A community member')||' liked your community post.','community_like','like:'||new.post_id||':'||new.user_id);
  else
    if new.status<>'published' then return new; end if;
    select author_id into owner_id from public.community_posts where id=new.post_id;
    select coalesce(nullif(trim(full_name),''),'A community member') into actor_name from public.profiles where id=new.author_id;
    perform public.send_community_activity_notification(new.post_id,owner_id,new.author_id,'New comment on your post',coalesce(actor_name,'A community member')||' commented on your community post.','community_comment','comment:'||new.id);
    if new.parent_comment_id is not null then
      select author_id into parent_author from public.community_comments where id=new.parent_comment_id and post_id=new.post_id and status='published';
      if parent_author is distinct from owner_id then
        perform public.send_community_activity_notification(new.post_id,parent_author,new.author_id,'New reply to your comment',coalesce(actor_name,'A community member')||' replied to your comment.','community_reply','comment:'||new.id);
      end if;
    end if;
  end if;
  return new;
end $$;
revoke all on function public.notify_community_engagement() from public,anon,authenticated;

create or replace function public.notify_new_community_post()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare space public.community_spaces%rowtype; actor_name text; actor_avatar text;
begin
  if new.status <> 'published' then return new; end if;
  if tg_op='UPDATE' and old.status='published' then return new; end if;
  select * into space from public.community_spaces where id=new.community_id and status='active';
  if not found then return new; end if;
  select coalesce(nullif(trim(full_name),''),'A community member'),avatar_url into actor_name,actor_avatar from public.profiles where id=new.author_id;
  insert into public.notifications(user_id,title,body,type,entity_type,entity_id,actor_name,actor_avatar_url)
  select p.id,'New post in ' || space.name,coalesce(actor_name,'A community member') || ' shared a new post.',
    'community_post','community_post',new.id::text,coalesce(actor_name,'A community member'),actor_avatar
  from public.profiles p where p.id<>new.author_id and not public.community_users_blocked(p.id,new.author_id)
    and (space.slug='general' and space.visibility='public'
      or exists(select 1 from public.community_memberships m where m.space_id=space.id and m.user_id=p.id))
    and not exists(select 1 from public.notifications n where n.user_id=p.id and n.entity_type='community_post' and n.entity_id=new.id::text);
  return new;
end $$;
revoke all on function public.notify_new_community_post() from public,anon,authenticated;
commit;

-- Migration 20261021120000_harden_supabase_linter_findings.sql
begin;
drop policy if exists "Public reads provider media" on storage.objects;
drop policy if exists "Public reads ad creative files" on storage.objects;
commit;
