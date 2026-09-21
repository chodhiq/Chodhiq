-- Safe profiles RLS repair.
-- Transactional, never disables RLS, and preserves unrelated provider/admin policies.

BEGIN;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Replace only the customer self-service policies managed by this migration.
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
DROP POLICY IF EXISTS "Users read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users delete their own profile" ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles
  FOR DELETE TO authenticated USING (auth.uid() = id);

DO $$
DECLARE missing_count integer;
BEGIN
  SELECT count(*) INTO missing_count
  FROM (VALUES ('profiles_select_own'), ('profiles_insert_own'),
    ('profiles_update_own'), ('profiles_delete_own')) expected(policyname)
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_policies actual
    WHERE actual.schemaname = 'public'
      AND actual.tablename = 'profiles'
      AND actual.policyname = expected.policyname
  );
  IF missing_count <> 0 THEN
    RAISE EXCEPTION 'Profiles RLS repair incomplete: % policies missing', missing_count;
  END IF;
END $$;

COMMIT;

SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY policyname;
