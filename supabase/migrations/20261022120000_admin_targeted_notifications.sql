begin;

create or replace function public.admin_has_permission(permission_name text)
returns boolean language sql stable security definer
set search_path = pg_catalog, auth as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin' and (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'admin_level', 'super_admin') = 'super_admin'
    or (auth.jwt() -> 'app_metadata' ->> 'admin_level' = 'moderator' and permission_name in ('applications.review','providers.suspend','users.suspend','reviews.moderate','community.moderate','community.privileges','reports.resolve','notifications.send','audit.view'))
    or (auth.jwt() -> 'app_metadata' ->> 'admin_level' = 'support' and permission_name in ('applications.review','reports.resolve','notifications.send','audit.view'))
    or (auth.jwt() -> 'app_metadata' ->> 'admin_level' = 'finance' and permission_name in ('payments.view','analytics.view','audit.view'))
    or (auth.jwt() -> 'app_metadata' ->> 'admin_level' = 'analyst' and permission_name in ('analytics.view','audit.view'))
  );
$$;
revoke all on function public.admin_has_permission(text) from public,anon;
grant execute on function public.admin_has_permission(text) to authenticated;

create or replace function public.admin_send_notification(
  audience text,
  target_user_id uuid,
  message_title text,
  message_body text
) returns integer
language plpgsql security definer
set search_path = pg_catalog, public, auth as $$
declare sent integer;
begin
  if not public.admin_has_permission('notifications.send') then
    raise exception 'Administrator permission required' using errcode = '42501';
  end if;
  if audience is null or audience not in ('all', 'customers', 'providers', 'user') then
    raise exception 'Unsupported notification audience';
  end if;
  if audience = 'user' and target_user_id is null then
    raise exception 'A target user is required';
  end if;
  if char_length(trim(message_title)) not between 3 and 100
     or char_length(trim(message_body)) not between 5 and 500 then
    raise exception 'Invalid title or message length';
  end if;

  insert into public.notifications(user_id, title, body)
  select u.id, trim(message_title), trim(message_body)
  from auth.users u
  where (u.banned_until is null or u.banned_until < now())
    and (audience = 'all'
      or (audience = 'user' and u.id = target_user_id)
      or (audience = 'providers' and exists (
        select 1 from public.providers p where p.owner_id = u.id
      ))
      or (audience = 'customers' and not exists (
        select 1 from public.providers p where p.owner_id = u.id
      )));
  get diagnostics sent = row_count;

  insert into public.admin_audit_log(admin_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'send_notification', 'notification', target_user_id::text,
    jsonb_build_object('title', trim(message_title), 'audience', audience, 'recipients', sent));
  return sent;
end $$;

revoke all on function public.admin_send_notification(text, uuid, text, text) from public, anon;
grant execute on function public.admin_send_notification(text, uuid, text, text) to authenticated;

create or replace function public.admin_broadcast_notification(message_title text, message_body text)
returns integer language plpgsql security definer
set search_path = pg_catalog, public, auth as $$
declare inserted_count integer;
begin
  if not public.admin_has_permission('notifications.send') then raise exception 'Administrator permission required' using errcode='42501'; end if;
  if char_length(trim(message_title)) not between 3 and 100 then raise exception 'Title must be 3 to 100 characters'; end if;
  if char_length(trim(message_body)) not between 5 and 500 then raise exception 'Message must be 5 to 500 characters'; end if;
  insert into public.notifications(user_id,title,body)
  select id,trim(message_title),trim(message_body) from auth.users where banned_until is null or banned_until<now();
  get diagnostics inserted_count=row_count;
  insert into public.admin_audit_log(admin_id,action,entity_type,details)
  values(auth.uid(),'broadcast_notification','notification',jsonb_build_object('title',trim(message_title),'recipients',inserted_count));
  return inserted_count;
end $$;
revoke all on function public.admin_broadcast_notification(text,text) from public,anon;
grant execute on function public.admin_broadcast_notification(text,text) to authenticated;
commit;
