-- AGGRESSIVE RLS FIX FOR PROFILES TABLE
-- This drops ALL policies and recreates them from scratch with proper role assignment

-- ============================================
-- Step 1: Drop ALL existing policies on profiles
-- ============================================
DROP POLICY IF EXISTS "Users read their own profile" ON public.profiles CASCADE;
DROP POLICY IF EXISTS "Users update their own profile" ON public.profiles CASCADE;
DROP POLICY IF EXISTS "Users create their own profile" ON public.profiles CASCADE;
DROP POLICY IF EXISTS "Users delete their own profile" ON public.profiles CASCADE;
DROP POLICY IF EXISTS "Admins bypass RLS for profiles" ON public.profiles CASCADE;
DROP POLICY IF EXISTS "Admins read profiles" ON public.profiles CASCADE;

-- ============================================
-- Step 2: Verify RLS is ENABLED on profiles
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Step 3: Recreate policies from scratch
-- ============================================

-- SELECT: Only authenticated users can read their own profile
CREATE POLICY profiles_select_own
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- UPDATE: Only authenticated users can update their own profile  
CREATE POLICY profiles_update_own
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- INSERT: Only authenticated users can insert their own profile
CREATE POLICY profiles_insert_own
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- DELETE: Only authenticated users can delete their own profile
CREATE POLICY profiles_delete_own
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- ============================================
-- Step 4: Verify all policies exist
-- ============================================
SELECT 
  policyname,
  tablename,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- ============================================
-- Step 5: Verify RLS is enabled
-- ============================================
SELECT 
  relname as table_name,
  relrowsecurity as rls_enabled,
  relforcerowsecurity as rls_forced
FROM pg_class
WHERE relname = 'profiles';

-- ============================================
-- Step 6: Test - Verify policies work
-- ============================================
-- This should return 0 rows (Customer1 cannot see Customer2's profile)
DO $$
DECLARE
  customer1_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  customer2_id uuid := '00000000-0000-0000-0000-000000000002'::uuid;
  result_count int;
BEGIN
  -- Set session as customer1
  PERFORM set_config('request.jwt.claims', 
    '{"sub":"' || customer1_id || '","role":"authenticated"}', 
    true);
  
  -- Try to see customer2's profile
  SELECT COUNT(*) INTO result_count
  FROM public.profiles
  WHERE id = customer2_id;
  
  IF result_count = 0 THEN
    RAISE NOTICE '✓ RLS WORKING: Customer1 cannot see Customer2 profile';
  ELSE
    RAISE NOTICE '❌ RLS BROKEN: Customer1 can see Customer2 profile (result_count=' || result_count || ')';
  END IF;
END $$;

SELECT 'RLS Fix Applied - Run audit script again' AS next_step;
