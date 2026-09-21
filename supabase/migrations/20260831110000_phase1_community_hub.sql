-- ChodhiQ Phase 1 community hub, lead attachments, consent gates, and MVP measurement.
create table if not exists public.quote_request_attachments (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references public.quote_requests(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null check (mime_type like 'image/%'),
  byte_size bigint check (byte_size is null or byte_size between 1 and 10485760),
  created_at timestamptz not null default now()
);
alter table public.quote_request_attachments enable row level security;
create policy "Quote participants read attachments" on public.quote_request_attachments for select to authenticated
using (exists (select 1 from public.quote_requests q where q.id=quote_request_id and (q.user_id=auth.uid() or public.owns_provider(q.provider_id))));
create policy "Customers add quote attachments" on public.quote_request_attachments for insert to authenticated
with check (exists (select 1 from public.quote_requests q where q.id=quote_request_id and q.user_id=auth.uid()));
create policy "Customers delete quote attachments" on public.quote_request_attachments for delete to authenticated
using (exists (select 1 from public.quote_requests q where q.id=quote_request_id and q.user_id=auth.uid()));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('quote-attachments','quote-attachments',false,10485760,array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy "Customers upload own quote images" on storage.objects for insert to authenticated
with check (bucket_id='quote-attachments' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "Quote participants read stored images" on storage.objects for select to authenticated
using (bucket_id='quote-attachments' and exists (
  select 1 from public.quote_request_attachments a join public.quote_requests q on q.id=a.quote_request_id
  where a.storage_path=name and (q.user_id=auth.uid() or public.owns_provider(q.provider_id))
));
create policy "Customers delete own quote images" on storage.objects for delete to authenticated
using (bucket_id='quote-attachments' and (storage.foldername(name))[1]=auth.uid()::text);
create table if not exists public.provider_lead_deliveries (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references public.quote_requests(id) on delete cascade,
  provider_id uuid not null references public.providers(id) on delete cascade,
  channel text not null check (channel in ('in_app','email','whatsapp')),
  destination text,
  status text not null default 'pending' check (status in ('pending','sent','skipped','failed')),
  attempts integer not null default 0,
  last_error text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  unique(quote_request_id,channel)
);
alter table public.provider_lead_deliveries enable row level security;
create policy "Owners read lead delivery status" on public.provider_lead_deliveries for select to authenticated using (public.owns_provider(provider_id));
create policy "Admins manage lead deliveries" on public.provider_lead_deliveries for all to authenticated using (public.is_admin()) with check (public.is_admin());
create or replace function public.queue_provider_quote_lead() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare owner uuid; email_address text; whatsapp_number text; business text;
begin
  select p.owner_id,u.email,p.whatsapp,p.business_name into owner,email_address,whatsapp_number,business
  from public.providers p left join auth.users u on u.id=p.owner_id where p.id=new.provider_id;
  if owner is not null then
    insert into public.notifications(user_id,title,body) values(owner,'New quote request','A customer requested a quote for '||coalesce(business,'your business')||'.');
    insert into public.provider_lead_deliveries(quote_request_id,provider_id,channel,status,delivered_at)
    values(new.id,new.provider_id,'in_app','sent',now()) on conflict do nothing;
  end if;
  if email_address is not null then insert into public.provider_lead_deliveries(quote_request_id,provider_id,channel,destination) values(new.id,new.provider_id,'email',email_address) on conflict do nothing; end if;
  if whatsapp_number is not null then insert into public.provider_lead_deliveries(quote_request_id,provider_id,channel,destination) values(new.id,new.provider_id,'whatsapp',whatsapp_number) on conflict do nothing; end if;
  return new;
end $$;
drop trigger if exists queue_provider_quote_lead_trigger on public.quote_requests;
create trigger queue_provider_quote_lead_trigger after insert on public.quote_requests for each row execute function public.queue_provider_quote_lead();
create table if not exists public.community_events (
  id uuid primary key default gen_random_uuid(), title text not null check(char_length(title) between 3 and 160),
  summary text not null check(char_length(summary) between 3 and 2000), event_type text not null default 'community',
  starts_at timestamptz not null, ends_at timestamptz, venue_name text, address text, city text not null,
  postcode text, map_url text, booking_url text, contact_email text, contact_phone text, image_url text,
  organizer_name text not null, publication_consent boolean not null default false,
  status text not null default 'draft' check(status in ('draft','review','published','cancelled')),
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(ends_at is null or ends_at>=starts_at), check(status<>'published' or publication_consent)
);
alter table public.community_events enable row level security;
create policy "Anyone reads published events" on public.community_events for select to anon,authenticated using(status='published' and publication_consent);
create policy "Admins manage events" on public.community_events for all to authenticated using(public.is_admin()) with check(public.is_admin());
create table if not exists public.community_resources (
  id uuid primary key default gen_random_uuid(), resource_type text not null check(resource_type in ('association','student_society','nurse_group','relocation','emergency','public_service')),
  name text not null, summary text not null, city text, region text, website_url text, contact_email text, contact_phone text, whatsapp_url text,
  source_url text not null, rights_basis text not null check(rights_basis in ('owner_consent','public_service','licensed')),
  consent_reference text, consent_confirmed_at timestamptz, status text not null default 'draft' check(status in ('draft','review','published','retired')),
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(status<>'published' or rights_basis='public_service' or consent_confirmed_at is not null)
);
alter table public.community_resources enable row level security;
create policy "Anyone reads published resources" on public.community_resources for select to anon,authenticated using(status='published');
create policy "Admins manage resources" on public.community_resources for all to authenticated using(public.is_admin()) with check(public.is_admin());
create table if not exists public.mvp_events (
  id bigint generated always as identity primary key, event_type text not null check(event_type in ('install','signup','offer_view','event_view','community_resource_view')),
  installation_id text, user_id uuid references auth.users(id) on delete set null, entity_id uuid, created_at timestamptz not null default now()
);
alter table public.mvp_events enable row level security;
create policy "Clients record MVP events" on public.mvp_events for insert to anon,authenticated with check(user_id is null or user_id=auth.uid());
create policy "Admins read MVP events" on public.mvp_events for select to authenticated using(public.is_admin());
create unique index if not exists mvp_one_install on public.mvp_events(installation_id) where event_type='install';
create table if not exists public.directory_import_candidates (
  id uuid primary key default gen_random_uuid(), business_name text not null, source_url text not null, source_checked_at timestamptz,
  contact_channel text, contact_reference text, publication_consent text not null default 'not_contacted' check(publication_consent in ('not_contacted','contacted','consented','declined','expired')),
  consent_evidence text, image_rights_evidence text, provider_id uuid references public.providers(id) on delete set null,
  status text not null default 'research' check(status in ('research','awaiting_consent','ready','imported','rejected')),
  notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(status not in ('ready','imported') or (publication_consent='consented' and consent_evidence is not null))
);
alter table public.directory_import_candidates enable row level security;
create policy "Admins manage consent gated imports" on public.directory_import_candidates for all to authenticated using(public.is_admin()) with check(public.is_admin());
create or replace view public.mvp_success_metrics with (security_invoker=true) as
select
 (select count(*) from public.mvp_events where event_type='install')::bigint as installs,
 (select count(*) from public.profiles)::bigint as signups,
 (select count(*) from public.providers)::bigint as businesses_listed,
 (select count(*) from public.providers where owner_id is not null)::bigint as businesses_claimed,
 (select count(*) from public.quote_requests)::bigint as quote_requests,
 (select count(*) from public.quote_requests where status in ('accepted','responded','completed') or response_message is not null)::bigint as quote_responses,
 (select count(*) from public.mvp_events where event_type='offer_view')::bigint as offer_views,
 (select count(*) from public.mvp_events where event_type='event_view')::bigint as event_views;
grant select,insert on public.quote_request_attachments,public.mvp_events to authenticated;
grant insert on public.mvp_events to anon;
grant select on public.community_events,public.community_resources to anon,authenticated;
grant select on public.provider_lead_deliveries to authenticated;
grant select,insert,update,delete on public.community_events,public.community_resources,public.directory_import_candidates to authenticated;
grant select on public.mvp_success_metrics to authenticated;
create index if not exists community_events_start_idx on public.community_events(status,starts_at);
create index if not exists community_resources_type_idx on public.community_resources(status,resource_type);
create index if not exists lead_delivery_pending_idx on public.provider_lead_deliveries(status,created_at) where status='pending';
