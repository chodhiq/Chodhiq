begin;

-- Preserve the related records while removing their auth-user dependency so
-- an account deletion is not blocked by nullable audit/creator references.
alter table public.verification_requests
  drop constraint if exists verification_requests_reviewed_by_fkey;
alter table public.verification_requests
  add constraint verification_requests_reviewed_by_fkey
  foreign key (reviewed_by) references auth.users(id) on delete set null;

alter table public.provider_publication_consents
  drop constraint if exists provider_publication_consents_updated_by_fkey;
alter table public.provider_publication_consents
  add constraint provider_publication_consents_updated_by_fkey
  foreign key (updated_by) references auth.users(id) on delete set null;

alter table public.ad_campaigns
  drop constraint if exists ad_campaigns_approved_by_fkey;
alter table public.ad_campaigns
  add constraint ad_campaigns_approved_by_fkey
  foreign key (approved_by) references auth.users(id) on delete set null;

alter table public.community_events
  drop constraint if exists community_events_created_by_fkey;
alter table public.community_events
  add constraint community_events_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.community_resources
  drop constraint if exists community_resources_created_by_fkey;
alter table public.community_resources
  add constraint community_resources_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.user_moderation_status
  drop constraint if exists user_moderation_status_updated_by_fkey;
alter table public.user_moderation_status
  add constraint user_moderation_status_updated_by_fkey
  foreign key (updated_by) references auth.users(id) on delete set null;

alter table public.business_applications
  drop constraint if exists business_applications_reviewed_by_fkey;
alter table public.business_applications
  add constraint business_applications_reviewed_by_fkey
  foreign key (reviewed_by) references auth.users(id) on delete set null;

create or replace function public.prepare_account_deletion(target_user uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;

  perform set_config('chodhiq.provider_workflow', 'account_deletion', true);

  update public.providers
    set owner_id = null, is_claimed = false, is_verified = false,
        verification_status = 'unverified', updated_at = now()
    where owner_id = target_user and source_profile_id is not null;
  delete from public.providers
    where owner_id = target_user and source_profile_id is null;
  update public.profiles
    set expo_push_token = null, push_token_updated_at = now()
    where id = target_user;

  -- These event records can contain account-linked crash or delivery data.
  delete from public.app_error_events where user_id = target_user;
  delete from public.push_delivery_attempts where user_id = target_user;
  delete from public.provider_analytics_events where user_id = target_user;
  delete from public.mvp_events where user_id = target_user;
end;
$$;

revoke all on function public.prepare_account_deletion(uuid) from public, anon, authenticated;
grant execute on function public.prepare_account_deletion(uuid) to service_role;

commit;
