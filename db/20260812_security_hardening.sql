-- ChodhiQ production security hardening.
-- Apply after the existing schema/dashboard migrations.
-- Deny-by-default, explicit operations, protected-column enforcement.

begin;

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = pg_catalog
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role' = 'admin', false)
$$;

create or replace function public.owns_provider(target_provider uuid)
returns boolean
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.providers
    where id = target_provider and owner_id = auth.uid()
  )
$$;

revoke all on function public.is_admin() from public, anon;
revoke all on function public.owns_provider(uuid) from public, anon;
grant execute on function public.is_admin(), public.owns_provider(uuid) to authenticated;

-- A provider owner may edit listing content but may never self-verify, transfer
-- ownership, or change moderation state. Admin changes are allowed and audited
-- separately by the application/backend workflow.
create or replace function public.protect_provider_security_fields()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  -- Controlled SECURITY DEFINER workflows may perform only these narrowly
  -- defined transitions. RLS still prevents clients updating unowned rows.
  if current_setting('chodhiq.provider_workflow', true) = 'claim'
     and old.owner_id is null
     and coalesce(old.is_claimed, false) = false
     and new.owner_id = auth.uid()
     and new.is_claimed = true
     and new.verification_status = 'unverified'
     and new.is_verified is not distinct from old.is_verified then
    null;
  elsif current_setting('chodhiq.provider_workflow', true) = 'submit_verification'
     and old.owner_id = auth.uid()
     and new.owner_id is not distinct from old.owner_id
     and new.is_claimed is not distinct from old.is_claimed
     and new.is_verified is not distinct from old.is_verified
     and new.verification_status = 'pending' then
    null;
  elsif not public.is_admin() and (
    new.owner_id is distinct from old.owner_id or
    new.is_verified is distinct from old.is_verified or
    new.is_claimed is distinct from old.is_claimed or
    new.verification_status is distinct from old.verification_status
  ) then
    raise exception 'Protected provider fields require administrator access' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end
$$;

drop trigger if exists protect_provider_security_fields on public.providers;
create trigger protect_provider_security_fields before update on public.providers
for each row execute function public.protect_provider_security_fields();

-- Prevent customers changing provider ownership/status fields on quote rows.
create or replace function public.protect_quote_fields()
returns trigger language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if not public.is_admin() and public.owns_provider(old.provider_id) then
    if new.user_id is distinct from old.user_id or new.provider_id is distinct from old.provider_id
       or new.message is distinct from old.message or new.preferred_contact is distinct from old.preferred_contact then
      raise exception 'Providers may only update quote status' using errcode = '42501';
    end if;
  elsif not public.is_admin() then
    if new.user_id is distinct from old.user_id or new.provider_id is distinct from old.provider_id
       or new.status is distinct from old.status then
      raise exception 'Customers cannot change quote ownership, provider, or status' using errcode = '42501';
    end if;
  end if;
  return new;
end
$$;

drop trigger if exists protect_quote_fields on public.quote_requests;
create trigger protect_quote_fields before update on public.quote_requests
for each row execute function public.protect_quote_fields();

-- Database validation remains authoritative if the mobile app is bypassed.
alter table public.profiles drop constraint if exists profiles_full_name_length;
alter table public.profiles add constraint profiles_full_name_length check (full_name is null or char_length(full_name) between 1 and 100) not valid;
alter table public.profiles drop constraint if exists profiles_phone_length;
alter table public.profiles add constraint profiles_phone_length check (phone is null or char_length(phone) <= 30) not valid;
alter table public.quote_requests drop constraint if exists quote_message_length;
alter table public.quote_requests add constraint quote_message_length check (message is not null and char_length(message) between 1 and 2000) not valid;
alter table public.quote_requests drop constraint if exists quote_contact_allowed;
alter table public.quote_requests add constraint quote_contact_allowed check (preferred_contact in ('whatsapp','call','email')) not valid;
alter table public.quote_requests drop constraint if exists quote_status_allowed;
alter table public.quote_requests add constraint quote_status_allowed check (status in ('sent','viewed','responded','closed')) not valid;
alter table public.provider_reports drop constraint if exists provider_report_details_length;
alter table public.provider_reports add constraint provider_report_details_length check (details is null or char_length(details) between 3 and 1500) not valid;

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);
alter table public.stripe_webhook_events enable row level security;
revoke all on public.stripe_webhook_events from anon, authenticated;

