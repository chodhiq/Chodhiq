-- FINAL RLS DIAGNOSTIC - Debug auth.uid() behavior
-- This will help us understand why RLS is not working

-- ============================================
-- Test 1: Check if auth.uid() works at all
-- ============================================
SELECT 'Test 1: Direct auth.uid() call' as test;
SELECT auth.uid() as current_user_id;

-- ============================================
-- Test 2: Set JWT claims and check if it's recognized
-- ============================================
SELECT 'Test 2: After setting JWT claims' as test;
SET request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
SELECT auth.uid() as current_user_id_after_set;

-- ============================================
-- Test 3: Try a direct RLS query
-- ============================================
SELECT 'Test 3: Direct query with RLS policies' as test;

-- This should return 1 row (own profile)
SELECT COUNT(*) as "Own profile (should be 1)"
FROM public.profiles
WHERE id = '00000000-0000-0000-0000-000000000001';

-- This should return 0 rows (other's profile - blocked by RLS)
SELECT COUNT(*) as "Other profile (should be 0)"
FROM public.profiles
WHERE id = '00000000-0000-0000-0000-000000000002';

-- ============================================
-- Test 4: Check what the RLS policies see
-- ============================================
SELECT 'Test 4: Raw SQL to see all profiles (bypass RLS)' as test;
SELECT id, full_name FROM public.profiles;

-- ============================================
-- Test 5: Check if authenticated role exists
-- ============================================
SELECT 'Test 5: Check authenticated role' as test;
SELECT rolname FROM pg_roles WHERE rolname = 'authenticated';

-- ============================================
-- Test 6: List all policies again with their definitions
-- ============================================
SELECT 'Test 6: All RLS policies on profiles' as test;
SELECT 
  policyname,
  permissive,
  roles,
  qual as select_condition
FROM pg_policies
WHERE tablename = 'profiles';

SELECT 'Diagnostic complete' as result;
