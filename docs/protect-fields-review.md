# Verification and provider field protection review

This review is based on repository migrations and application code plus the production facts supplied for this change. No database was queried and no SQL was run. The migration adds two BEFORE triggers and does not edit RLS policies or replace existing triggers.

## Protected columns

### `verification_requests`

The client trigger protects `status`, `reviewed_by`, `reviewed_at`, `admin_notes`, `decision_note`, `decision`, `decided_at`, `updated_by`, `provider_id`, and `submitted_by` on update. On client inserts it forces `status = 'pending'` and nulls reviewer/decision/admin metadata (`reviewed_by`, `reviewed_at`, `admin_notes`, `decision_note`, `decision`, `decided_at`, `updated_by`). Applicants may continue to edit non-decision fields while their existing RLS policy permits the row; submitters can still edit pending request notes and other non-decision fields.

Repository schema evidence: `supabase/migrations/20260807131253_dashboard_backend.sql:28-38`; the admin decision RPC uses `decision_note` and `updated_at` in `supabase/migrations/20261023110000_admin_permission_enforcement.sql:180-193`.

### `providers`

Protected fields are `id`, `owner_id`, `is_claimed`, `is_verified`, `verification_status`, `verification_date`, `verification_expires_at`, `verified_at`, `reviewed_at`, `reviewed_by`, `avg_rating`, `rating`, `review_count`, `created_at`, `updated_at`, `source_profile_id`, `source_url`, `data_notes`, `data_verification_status`, `data_verified_at`, `sponsored_rank`, `sponsored_until`, `status`, `is_published`, `published`, `published_at`, `publication_status`, `approved_by`, `approved_at`, `moderation_status`, and `admin_notes`. JSON comparison means fields absent from a particular schema version are ignored.

Owners can edit business details such as `business_name`, `description`, `category_id`, `base_city`, `base_postcode`, `base_location`, `service_areas`, `languages_spoken`, `years_experience`, `price_range`, `phone`, `whatsapp`, `website`, `cover_image_url`, and `portfolio_urls`. Services and opening hours remain separate tables/RPC paths and are not blocked by these triggers. Provider base fields are defined in `supabase/migrations/20260805192639_create_chodhiq_marketplace_schema.sql:29-56`; later imported/source and verification columns are added by migrations `20260806123359_import_uk_south_asian_demo_directory.sql:30-37`, `20260807131253_dashboard_backend.sql:14-16`, `20260924130000_public_data_verification_badges.sql:3-5`, and `20260806183300_community_feed_and_provider_promotions.sql:14-16`.

The initial provider schema has no `status`/published field, but those names are protected if present in a later production schema.

## RPC behavior and protected writes

| RPC / function | Security mode from repository | Protected columns it writes | Result |
|---|---|---|---|
| `claim_imported_provider` | SECURITY DEFINER (`20260817120000_secure_claims_bookings_and_push_consent.sql:4-42`) | `owner_id`, `is_claimed`, `verification_status` | Continues to work; trigger sees function owner rather than `authenticated`/`anon`. Function checks auth and claim availability itself. |
| `submit_provider_verification` | SECURITY DEFINER (same migration, lines 70-93) | `verification_requests.status`, review metadata; `providers.verification_status` | Continues to work; trigger bypass is by execution role, not a caller-set custom GUC. RPC checks owned provider, existing request and evidence. |
| `set_provider_coordinates` | SECURITY DEFINER (`20261104130000_geocode_provider_locations.sql:1-54`) | No protected columns; updates `base_location` and `updated_at` | Continues to work; function independently checks authentication, coordinate range, and owner/admin/open-request relationship. `updated_at` is protected against direct client mutation, but this SECURITY DEFINER function may set it. |
| `list_claimable_providers` | SECURITY DEFINER (`20260817120000_secure_claims_bookings_and_push_consent.sql:45-68`) | None; SELECT only | Continues to work; it does not update protected columns. |
| `admin_decide_verification` (dashboard path) | SECURITY DEFINER (`20261023110000_admin_permission_enforcement.sql:180-195`) | Request status/reviewer/decision note and provider verification fields | Continues to work; its own `applications.review` permission check runs before the writes. |

**Protected-column writer as SECURITY INVOKER:** none of the four requested RPCs is SECURITY INVOKER in the repository definitions. Thus no invoker RPC needs an exception. The trigger checks the effective `current_user`; a client cannot bypass by setting a custom transaction variable. Existing SECURITY DEFINER functions (including the approved-claim trigger function) execute as their owner and retain their own authorization checks.

Service-role Edge Functions that directly mutate protected fields run with the service-role client (or privileged function owner), which is outside the `authenticated`/`anon` trigger check. This change therefore preserves those server-side workflows. It does not expose service-role credentials to the client.

## Application write-path inventory

Search scope: `src/`, `screens/`, and `supabase/functions/`, including repositories and RPC calls.

