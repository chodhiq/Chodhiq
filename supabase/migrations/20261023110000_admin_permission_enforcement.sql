-- Enforce the dashboard permission matrix at the database boundary.
begin;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, auth
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = (select auth.uid())
      and u.raw_app_meta_data ->> 'role' = 'admin'
  )
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.admin_has_permission(permission_name text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, auth
as $$
  with current_admin as (
    select
      u.raw_app_meta_data ->> 'role' as role,
      coalesce(u.raw_app_meta_data ->> 'admin_level', 'super_admin') as admin_level
    from auth.users u
    where u.id = (select auth.uid())
  )
  select coalesce((
    select role = 'admin' and (
      admin_level = 'super_admin'
      or (admin_level = 'moderator' and permission_name in (
        'applications.review', 'providers.suspend', 'users.suspend',
        'reviews.moderate', 'categories.manage', 'community.moderate',
        'community.privileges', 'reports.resolve', 'notifications.send',
        'audit.view'
      ))
      or (admin_level = 'support' and permission_name in (
        'applications.review', 'reports.resolve', 'notifications.send',
        'audit.view'
      ))
      or (admin_level = 'finance' and permission_name in (
        'payments.view', 'analytics.view', 'audit.view'
      ))
      or (admin_level = 'analyst' and permission_name in (
        'analytics.view', 'audit.view'
      ))
    )
    from current_admin
  ), false)
$$;
revoke all on function public.admin_has_permission(text) from public, anon;
grant execute on function public.admin_has_permission(text) to authenticated;

-- Restrictive policies narrow historical broad admin policies while leaving
-- non-admin owner/customer policies unchanged.
do $$
declare
  guard record;
begin
  for guard in
    select * from (values
      ('verification_requests', 'applications.review'),
      ('verification_documents', 'applications.review'),
      ('subscription_requests', 'applications.review'),
      ('business_applications', 'applications.review'),
      ('provider_publication_consents', 'applications.review'),
      ('provider_entitlements', 'applications.review'),
      ('quote_requests', 'applications.review'),
      ('provider_lead_deliveries', 'applications.review'),
      ('payment_records', 'payments.view'),
      ('provider_analytics_events', 'analytics.view'),
      ('mvp_events', 'analytics.view'),
      ('community_post_reports', 'reports.resolve'),
      ('provider_reports', 'reports.resolve'),
      ('admin_audit_log', 'audit.view'),
      ('app_error_events', 'audit.view'),
      ('providers', 'providers.suspend'),
      ('profiles', 'users.suspend'),
      ('services', 'providers.suspend'),
      ('provider_hours', 'providers.suspend'),
      ('user_moderation_status', 'users.suspend'),
      ('categories', 'categories.manage'),
      ('reviews', 'reviews.moderate'),
      ('review_replies', 'reviews.moderate'),
      ('community_posts', 'community.moderate'),
      ('community_spaces', 'community.moderate'),
      ('community_events', 'community.moderate'),
      ('community_resources', 'community.moderate'),
      ('community_comments', 'community.moderate'),
      ('community_memberships', 'community.privileges'),
      ('community_member_permissions', 'community.privileges'),
      ('ad_campaign_enquiries', 'campaigns.manage'),
      ('ad_campaigns', 'campaigns.manage'),
      ('ad_campaign_events', 'campaigns.manage'),
      ('ad_campaign_invoices', 'campaigns.manage'),
      ('push_delivery_attempts', 'notifications.send'),
      ('service_catalog', 'admins.manage'),
      ('directory_import_candidates', 'admins.manage')
    ) as guards(table_name, permission_name)
  loop
    execute format(
      'drop policy if exists admin_permission_guard on public.%I',
      guard.table_name
    );
    execute format(
      'create policy admin_permission_guard on public.%I as restrictive for all to authenticated using (not public.is_admin() or public.admin_has_permission(%L)) with check (not public.is_admin() or public.admin_has_permission(%L))',
      guard.table_name,
      guard.permission_name,
      guard.permission_name
    );
  end loop;
end
$$;

do $$
declare
  guard record;
  policy_name text;
begin
  for guard in
    select * from (values
      ('provider-media', 'admins.manage'),
      ('verification-documents', 'applications.review'),
      ('business-application-proofs', 'applications.review'),
      ('community-images', 'community.moderate'),
      ('ad-creatives', 'campaigns.manage')
    ) as guards(bucket_name, permission_name)
  loop
    policy_name := 'admin_permission_guard_' || replace(guard.bucket_name, '-', '_');
    execute format(
      'drop policy if exists %I on storage.objects',
      policy_name
    );
    execute format(
      'create policy %I on storage.objects as restrictive for all to authenticated using (bucket_id <> %L or not public.is_admin() or public.admin_has_permission(%L)) with check (bucket_id <> %L or not public.is_admin() or public.admin_has_permission(%L))',
      policy_name,
      guard.bucket_name,
      guard.permission_name,
      guard.bucket_name,
      guard.permission_name
    );
  end loop;
end
$$;

drop policy if exists "Admins manage categories" on public.categories;
drop policy if exists categories_admin_insert on public.categories;
drop policy if exists categories_admin_update on public.categories;
drop policy if exists categories_admin_delete on public.categories;
create policy categories_admin_insert on public.categories
  for insert to authenticated with check (public.admin_has_permission('categories.manage'));
create policy categories_admin_update on public.categories
  for update to authenticated using (public.admin_has_permission('categories.manage'))
  with check (public.admin_has_permission('categories.manage'));
create policy categories_admin_delete on public.categories
  for delete to authenticated using (public.admin_has_permission('categories.manage'));

-- Replace broad admin review moderation/deletion policies. Customer and provider
-- owner policies remain intact.
drop policy if exists "Admins moderate reviews" on public.reviews;
create policy "Admins moderate reviews"
  on public.reviews for update to authenticated
  using (public.admin_has_permission('reviews.moderate'))
  with check (public.admin_has_permission('reviews.moderate'));
drop policy if exists "Admins delete review replies" on public.review_replies;
create policy "Admins delete review replies"
  on public.review_replies for delete to authenticated
  using (public.admin_has_permission('reviews.moderate'));

-- Verification uses the same applications.review permission as its nav item.
create or replace function public.admin_decide_verification(request_id uuid,expected_status text,expected_updated_at timestamptz,decision text,decision_note text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,auth as $$
declare current_request record; evidence_count integer; provider_state text;
begin
  if not public.admin_has_permission('applications.review') then raise exception using errcode='42501',message='administrator permission required'; end if;
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
revoke all on function public.admin_decide_verification(uuid,text,timestamptz,text,text) from public, anon;
grant execute on function public.admin_decide_verification(uuid,text,timestamptz,text,text) to authenticated;

commit;
