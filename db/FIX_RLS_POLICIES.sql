-- RLS Policy Diagnostic & Fix
-- Run this to diagnose and fix the RLS issue on profiles table

-- ============================================
-- Step 1: Check Current Policies
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
-- Step 2: Check if RLS is enabled
-- ============================================
SELECT 
  relname,
  relrowsecurity,
  relforcerowsecurity
FROM pg_class
WHERE relname = 'profiles';

-- ============================================
-- Step 3: Drop existing problematic policies
-- ============================================
DROP POLICY IF EXISTS "Users read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins read profiles" ON public.profiles;

-- ============================================
-- Step 4: Recreate policies with explicit logic
-- ============================================

-- SELECT: Users can only read their own profile
CREATE POLICY "Users read their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- UPDATE: Users can only update their own profile
CREATE POLICY "Users update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- INSERT: Users can only insert their own profile
CREATE POLICY "Users create their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- DELETE: Users can only delete their own profile (be careful with this)
CREATE POLICY "Users delete their own profile"
  ON public.profiles
  FOR DELETE
  USING (auth.uid() = id);

-- ADMIN BYPASS: Admins can read all profiles
-- This is commented out initially - uncomment only after admin role is properly setup
-- CREATE POLICY "Admins bypass RLS for profiles"
--   ON public.profiles
--   FOR SELECT
--   USING (
--     (SELECT auth.jwt() ->> 'role') = 'authenticated' 
--     AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
--   );

-- ============================================
-- Step 5: Verify policies are in place
-- ============================================
SELECT 
  policyname,
  tablename,
  permissive,
  roles
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

SELECT 'RLS Fix Complete - All policies recreated' AS status;
