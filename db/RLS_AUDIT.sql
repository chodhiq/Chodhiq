-- Rollback-only profiles RLS audit for a non-production Supabase project.
-- Fixtures and changes are always rolled back, including after failed assertions.

BEGIN;

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
VALUES
  ('00000000-0000-4000-8000-000000000001',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'rls-customer-1@chodhiq.invalid', crypt('RollbackOnly-1!', gen_salt('bf')),
   now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb),
  ('00000000-0000-4000-8000-000000000002',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'rls-customer-2@chodhiq.invalid', crypt('RollbackOnly-2!', gen_salt('bf')),
   now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb);

INSERT INTO public.profiles (id, full_name, phone, city)
VALUES
  ('00000000-0000-4000-8000-000000000001', 'RLS Customer One', '07700000001', 'Birmingham'),
  ('00000000-0000-4000-8000-000000000002', 'RLS Customer Two', '07700000002', 'London');

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}', true
);

DO $$
DECLARE own_count integer; other_count integer;
BEGIN
  SELECT count(*) INTO own_count FROM public.profiles
  WHERE id = '00000000-0000-4000-8000-000000000001';
  SELECT count(*) INTO other_count FROM public.profiles
  WHERE id = '00000000-0000-4000-8000-000000000002';

  IF own_count <> 1 THEN
    RAISE EXCEPTION 'RLS audit failed: customer cannot read own profile';
  END IF;
  IF other_count <> 0 THEN
    RAISE EXCEPTION 'RLS audit failed: customer can read another profile';
  END IF;

  UPDATE public.profiles SET full_name = 'Forbidden update'
  WHERE id = '00000000-0000-4000-8000-000000000002';
  IF FOUND THEN
    RAISE EXCEPTION 'RLS audit failed: customer updated another profile';
  END IF;

  RAISE NOTICE 'Profiles RLS audit passed';
END $$;

RESET ROLE;
ROLLBACK;

SELECT 'Profiles RLS audit passed; all fixtures rolled back' AS result;