-- Column-level least privilege prevents public API clients from retrieving
-- ownership and internal moderation fields even though listings are readable.
revoke select on public.providers from anon, authenticated;
grant select (
  id, business_name, category_id, description, base_city, base_postcode,
  service_areas, languages_spoken, years_experience, price_range, phone,
  whatsapp, website, google_place_id, cover_image_url, portfolio_urls,
  is_verified, avg_rating, review_count, created_at, updated_at
) on public.providers to anon;
grant select (
  id, owner_id, business_name, category_id, description, base_city, base_postcode,
  service_areas, languages_spoken, years_experience, price_range, phone,
  whatsapp, website, google_place_id, cover_image_url, portfolio_urls,
  is_verified, is_claimed, verification_status, avg_rating, review_count,
  sponsored_rank, sponsored_until,
  created_at, updated_at
) on public.providers to authenticated;

revoke select on public.reviews from anon;
grant select (id, provider_id, rating, comment, created_at) on public.reviews to anon;

-- Replace broad customer policies with operation-specific policies.
drop policy if exists "Users manage their own saved items" on public.saved_items;
create policy "Users read own saved items" on public.saved_items for select to authenticated using (user_id = auth.uid());
create policy "Users create own saved items" on public.saved_items for insert to authenticated with check (user_id = auth.uid());
create policy "Users delete own saved items" on public.saved_items for delete to authenticated using (user_id = auth.uid());

drop policy if exists "Users manage their own quote requests" on public.quote_requests;
create policy "Customers read own quotes" on public.quote_requests for select to authenticated using (user_id = auth.uid());
create policy "Customers create own quotes" on public.quote_requests for insert to authenticated with check (user_id = auth.uid());
create policy "Customers edit own quote message" on public.quote_requests for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Customers delete own quotes" on public.quote_requests for delete to authenticated using (user_id = auth.uid());
create policy "Provider owners read received quotes" on public.quote_requests for select to authenticated using (public.owns_provider(provider_id));
create policy "Provider owners update received quote status" on public.quote_requests for update to authenticated using (public.owns_provider(provider_id)) with check (public.owns_provider(provider_id));

drop policy if exists "Owners manage verification requests" on public.verification_requests;
create policy "Owners read verification requests" on public.verification_requests for select to authenticated using (submitted_by = auth.uid() or public.is_admin());
create policy "Owners create verification requests" on public.verification_requests for insert to authenticated with check (submitted_by = auth.uid() and public.owns_provider(provider_id));
create policy "Admins update verification requests" on public.verification_requests for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins delete verification requests" on public.verification_requests for delete to authenticated using (public.is_admin());

drop policy if exists "Owners manage verification metadata" on public.verification_documents;
create policy "Owners read verification metadata" on public.verification_documents for select to authenticated using (uploaded_by = auth.uid() or public.is_admin());
create policy "Owners create verification metadata" on public.verification_documents for insert to authenticated with check (uploaded_by = auth.uid() and public.owns_provider(provider_id));
create policy "Owners delete own verification metadata" on public.verification_documents for delete to authenticated using (uploaded_by = auth.uid());
create policy "Admins manage verification metadata" on public.verification_documents for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Users can see reports they submitted; only admins can view all/update them.
create policy "Users read own provider reports" on public.provider_reports for select to authenticated using (reporter_id = auth.uid());
create policy "Admins manage provider reports" on public.provider_reports for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Verification files cannot be overwritten in place by owners.
drop policy if exists "Owners manage provider media" on storage.objects;
create policy "Owners update provider media" on storage.objects for update to authenticated
using (bucket_id='provider-media' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()))
with check (bucket_id='provider-media' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()));
create policy "Owners delete verification files" on storage.objects for delete to authenticated
using (bucket_id='verification-documents' and (storage.foldername(name))[1]=auth.uid()::text);

commit;

-- Expected result: zero application tables without RLS.
select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind in ('r','p') and not c.relrowsecurity
and pg_get_userbyid(c.relowner)=current_user;
