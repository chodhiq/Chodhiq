-- Harden the two public Storage bucket listing findings reported by the
-- Supabase Database Linter on 2026-10-21.
--
-- Do not try to enable RLS or revoke grants on public.spatial_ref_sys here.
-- Supabase documents that PostGIS owns this table and that the project
-- postgres role may not alter it. The supported PostGIS relocation procedure
-- requires a verified backup and dependency review (DROP EXTENSION ... CASCADE)
-- or assistance from Supabase Support. See project-docs/SUPABASE_SECURITY_ADVISOR_2026-10-21.md.
begin;

-- These buckets are public and app code consumes stored public URLs. Storage
-- object SELECT policies grant bucket-wide listing, which is unnecessary for
-- fetching a known public object URL. Supabase serves public bucket assets
-- without an authenticated Storage SELECT policy. Keep upload/delete policies
-- and the bucket's public flag intact.
drop policy if exists "Public reads provider media" on storage.objects;
drop policy if exists "Public reads ad creative files" on storage.objects;

commit;
