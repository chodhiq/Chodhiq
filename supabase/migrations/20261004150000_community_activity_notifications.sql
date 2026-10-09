begin;

alter table public.profiles add column if not exists push_vibration_enabled boolean not null default true;
alter table public.profiles add column if not exists push_channel_id text not null default 'default'
  check(push_channel_id in ('default','updates-vibrate-v1','updates-no-vibration-v1'));
alter table public.notifications add column if not exists event_key text;
create unique index if not exists notifications_user_event_key_idx on public.notifications(user_id,event_key) where event_key is not null;

-- Only notify a recipient who can still read this post. Never expose blocked or private activity.
create or replace function public.send_community_activity_notification(post_id uuid,recipient uuid,actor uuid,message_title text,message_body text,kind text,activity_key text)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if recipient is null or recipient=actor or public.community_users_blocked(recipient,actor) then return; end if;
  if not exists(select 1 from public.community_posts p join public.community_spaces s on s.id=p.community_id
    where p.id=post_id and p.status='published' and s.status='active'
      and not public.community_users_blocked(recipient,p.author_id)
      and (s.visibility='public' or exists(select 1 from public.community_memberships m where m.space_id=s.id and m.user_id=recipient))) then return; end if;
  insert into public.notifications(user_id,title,body,type,entity_type,entity_id,event_key)
  values(recipient,message_title,message_body,kind,'community_post',post_id::text,activity_key)
  on conflict(user_id,event_key) where event_key is not null do nothing;
end $$;
revoke all on function public.send_community_activity_notification(uuid,uuid,uuid,text,text,text,text) from public,anon,authenticated;

create or replace function public.notify_community_engagement()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare owner_id uuid; parent_author uuid;
begin
  select author_id into owner_id from public.community_posts where id=new.post_id;
  if tg_table_name='community_post_likes' then
    perform public.send_community_activity_notification(new.post_id,owner_id,new.user_id,'Someone liked your post','Your community post received a like.','community_like','like:'||new.post_id||':'||new.user_id);
  else
    if new.status<>'published' then return new; end if;
    perform public.send_community_activity_notification(new.post_id,owner_id,new.author_id,'New comment on your post','Someone commented on your community post.','community_comment','comment:'||new.id);
    if new.parent_comment_id is not null then
      select author_id into parent_author from public.community_comments where id=new.parent_comment_id and post_id=new.post_id and status='published';
      if parent_author is distinct from owner_id then
        perform public.send_community_activity_notification(new.post_id,parent_author,new.author_id,'New reply to your comment','Someone replied to your community comment.','community_reply','comment:'||new.id);
      end if;
    end if;
  end if;
  return new;
end $$;
revoke all on function public.notify_community_engagement() from public,anon,authenticated;
create trigger notify_community_like after insert on public.community_post_likes for each row execute function public.notify_community_engagement();
create trigger notify_community_comment after insert on public.community_comments for each row execute function public.notify_community_engagement();

create or replace function public.notify_community_report_activity()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if tg_op='INSERT' then
    insert into public.notifications(user_id,title,body,type,event_key)
    values(new.reporter_id,'Report received','Thank you. Our moderation team will review your report.','community_report','report:'||new.id);
    insert into public.notifications(user_id,title,body,type,entity_type,entity_id,event_key)
    select p.id,'Community report needs review','A community report is waiting in the moderation queue.','community_report','community_report',new.id::text,'report-review:'||new.id
    from public.profiles p join auth.users u on u.id=p.id where u.raw_app_meta_data->>'role'='admin' and p.id<>new.reporter_id;
  elsif new.status is distinct from old.status and new.status in ('resolved','dismissed') then
    insert into public.notifications(user_id,title,body,type,event_key)
    values(new.reporter_id,'Your report was reviewed','Our moderation team has reviewed your community report.','community_report','report-result:'||new.id||':'||new.status)
    on conflict(user_id,event_key) where event_key is not null do nothing;
  end if;
  return new;
end $$;
revoke all on function public.notify_community_report_activity() from public,anon,authenticated;
create trigger notify_community_report after insert or update of status on public.community_post_reports for each row execute function public.notify_community_report_activity();

-- Explain moderation to the author without identifying the reporter.
create or replace function public.notify_community_content_removed()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if new.status='removed' and old.status is distinct from new.status then
    insert into public.notifications(user_id,title,body,type,event_key)
    values(new.author_id,'Community content removed','Your community content was removed. Contact support if you want to appeal.','community_moderation','removed:'||tg_table_name||':'||new.id)
    on conflict(user_id,event_key) where event_key is not null do nothing;
  end if;
  return new;
end $$;
revoke all on function public.notify_community_content_removed() from public,anon,authenticated;
create trigger notify_community_post_removed after update of status on public.community_posts for each row execute function public.notify_community_content_removed();
create trigger notify_community_comment_removed after update of status on public.community_comments for each row execute function public.notify_community_content_removed();
commit;
