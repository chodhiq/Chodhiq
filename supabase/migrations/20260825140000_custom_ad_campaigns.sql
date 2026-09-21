begin;
create table if not exists public.ad_campaign_enquiries (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  contact_email text not null,
  objective text not null check (char_length(objective) between 10 and 1000),
  target_cities text[] not null default '{}',
  target_category_ids uuid[] not null default '{}',
  requested_start date,
  requested_end date,
  budget_pence integer check (budget_pence is null or budget_pence > 0),
  status text not null default 'submitted' check (status in ('submitted','qualified','quoted','accepted','declined','converted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid references public.ad_campaign_enquiries(id) on delete set null,
  provider_id uuid not null references public.providers(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  headline text not null check (char_length(headline) between 2 and 80),
  body text not null check (char_length(body) between 2 and 240),
  creative_url text not null check (creative_url ~ '^https://'),
  destination_url text not null check (destination_url ~ '^https://'),
  target_cities text[] not null default '{}',
  target_category_ids uuid[] not null default '{}',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'draft' check (status in ('draft','in_review','approved','scheduled','active','paused','rejected','expired','completed')),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check ((status not in ('approved','scheduled','active','completed')) or (approved_by is not null and approved_at is not null))
);
create table if not exists public.ad_campaign_events (
  id bigint generated always as identity primary key,
  campaign_id uuid not null references public.ad_campaigns(id) on delete cascade,
  event_type text not null check (event_type in ('impression','click')),
  anonymous_session_id uuid not null,
  placement text not null check (char_length(placement) between 2 and 80),
  occurred_at timestamptz not null default now()
);
create unique index if not exists ad_campaign_event_dedupe_idx
  on public.ad_campaign_events(campaign_id,event_type,anonymous_session_id,placement,(date_trunc('day',occurred_at at time zone 'UTC')));
create table if not exists public.ad_campaign_invoices (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.ad_campaigns(id) on delete cascade,
  invoice_number text not null unique,
  amount_pence integer not null check (amount_pence > 0),
  currency text not null default 'gbp' check (currency ~ '^[a-z]{3}$'),
  status text not null default 'draft' check (status in ('draft','issued','paid','void','overdue')),
  issued_at timestamptz,
  due_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.ad_campaign_enquiries enable row level security;
alter table public.ad_campaigns enable row level security;
alter table public.ad_campaign_events enable row level security;
alter table public.ad_campaign_invoices enable row level security;
create policy "Owners create campaign enquiries" on public.ad_campaign_enquiries for insert to authenticated
with check (requested_by=auth.uid() and public.owns_provider(provider_id));
create policy "Owners read campaign enquiries" on public.ad_campaign_enquiries for select to authenticated
using (requested_by=auth.uid() and public.owns_provider(provider_id));
create policy "Admins manage campaign enquiries" on public.ad_campaign_enquiries for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy "Owners read campaigns" on public.ad_campaigns for select to authenticated using (public.owns_provider(provider_id));
create policy "Admins manage campaigns" on public.ad_campaigns for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Owners read campaign events" on public.ad_campaign_events for select to authenticated
using (exists(select 1 from public.ad_campaigns c where c.id=campaign_id and public.owns_provider(c.provider_id)));
create policy "Admins read campaign events" on public.ad_campaign_events for select to authenticated using (public.is_admin());
create policy "Owners read campaign invoices" on public.ad_campaign_invoices for select to authenticated
using (exists(select 1 from public.ad_campaigns c where c.id=campaign_id and public.owns_provider(c.provider_id)));
create policy "Admins manage campaign invoices" on public.ad_campaign_invoices for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select,insert on public.ad_campaign_enquiries to authenticated;
grant select on public.ad_campaigns, public.ad_campaign_events, public.ad_campaign_invoices to authenticated;
create or replace function public.list_active_ad_campaigns(target_city text default null, target_category uuid default null)
returns table(id uuid, provider_id uuid, headline text, body text, creative_url text, destination_url text)
language sql stable security definer set search_path=pg_catalog,public as $$
  select c.id,c.provider_id,c.headline,c.body,c.creative_url,c.destination_url
  from public.ad_campaigns c
  where c.status in ('approved','scheduled','active')
    and c.approved_at is not null and now() between c.starts_at and c.ends_at
    and (cardinality(c.target_cities)=0 or target_city is null or lower(target_city)=any(select lower(x) from unnest(c.target_cities) x))
    and (cardinality(c.target_category_ids)=0 or target_category is null or target_category=any(c.target_category_ids))
  order by c.starts_at, c.id limit 10
$$;
grant execute on function public.list_active_ad_campaigns(text,uuid) to anon, authenticated;
create or replace function public.record_ad_campaign_event(target_campaign uuid, event_kind text, session_id uuid, placement_name text)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if event_kind not in ('impression','click') or char_length(placement_name) not between 2 and 80 then
    raise exception 'Invalid advertising event' using errcode='22023';
  end if;
  if not exists(select 1 from public.ad_campaigns c where c.id=target_campaign and c.status in ('approved','scheduled','active') and now() between c.starts_at and c.ends_at) then
    raise exception 'Campaign is not active' using errcode='22023';
  end if;
  insert into public.ad_campaign_events(campaign_id,event_type,anonymous_session_id,placement)
  values(target_campaign,event_kind,session_id,placement_name) on conflict do nothing;
end $$;
grant execute on function public.record_ad_campaign_event(uuid,text,uuid,text) to anon, authenticated;
create or replace view public.ad_campaign_performance with (security_invoker=true) as
select c.id,c.provider_id,c.name,c.status,c.starts_at,c.ends_at,
 count(e.id) filter(where e.event_type='impression') as impressions,
 count(e.id) filter(where e.event_type='click') as clicks,
 case when count(e.id) filter(where e.event_type='impression')=0 then 0
 else round(100.0*count(e.id) filter(where e.event_type='click')/count(e.id) filter(where e.event_type='impression'),2) end as click_through_rate
from public.ad_campaigns c left join public.ad_campaign_events e on e.campaign_id=c.id
group by c.id;
grant select on public.ad_campaign_performance to authenticated;
commit;
