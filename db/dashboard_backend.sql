-- ChodhiQ provider + admin dashboard backend
-- Apply through Supabase migrations. Does not touch PostGIS extension objects.

create or replace function public.is_admin()
returns boolean
language sql stable
set search_path = ''
as $$
  select coalesce((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
$$;

grant execute on function public.is_admin() to authenticated;

alter table public.providers add column if not exists verification_status text not null default 'unverified'
  check (verification_status in ('unverified','pending','verified','rejected','suspended'));
alter table public.providers add column if not exists updated_at timestamptz not null default now();

create table if not exists public.review_replies (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null unique references public.reviews(id) on delete cascade,
  provider_id uuid not null references public.providers(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  submitted_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('draft','pending','approved','changes_requested','rejected')),
  notes text,
  admin_notes text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);

create table if not exists public.verification_documents (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.verification_requests(id) on delete cascade,
  provider_id uuid not null references public.providers(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  document_type text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.subscription_plans (
  code text primary key,
  name text not null,
  price_pence integer not null check (price_pence >= 0),
  promotion_limit integer not null default 0,
  search_tier smallint not null default 0,
  features jsonb not null default '[]'::jsonb,
  active boolean not null default true
);

insert into public.subscription_plans(code,name,price_pence,promotion_limit,search_tier,features) values
 ('free','Free',0,0,0,'["Business profile","Contact details","Maps and search visibility"]'),
 ('community','Community',1000,3,0,'["3 promotional image posts monthly","Community feed visibility","Verified badge after approval"]'),
 ('top10','Top 10',2500,3,10,'["Everything in Community","Promoted Top 10 placement","Higher search visibility"]'),
 ('top5','Top 5',5000,3,5,'["Everything in Top 10","Promoted Top 5 placement","Maximum visibility"]')
on conflict (code) do update set name=excluded.name, price_pence=excluded.price_pence,
 promotion_limit=excluded.promotion_limit, search_tier=excluded.search_tier, features=excluded.features;

alter table public.provider_entitlements add column if not exists plan_code text references public.subscription_plans(code) default 'free';
alter table public.provider_entitlements add column if not exists stripe_customer_id text;
alter table public.provider_entitlements add column if not exists stripe_subscription_id text;

create table if not exists public.subscription_requests (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  plan_code text not null references public.subscription_plans(code),
  status text not null default 'pending' check (status in ('pending','checkout_created','active','cancelled','failed')),
  created_at timestamptz not null default now()
);

create table if not exists public.payment_records (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  transaction_id text unique,
  amount_pence integer not null,
  currency text not null default 'gbp',
  status text not null,
  receipt_url text,
  invoice_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.provider_analytics_events (
  id bigint generated always as identity primary key,
  provider_id uuid not null references public.providers(id) on delete cascade,
  event_type text not null check (event_type in ('view','call','whatsapp','website','direction','save','share')),
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.community_post_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  unique(post_id, reporter_id)
);

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  admin_id uuid not null references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

do $$ begin
  insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values ('provider-media','provider-media',true,10485760,array['image/jpeg','image/png','image/webp'])
  on conflict (id) do nothing;
  insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values ('verification-documents','verification-documents',false,10485760,array['image/jpeg','image/png','application/pdf'])
  on conflict (id) do nothing;
end $$;

alter table public.review_replies enable row level security;
alter table public.verification_requests enable row level security;
alter table public.verification_documents enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.subscription_requests enable row level security;
alter table public.payment_records enable row level security;
alter table public.provider_analytics_events enable row level security;
alter table public.community_post_reports enable row level security;
alter table public.admin_audit_log enable row level security;

create policy "Public reads review replies" on public.review_replies for select using (true);
create policy "Owners manage review replies" on public.review_replies for all to authenticated
 using (author_id=(select auth.uid()) and exists(select 1 from public.providers p where p.id=provider_id and p.owner_id=(select auth.uid())))
 with check (author_id=(select auth.uid()) and exists(select 1 from public.providers p where p.id=provider_id and p.owner_id=(select auth.uid())));
create policy "Owners manage verification requests" on public.verification_requests for all to authenticated
 using (submitted_by=(select auth.uid()) or public.is_admin()) with check (submitted_by=(select auth.uid()) or public.is_admin());
create policy "Owners manage verification metadata" on public.verification_documents for all to authenticated
 using (uploaded_by=(select auth.uid()) or public.is_admin()) with check (uploaded_by=(select auth.uid()) or public.is_admin());
create policy "Public reads active plans" on public.subscription_plans for select using (active);
create policy "Owners create subscription requests" on public.subscription_requests for insert to authenticated
 with check (requested_by=(select auth.uid()) and exists(select 1 from public.providers p where p.id=provider_id and p.owner_id=(select auth.uid())));
create policy "Owners read subscription requests" on public.subscription_requests for select to authenticated
 using (requested_by=(select auth.uid()) or public.is_admin());
create policy "Owners read their payments" on public.payment_records for select to authenticated
 using (exists(select 1 from public.providers p where p.id=provider_id and p.owner_id=(select auth.uid())) or public.is_admin());
create policy "Owners read their analytics" on public.provider_analytics_events for select to authenticated
 using (exists(select 1 from public.providers p where p.id=provider_id and p.owner_id=(select auth.uid())) or public.is_admin());
create policy "Authenticated reports community posts" on public.community_post_reports for insert to authenticated
 with check (reporter_id=(select auth.uid()));
create policy "Admins manage community reports" on public.community_post_reports for all to authenticated
 using (public.is_admin()) with check (public.is_admin());
create policy "Admins read audit log" on public.admin_audit_log for select to authenticated using (public.is_admin());
create policy "Admins write audit log" on public.admin_audit_log for insert to authenticated with check (public.is_admin() and admin_id=(select auth.uid()));

create policy "Owners update their provider" on public.providers for update to authenticated
 using (owner_id=(select auth.uid()) or public.is_admin()) with check (owner_id=(select auth.uid()) or public.is_admin());
create policy "Owners create provider" on public.providers for insert to authenticated with check (owner_id=(select auth.uid()) or public.is_admin());
create policy "Owners manage services" on public.services for all to authenticated
 using (exists(select 1 from public.providers p where p.id=provider_id and (p.owner_id=(select auth.uid()) or public.is_admin())))
 with check (exists(select 1 from public.providers p where p.id=provider_id and (p.owner_id=(select auth.uid()) or public.is_admin())));
create policy "Owners manage provider hours" on public.provider_hours for all to authenticated
 using (exists(select 1 from public.providers p where p.id=provider_id and (p.owner_id=(select auth.uid()) or public.is_admin())))
 with check (exists(select 1 from public.providers p where p.id=provider_id and (p.owner_id=(select auth.uid()) or public.is_admin())));
create policy "Admins manage providers" on public.providers for delete to authenticated using (public.is_admin());
create policy "Admins read profiles" on public.profiles for select to authenticated using (public.is_admin());
create policy "Admins manage verification entitlements" on public.provider_entitlements for all to authenticated
 using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage posts" on public.community_posts for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins read provider reports" on public.provider_reports for select to authenticated using (public.is_admin());

create policy "Owners upload provider media" on storage.objects for insert to authenticated
 with check (bucket_id='provider-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Owners manage provider media" on storage.objects for update to authenticated
 using (bucket_id='provider-media' and ((storage.foldername(name))[1]=(select auth.uid())::text or public.is_admin()));
create policy "Owners delete provider media" on storage.objects for delete to authenticated
 using (bucket_id='provider-media' and ((storage.foldername(name))[1]=(select auth.uid())::text or public.is_admin()));
create policy "Public reads provider media" on storage.objects for select using (bucket_id='provider-media');
create policy "Owners upload verification files" on storage.objects for insert to authenticated
 with check (bucket_id='verification-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Owners and admins read verification files" on storage.objects for select to authenticated
 using (bucket_id='verification-documents' and ((storage.foldername(name))[1]=(select auth.uid())::text or public.is_admin()));

create index if not exists analytics_provider_created_idx on public.provider_analytics_events(provider_id,created_at desc);
create index if not exists verification_status_idx on public.verification_requests(status,submitted_at);
create index if not exists community_reports_status_idx on public.community_post_reports(status,created_at);

grant select on public.subscription_plans, public.review_replies to anon, authenticated;
grant select,insert,update,delete on public.review_replies, public.verification_requests, public.verification_documents, public.subscription_requests to authenticated;
grant select on public.payment_records, public.provider_analytics_events, public.admin_audit_log to authenticated;
grant insert,select,update on public.community_post_reports to authenticated;
