begin;

-- Remove only the guards and trigger functions introduced by
-- 20261106100000_protect_verification_and_provider_fields.sql.
drop trigger if exists protect_verification_request_client_fields_trigger
  on public.verification_requests;
drop trigger if exists protect_provider_trust_fields_trigger on public.providers;

drop function if exists public.protect_verification_request_client_fields();
drop function if exists public.protect_provider_trust_fields();

commit;
