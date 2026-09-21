begin;
create table if not exists public.push_delivery_attempts (
  id bigint generated always as identity primary key,
  notification_id uuid not null,
  user_id uuid references auth.users(id) on delete set null,
  outcome text not null check (outcome in ('delivered','failed','skipped')),
  provider_status text,
  error_code text,
  created_at timestamptz not null default now()
);
alter table public.push_delivery_attempts enable row level security;
drop policy if exists "Admins read push delivery attempts" on public.push_delivery_attempts;
create policy "Admins read push delivery attempts"
on public.push_delivery_attempts for select to authenticated
using (public.is_admin());
revoke all on public.push_delivery_attempts from public, anon, authenticated;
grant select on public.push_delivery_attempts to authenticated;
create index if not exists push_delivery_attempts_created_idx
  on public.push_delivery_attempts(created_at desc);
create index if not exists push_delivery_attempts_outcome_created_idx
  on public.push_delivery_attempts(outcome, created_at desc);
create or replace view public.operational_push_summary
with (security_invoker = true) as
select
  date_trunc('hour', created_at) as bucket,
  count(*) as attempt_count,
  count(*) filter (where outcome = 'delivered') as delivered_count,
  count(*) filter (where outcome = 'failed') as failed_count,
  count(*) filter (where outcome = 'skipped') as skipped_count
from public.push_delivery_attempts
where created_at >= now() - interval '7 days'
group by 1;
revoke all on public.operational_push_summary from public, anon;
grant select on public.operational_push_summary to authenticated;
commit;
