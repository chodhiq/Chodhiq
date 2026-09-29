-- Hide imported Leicester directory entries without deleting provider rows.
-- Keeping the provider IDs intact preserves reviews, quote requests, bookings,
-- saved items, services, and other related records.
begin;

alter table public.providers
  add column if not exists is_listed boolean not null default true;

update public.providers
set is_listed = false,
    updated_at = now()
where (
    source_profile_id like 'leicester-seed-%'
    or source_profile_id like 'leicester-fsa-%'
  )
  and coalesce(is_claimed, false) = false
  and owner_id is null
  and coalesce(is_verified, false) = false;

drop policy if exists "Public reads providers" on public.providers;
create policy "Public reads listed providers and owners"
  on public.providers
  for select
  using (
    is_listed
    or owner_id = (select auth.uid())
    or public.is_admin()
  );

commit;