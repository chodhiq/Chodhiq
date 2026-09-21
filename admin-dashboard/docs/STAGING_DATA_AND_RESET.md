# Fictional staging data and reset procedure

Use only a confirmed staging project. Never run this process against production.

## Seed approach

Create a reviewed staging-only migration or script that upserts deterministic fictional records prefixed with `Demo —`. Do not seed Auth passwords in SQL or commit credentials. Create test identities through the Supabase dashboard or a secured bootstrap script, then reference their IDs through temporary environment variables.

Required fixtures:

- `Demo — Kerala Kitchen Birmingham` provider with services and recent analytics events.
- `Demo — Pending Verification` request with a private synthetic document.
- `Demo — Reported Provider` and an open provider report.
- A fictional community post and open post report.
- Fictional reviews in published and removed states.
- `Demo — Suspended User` plus an active fictional user.
- Subscription request, entitlement, payment record, notification, and audit history fixtures.

Use obviously synthetic emails under an owned test domain. Verification documents must contain no real identity, address, or financial data. Upload them to the private `verification-documents` bucket under the fictional owner's path.

## Reset

1. Stop the showcase and record the correlation IDs created during rehearsal.
2. Run a staging-only reset RPC or transaction that targets deterministic demo IDs or records whose names begin with `Demo —`; never use an unscoped delete.
3. Restore the provider's safe editable field, verification request status, report states, community-post state, and user moderation status.
4. Reconcile the fictional user's Supabase Auth ban state with `user_moderation_status` through the trusted Edge Function.
5. Remove rehearsal audit rows only if staging policy explicitly permits reset cleanup; production audit rows remain append-only.
6. Re-run fixture assertions and the showcase smoke flow.

## Preflight assertions

- Every fixture exists exactly once.
- The demo administrator has `app_metadata.role = admin`.
- The suspended demo user is not an administrator or protected account.
- The sample verification document opens only through a short-lived signed URL.
- No fixture contains a real person's data.
