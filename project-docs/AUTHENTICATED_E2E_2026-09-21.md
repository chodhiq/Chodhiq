# Authenticated staging E2E - 2026-09-21

Source under test: `v1.0.0-rc.1` (`f0df4f53a23ec30f976e61994a512d1a88bae560`)

Run identifier: `1789998495462-ddd42659`

## Result

**FAILED - 33 checks passed, 3 launch-blocking checks failed**

The suite created disposable customer, secondary-customer, provider-owner, claimant, administrator, and role-target accounts. API credentials were obtained in process memory through the authenticated Supabase CLI and were neither printed nor written to disk.

## Passed coverage

- Login with confirmed disposable accounts.
- Customer profile update and cross-customer profile denial.
- Private business-proof upload, owner access, administrator access, and cross-customer denial.
- Provider application submission and audited administrator approval.
- Provider service creation and non-owner mutation denial.
- Customer quote creation and cross-customer quote denial.
- Provider lead-queue creation, provider notification, and transactional quote reply.
- Customer booking creation, cross-customer booking denial, and provider confirmation.
- Customer review creation and provider review reply.
- Imported-provider claim creation with ownership withheld before approval.
- Verification-document upload, customer denial, administrator access, submission, approval, and ownership assignment.
- Community post/report creation and audited administrator removal.
- Administrator audit visibility and non-admin audit denial.
- User suspension and reactivation through the deployed `admin-user-control` function.
- Administrator role grant through `admin-role-control`.
- Non-admin role-change denial.
- Authenticated customer account deletion.

## Failed coverage

### E2E-AUTH-01 - Customer registration returns HTTP 500

Public `signUp` returned an Auth retryable HTTP 500. The test provisioned a confirmed fallback account through the service API so downstream workflows could continue. This began after the profile-sync migration was applied and requires Auth/database log review before release.

### E2E-AUTH-02 - Password recovery returns HTTP 500

`resetPasswordForEmail` returned an Auth retryable HTTP 500. Verify SMTP configuration, redirect allowlists, email templates, and Auth logs. Password recovery is not launch-ready.

### E2E-ADMIN-01 - Administrator role revocation is ineffective

`admin-role-control` returned success for `revoke`, but the target retained `app_metadata.role = "admin"`. The function deletes the property locally and sends the resulting object to `updateUserById`; the Auth update appears to merge metadata and preserve the omitted key. Revocation must explicitly overwrite or null the role and then verify the persisted user before reporting success.

## Cleanup

Aborted exploratory runs initially left 12 `e2e-` accounts because audit-log foreign keys blocked Auth deletion. The cleanup harness was corrected to remove dependent audit/moderation rows and surface returned deletion errors. All 12 disposable accounts and their dependent test records were removed.

Reusable harnesses:

- `tests/staging-full-workflows.mjs`
- `tests/cleanup-staging-e2e.mjs`

## Release decision

Authenticated staging E2E is **not passed**. Registration, recovery, and administrator-role revocation must be fixed and the suite rerun with zero failures before launch approval.
