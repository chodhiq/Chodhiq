begin;
drop policy if exists "Admins manage categories" on public.categories;
create policy "Admins manage categories" on public.categories for all to authenticated using(public.is_admin()) with check(public.is_admin());
grant insert,update,delete on public.categories to authenticated;
grant select on public.bookings,public.subscription_requests,public.provider_analytics_events to authenticated;
drop policy if exists "Admins read bookings" on public.bookings;
create policy "Admins read bookings" on public.bookings for select to authenticated using(public.is_admin());
drop policy if exists "Admins read subscription requests" on public.subscription_requests;
create policy "Admins read subscription requests" on public.subscription_requests for select to authenticated using(public.is_admin());
drop policy if exists "Admins read analytics" on public.provider_analytics_events;
create policy "Admins read analytics" on public.provider_analytics_events for select to authenticated using(public.is_admin());
drop policy if exists "Admins read all community posts" on public.community_posts;
create policy "Admins read all community posts" on public.community_posts for select to authenticated using(public.is_admin());
grant update(business_name,category_id,base_city,phone,description,service_areas,sponsored_rank) on public.providers to authenticated;
create table if not exists public.user_moderation_status (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'suspended')),
  reason text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
alter table public.user_moderation_status enable row level security;
drop policy if exists "Admins view user moderation" on public.user_moderation_status;
create policy "Admins view user moderation" on public.user_moderation_status for select to authenticated using(public.is_admin());
grant select on public.user_moderation_status to authenticated;
alter table public.providers add column if not exists previous_verification_status text;
alter table public.verification_requests add column if not exists reviewed_by uuid references auth.users(id);
alter table public.verification_requests add column if not exists decision_note text;
alter table public.verification_requests add column if not exists updated_at timestamptz not null default now();

revoke update,delete on public.admin_audit_log from authenticated;
drop policy if exists "Audit records are append only" on public.admin_audit_log;
create policy "Audit records are append only" on public.admin_audit_log for insert to authenticated with check (public.is_admin() and admin_id = auth.uid());

