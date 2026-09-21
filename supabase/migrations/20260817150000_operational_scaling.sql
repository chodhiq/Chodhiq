begin;
create extension if not exists pg_trgm;
create index if not exists providers_business_name_trgm_idx
  on public.providers using gin (business_name gin_trgm_ops);
create index if not exists providers_base_city_trgm_idx
  on public.providers using gin (base_city gin_trgm_ops);
create index if not exists verification_pending_created_idx
  on public.verification_requests (submitted_at)
  where status = 'pending';
create index if not exists reports_open_created_idx
  on public.provider_reports (created_at)
  where status in ('open', 'reviewing');
create index if not exists notifications_unread_user_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;
create or replace view public.operational_error_summary
with (security_invoker = true) as
select
  date_trunc('hour', created_at) as bucket,
  app_area,
  platform,
  count(*) as error_count,
  count(*) filter (where metadata ->> 'fatal' = 'true') as fatal_count
from public.app_error_events
where created_at >= now() - interval '7 days'
group by 1, 2, 3;
revoke all on public.operational_error_summary from public, anon;
grant select on public.operational_error_summary to authenticated;
commit;
