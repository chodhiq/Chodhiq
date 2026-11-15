begin;

alter table public.ad_campaigns
  alter column provider_id drop not null,
  alter column destination_url drop not null;

alter table public.ad_campaigns
  drop constraint if exists ad_campaigns_destination_url_check;

alter table public.ad_campaigns
  add constraint ad_campaigns_destination_url_check
  check (destination_url is null or destination_url ~ '^https://');

commit;
