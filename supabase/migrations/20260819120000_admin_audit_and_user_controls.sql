begin;
-- Backfill moderation support for databases created before review moderation was introduced.
alter table public.reviews add column if not exists moderation_status text not null default 'published';
alter table public.reviews drop constraint if exists reviews_moderation_status_allowed;
alter table public.reviews add constraint reviews_moderation_status_allowed check (moderation_status in ('published','removed')) not valid;
create or replace function public.admin_broadcast_notification(message_title text, message_body text)
returns integer language plpgsql security definer
set search_path = pg_catalog, public, auth as $$
declare inserted_count integer;
begin
  if not public.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
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
create or replace function public.admin_set_user_moderation(target_email text, next_status text, moderation_reason text)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public, auth as $$
declare target_id uuid;
begin
  if not public.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
  if next_status not in ('active','suspended') then raise exception 'Unsupported moderation status'; end if;
  if char_length(trim(moderation_reason)) not between 5 and 500 then raise exception 'Reason must be 5 to 500 characters'; end if;
  select id into target_id from auth.users where lower(email)=lower(trim(target_email));
  if target_id is null then raise exception 'User not found'; end if;
  if target_id=auth.uid() and next_status='suspended' then raise exception 'Administrators cannot suspend their own account'; end if;
  insert into public.user_moderation_status(user_id,status,reason,updated_by,updated_at)
  values(target_id,next_status,trim(moderation_reason),auth.uid(),now())
  on conflict(user_id) do update set status=excluded.status,reason=excluded.reason,updated_by=excluded.updated_by,updated_at=now();
  update auth.users set banned_until=case when next_status='suspended' then 'infinity'::timestamptz else null end where id=target_id;
  insert into public.admin_audit_log(admin_id,action,entity_type,entity_id,details)
  values(auth.uid(),'user_'||next_status,'user',target_id::text,jsonb_build_object('reason',trim(moderation_reason)));
  return target_id;
end $$;
revoke all on function public.admin_set_user_moderation(text,text,text) from public,anon;
grant execute on function public.admin_set_user_moderation(text,text,text) to authenticated;
create or replace function public.audit_admin_dashboard_change()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if auth.uid() is not null and public.is_admin() then
    insert into public.admin_audit_log(admin_id,action,entity_type,entity_id,details)
    values(auth.uid(),tg_argv[0],tg_table_name,coalesce(new.id,old.id)::text,jsonb_build_object('old',to_jsonb(old),'new',to_jsonb(new)));
  end if;
  return coalesce(new,old);
end $$;
drop trigger if exists audit_verification_decision on public.verification_requests;
create trigger audit_verification_decision after update of status on public.verification_requests
for each row when (old.status is distinct from new.status) execute function public.audit_admin_dashboard_change('verification_decision');
drop trigger if exists audit_community_report_decision on public.community_post_reports;
create trigger audit_community_report_decision after update of status on public.community_post_reports
for each row when (old.status is distinct from new.status) execute function public.audit_admin_dashboard_change('community_report_decision');
drop trigger if exists audit_review_moderation on public.reviews;
create trigger audit_review_moderation after update of moderation_status on public.reviews
for each row when (old.moderation_status is distinct from new.moderation_status) execute function public.audit_admin_dashboard_change('review_moderation');
commit;
