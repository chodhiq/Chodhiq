begin;

create index if not exists ad_campaign_events_session_created_idx
  on public.ad_campaign_events (anonymous_session_id, occurred_at desc);

create or replace function public.record_ad_campaign_event(
  target_campaign uuid,
  event_kind text,
  session_id uuid,
  placement_name text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  utc_day_start timestamptz := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
  daily_events integer;
begin
  if target_campaign is null
     or session_id is null
     or event_kind is null
     or event_kind not in ('impression', 'click')
     or placement_name is null
     or placement_name !~ '^[a-z][a-z0-9_-]{1,79}$' then
    raise exception 'Invalid advertising event' using errcode = '22023';
  end if;

  -- Serialize requests for one anonymous session before enforcing its daily cap.
  perform pg_advisory_xact_lock(hashtextextended(session_id::text, 0));

  if not exists (
    select 1
    from public.ad_campaigns c
    where c.id = target_campaign
      and c.status in ('approved', 'scheduled', 'active')
      and now() between c.starts_at and c.ends_at
  ) then
    raise exception 'Campaign is not active' using errcode = '22023';
  end if;

  select count(*)::integer into daily_events
  from public.ad_campaign_events e
  where e.anonymous_session_id = session_id
    and e.occurred_at >= utc_day_start;

  if daily_events >= 200 then
    raise exception 'Advertising event limit exceeded' using errcode = 'P0001';
  end if;

  insert into public.ad_campaign_events(campaign_id, event_type, anonymous_session_id, placement)
  values (target_campaign, event_kind, session_id, placement_name)
  on conflict do nothing;
end;
$$;

revoke all on function public.record_ad_campaign_event(uuid, text, uuid, text) from public;
grant execute on function public.record_ad_campaign_event(uuid, text, uuid, text) to anon, authenticated;

commit;