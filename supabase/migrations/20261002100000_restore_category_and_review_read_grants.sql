-- Public-read RLS policies exist from the initial schema, but clean restores
-- must not depend on Supabase's implicit/default table privileges.
-- Restore discovery reads for guests and signed-in users; keep RLS and all
-- existing write privileges unchanged.
grant select on public.categories, public.reviews to anon, authenticated;
