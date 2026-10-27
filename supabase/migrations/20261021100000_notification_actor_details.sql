begin;

alter table public.notifications
  add column if not exists actor_name text,
  add column if not exists actor_avatar_url text;

create or replace function public.send_community_activity_notification(
  post_id uuid,
  recipient uuid,
  actor uuid,
  message_title text,
  message_body text,
  kind text,
  activity_key text
)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare actor_name text; actor_avatar text;
begin
  if recipient is null or recipient=actor or public.community_users_blocked(recipient,actor) then return; end if;
  if not exists(select 1 from public.community_posts p join public.community_spaces s on s.id=p.community_id
    where p.id=post_id and p.status='published' and s.status='active'
      and not public.community_users_blocked(recipient,p.author_id)
      and (s.visibility='public' or exists(select 1 from public.community_memberships m where m.space_id=s.id and m.user_id=recipient))) then return; end if;
  select coalesce(nullif(trim(full_name),''),'A community member'), avatar_url
    into actor_name, actor_avatar from public.profiles where id=actor;
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
  select coalesce(nullif(trim(full_name),''),'A community member'),avatar_url into actor_name,actor_avatar
    from public.profiles where id=new.author_id;
  insert into public.notifications(user_id,title,body,type,entity_type,entity_id,actor_name,actor_avatar_url)
  select p.id,'New post in ' || space.name,coalesce(actor_name,'A community member') || ' shared a new post.',
    'community_post','community_post',new.id::text,coalesce(actor_name,'A community member'),actor_avatar
  from public.profiles p
  where p.id<>new.author_id
    and not public.community_users_blocked(p.id,new.author_id)
    and (space.slug='general' and space.visibility='public'
      or exists(select 1 from public.community_memberships m where m.space_id=space.id and m.user_id=p.id))
    and not exists(select 1 from public.notifications n where n.user_id=p.id and n.entity_type='community_post' and n.entity_id=new.id::text);
  return new;
end $$;
revoke all on function public.notify_new_community_post() from public,anon,authenticated;

commit;
