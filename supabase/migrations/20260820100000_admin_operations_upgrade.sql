-- Searchable member operations and atomic report moderation.
create or replace function public.admin_search_members(search_term text, result_limit integer default 12)
returns table(user_id uuid, email text, display_name text, account_status text, created_at timestamptz)
language plpgsql security definer set search_path=''
as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
  return query
    select u.id, u.email::text, coalesce(p.full_name, 'Community member')::text,
      (case when u.banned_until is not null and u.banned_until > now() then 'suspended' else 'active' end)::text,
      u.created_at
    from auth.users u left join public.profiles p on p.id=u.id
    where u.email ilike '%'||trim(search_term)||'%' or coalesce(p.full_name,'') ilike '%'||trim(search_term)||'%'
    order by u.created_at desc limit least(greatest(result_limit,1),25);
end $$;
revoke all on function public.admin_search_members(text,integer) from public,anon;
grant execute on function public.admin_search_members(text,integer) to authenticated;
create or replace function public.admin_moderate_community_report(report_id uuid, moderation_action text, moderation_note text)
returns uuid language plpgsql security definer set search_path=''
as $$
declare target_post uuid;
begin
  if not public.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
  if moderation_action not in ('dismiss','remove_post') then raise exception 'Unsupported moderation action'; end if;
  if char_length(trim(moderation_note)) not between 5 and 500 then raise exception 'A moderation note is required'; end if;
  select post_id into target_post from public.community_post_reports where id=report_id for update;
  if target_post is null then raise exception 'Report not found'; end if;
  if moderation_action='remove_post' then update public.community_posts set status='removed' where id=target_post; end if;
  update public.community_post_reports set status=case when moderation_action='dismiss' then 'dismissed' else 'resolved' end where post_id=target_post and status in ('open','reviewing');
  insert into public.admin_audit_log(admin_id,action,entity_type,entity_id,details)
    values(auth.uid(),'community_report_'||moderation_action,'community_post',target_post::text,jsonb_build_object('report_id',report_id,'note',trim(moderation_note)));
  return target_post;
end $$;
revoke all on function public.admin_moderate_community_report(uuid,text,text) from public,anon;
grant execute on function public.admin_moderate_community_report(uuid,text,text) to authenticated;
create index if not exists verification_requests_status_submitted_idx on public.verification_requests(status,submitted_at);
create index if not exists community_post_reports_status_created_idx on public.community_post_reports(status,created_at);
create index if not exists admin_audit_log_created_idx on public.admin_audit_log(created_at desc);