create or replace function public.admin_resolve_report(
  report_kind text,
  report_id uuid,
  expected_status text,
  expected_updated_at timestamptz,
  next_status text,
  resolution_note text
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare current_report record; target_id uuid; previous_target jsonb; new_target jsonb;
begin
  if not public.is_admin() then raise exception using errcode='42501', message='administrator required'; end if;
  if report_kind not in ('provider','community') or next_status not in ('reviewing','resolved','dismissed') then raise exception using errcode='22023', message='invalid transition'; end if;
  if next_status in ('resolved','dismissed') and length(trim(coalesce(resolution_note,''))) < 8 then raise exception using errcode='22023', message='resolution note required'; end if;
  if report_kind = 'provider' then
    select * into current_report from public.provider_reports where id=report_id for update;
  else
    select * into current_report from public.community_post_reports where id=report_id for update;
  end if;
  if not found then raise exception using errcode='P0002', message='report not found'; end if;
  if current_report.status <> expected_status or (expected_updated_at is not null and (to_jsonb(current_report)->>'updated_at')::timestamptz is distinct from expected_updated_at) then raise exception using errcode='40001', message='report changed; reload and retry'; end if;
  if current_report.status not in ('open','reviewing') or (current_report.status='reviewing' and next_status='reviewing') then raise exception using errcode='40001', message='illegal or repeated report transition'; end if;
  if next_status='resolved' then
    if report_kind='provider' then
      target_id:=current_report.provider_id;
      select to_jsonb(p) into previous_target from public.providers p where id=target_id for update;
      update public.providers set verification_status='suspended',is_verified=false where id=target_id returning to_jsonb(providers) into new_target;
    else
      target_id:=current_report.post_id;
      select to_jsonb(p) into previous_target from public.community_posts p where id=target_id for update;
      update public.community_posts set status='removed' where id=target_id returning to_jsonb(community_posts) into new_target;
    end if;
  end if;
  if report_kind='provider' then update public.provider_reports set status=next_status where id=report_id;
  else update public.community_post_reports set status=next_status where id=report_id; end if;
  insert into public.admin_audit_log(admin_id,action,entity_type,entity_id,details) values(auth.uid(),report_kind||'_report_'||next_status,report_kind||'_report',report_id,jsonb_build_object('source','admin_report_rpc','reason',resolution_note,'outcome','succeeded','previous_values',jsonb_build_object('status',expected_status,'target',previous_target),'new_values',jsonb_build_object('status',next_status,'target',new_target),'correlation_id',gen_random_uuid()));
  return jsonb_build_object('ok',true,'status',next_status);
end $$;

create or replace function public.admin_transition_community_post(post_id uuid,expected_status text,next_status text,reason text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare current_post record;
begin
  if not public.is_admin() then raise exception using errcode='42501',message='administrator required'; end if;
  if expected_status not in ('published','under_review','removed') or next_status not in ('published','removed') then raise exception using errcode='22023',message='invalid community post status'; end if;
  if next_status='removed' and (length(trim(coalesce(reason,'')))<8 or length(trim(coalesce(reason,'')))>1000) then raise exception using errcode='22023',message='removal reason must be between 8 and 1000 characters'; end if;
  select * into current_post from public.community_posts where id=post_id for update;
  if not found then raise exception using errcode='P0002',message='post not found'; end if;
  if current_post.status<>expected_status or current_post.status=next_status then raise exception using errcode='40001',message='post changed; reload and retry'; end if;
  update public.community_posts set status=next_status where id=post_id;
  insert into public.admin_audit_log(admin_id,action,entity_type,entity_id,details) values(auth.uid(),'community_post_'||next_status,'community_post',post_id,jsonb_build_object('source','admin_transition_rpc','reason',reason,'outcome','succeeded','previous_values',jsonb_build_object('status',current_post.status),'new_values',jsonb_build_object('status',next_status),'correlation_id',gen_random_uuid()));
  return jsonb_build_object('ok',true,'status',next_status);
end $$;

revoke all on function public.admin_resolve_report(text,uuid,text,timestamptz,text,text) from public;
grant execute on function public.admin_resolve_report(text,uuid,text,timestamptz,text,text) to authenticated;
revoke all on function public.admin_transition_community_post(uuid,text,text,text) from public;
grant execute on function public.admin_transition_community_post(uuid,text,text,text) to authenticated;

create or replace function public.admin_decide_verification(request_id uuid,expected_status text,expected_updated_at timestamptz,decision text,decision_note text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare current_request record; evidence_count integer; provider_state text;
begin
  if not public.is_admin() then raise exception using errcode='42501',message='administrator required'; end if;
  if decision not in ('pending','changes_requested','approved','rejected','revoked') then raise exception using errcode='22023',message='unknown decision'; end if;
  if decision in ('changes_requested','rejected','revoked') and length(trim(coalesce(decision_note,'')))<8 then raise exception using errcode='22023',message='decision note required'; end if;
  select * into current_request from public.verification_requests where id=request_id for update;
  if not found then raise exception using errcode='P0002',message='verification request not found'; end if;
  if current_request.status<>expected_status or (expected_updated_at is not null and current_request.updated_at is distinct from expected_updated_at) then raise exception using errcode='40001',message='verification request changed; reload and retry'; end if;
  if not ((current_request.status='pending' and decision in ('approved','rejected','changes_requested')) or (current_request.status in ('rejected','changes_requested','revoked') and decision='pending') or (current_request.status='approved' and decision='revoked')) then raise exception using errcode='40001',message='illegal verification transition'; end if;
  if decision='approved' then select count(*) into evidence_count from public.verification_documents vd where vd.request_id=current_request.id; if evidence_count=0 then raise exception using errcode='22023',message='evidence required'; end if; end if;
  update public.verification_requests set status=decision,decision_note=nullif(trim(decision_note),''),reviewed_by=auth.uid(),reviewed_at=case when decision='pending' then null else now() end,updated_at=now() where id=current_request.id;
  provider_state:=case when decision='approved' then 'approved' when decision='revoked' then 'revoked' else current_request.status end;
  if decision in ('approved','revoked') then update public.providers set verification_status=provider_state,is_verified=(decision='approved') where id=current_request.provider_id; end if;
  insert into public.admin_audit_log(admin_id,action,entity_type,entity_id,details) values(auth.uid(),'verification_'||decision,'verification_request',current_request.id,jsonb_build_object('source','admin_verification_rpc','reason',decision_note,'outcome','succeeded','previous_values',jsonb_build_object('status',current_request.status),'new_values',jsonb_build_object('status',decision),'correlation_id',gen_random_uuid()));
  return jsonb_build_object('ok',true,'status',decision,'reviewed_by',auth.uid());
end $$;
revoke all on function public.admin_decide_verification(uuid,text,timestamptz,text,text) from public;
grant execute on function public.admin_decide_verification(uuid,text,timestamptz,text,text) to authenticated;
commit;