- `src/data/claimRepository.js:10` calls `list_claimable_providers` (read); lines 26-28 read provider postcode; lines 54-69 create a provider row with `owner_id`, `verification_status`, and `is_claimed`; lines 81-104 read/insert verification drafts. The new provider trigger is UPDATE-only, so the current provider INSERT is not changed by this migration. The direct verification draft INSERT at lines 94-104 is forced to `pending`; this conflicts with verification document upload policy (which requires `draft` or `changes_requested`) and can break provider onboarding/verification. Preserve this workflow by adding an authorized draft-creation SECURITY DEFINER RPC and updating its caller in a later code change, or revise the workflow before applying this migration.
- There are no direct client UPDATE statements to `providers` or `verification_requests` in the requested `src/`, `screens/`, or `supabase/functions/` search scope. However, this is not a blanket “no protected client writes” finding: `claimRepository.createProvider` INSERTs protected provider columns (outside the provider UPDATE trigger's scope), and `ensureVerificationDraft` INSERTs a draft status which the verification trigger intentionally rewrites to pending. Their RLS and upload behavior remain relevant.
- `src/data/claimRepository.js:128-145` submits via `submit_provider_verification` (SECURITY DEFINER), then remains allowed.
- `src/data/providerRepository.js:75-88` reads provider fields only.
- `src/data/accountRepository.js:200-206` reads providers only.
- `src/context/AppStateContext.js`, `src/screens/`, and other client code contain no direct `.update()` / `.upsert()` to `providers` or `verification_requests` in the search. `src/screens/MarketplaceScreens.js` writes community posts, not providers.
- `supabase/functions/create-checkout-session/index.ts:98-136` reads provider then updates a subscription request, not the provider row.
- No Edge Function in `supabase/functions/` directly writes `providers` or `verification_requests` was found by table-targeted search. Database RPCs and triggers do write these tables: `claim_imported_provider`, `submit_provider_verification`, `assign_approved_claim_owner`, the admin verification RPC, moderation resolution, account deletion cleanup, and `set_provider_coordinates`.
- Outside the requested path search, `business-dashboard/app/page.tsx:930-936` also directly inserts a provider row with `owner_id`, `is_claimed`, and `verification_status`; it is not blocked by the new UPDATE-only provider trigger. Verify the insert policy/server authorization separately.

## Production owner/admin and existing triggers

- The owner RLS policy can continue allowing ALL on a submitted request, but the trigger prevents an owner from changing decision/ownership fields. Pending owners retain their non-decision edits.
- Existing verification triggers are not dropped or replaced. The new BEFORE trigger runs ahead of the existing AFTER decision/audit/notification triggers. The deferred evidence constraint still verifies that a request entering `pending` has uploaded evidence.
- A client insert attempting `status='approved'` is rewritten to `pending`; the approval trigger will not see an approved transition. Its admin metadata is cleared.
- An ordinary authenticated direct update to protected provider trust values is rejected. Admin users are exempt from the provider trigger per the specified `is_admin()` design; verification direct admin writes additionally require `admin_has_permission('applications.review')`. The dashboard verification UI calls the guarded SECURITY DEFINER `admin_decide_verification` RPC.
- Existing Security Definer service workflows are preserved. The `assign_approved_claim_owner` trigger function executes as its owner, so it can assign `owner_id`, `is_claimed`, and verification state after an authorized admin-approved status change.

## Eight read-only checks to run after migration deployment

These statements only inspect catalogs; they do not alter data.

```sql
-- 1. Confirm both new triggers are present and enabled.
select c.relname as table_name, t.tgname, t.tgenabled
from pg_trigger t join pg_class c on c.oid = t.tgrelid
where not t.tgisinternal and t.tgname in (
  'protect_verification_request_client_fields_trigger',
  'protect_provider_trust_fields_trigger'
);

-- 2. Inspect the installed verification guard body.
select pg_get_functiondef('public.protect_verification_request_client_fields()'::regprocedure);

-- 3. Inspect the installed provider guard body.
select pg_get_functiondef('public.protect_provider_trust_fields()'::regprocedure);

-- 4. Verify requested RPC security modes and function owners.
select p.oid::regprocedure as function_name, p.prosecdef as security_definer,
       r.rolname as function_owner
from pg_proc p join pg_roles r on r.oid = p.proowner
where p.oid in (
  'public.claim_imported_provider(uuid)'::regprocedure,
  'public.submit_provider_verification(uuid,text)'::regprocedure,
  'public.set_provider_coordinates(uuid,double precision,double precision)'::regprocedure,
  'public.list_claimable_providers()'::regprocedure
);

-- 5. Confirm the admin verification RPC checks its reviewer permission.
select pg_get_functiondef('public.admin_decide_verification(uuid,text,timestamp with time zone,text,text)'::regprocedure);

-- 6. Inspect verification request columns available in this production schema.
select column_name, data_type
from information_schema.columns
where table_schema='public' and table_name='verification_requests'
order by ordinal_position;

-- 7. Inspect provider columns available in this production schema.
select column_name, data_type
from information_schema.columns
where table_schema='public' and table_name='providers'
order by ordinal_position;

-- 8. Confirm these triggers did not replace the pre-existing verification triggers.
select c.relname as table_name, t.tgname, t.tgenabled
from pg_trigger t join pg_class c on c.oid = t.tgrelid
where not t.tgisinternal and c.relname='verification_requests'
order by t.tgname;
```

If testing actual rejections, use a disposable production-like staging database and a transaction under the `authenticated` role with a real test-user JWT; issue a protected update and roll the transaction back. Do not try such an update against production data.

## Plain-English change and possible breakage

Ordinary client sessions can no longer mark a business verified, change its ownership or reputation values, or approve/reject a verification request. A new client-created verification request is always pending and cannot contain fabricated reviewer details. A legitimate owner can still update the business profile fields and submit evidence through the existing verification RPC.

The main compatibility concern is verification onboarding: `ensureVerificationDraft` inserts a `draft`, while this migration forces client inserts to `pending`; the pending row will not satisfy the existing verification-document upload policy. Add a tightly authorized draft-creation SECURITY DEFINER RPC and update the client caller before applying this migration. Provider creation itself is INSERT-only and remains unaffected because the provider guard is BEFORE UPDATE only. Existing owner business-edit screens should be checked to ensure their update payload does not include protected or admin-managed fields. Admin verification remains available through `admin_decide_verification`; the supplied production facts also confirm that current authenticated table UPDATE grants are broader than desired, but this migration relies on its triggers to reject unauthorized values rather than changing grants or RLS policies.

