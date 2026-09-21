# Business account applications

Implemented and deployed to ChodhiQ Production (`gfjhvsajwjrrlylgrkhf`) on 2026-09-09. ChodhiQ Staging (`ljhncdzhzoatonhhofbv`) remains separate for prototype accounts and testing.

1. Business dashboard → Create account → confirm email → sign in.
2. Enter business name, category, UK town/city, postcode and UK phone number. The confirmed account email is used as the application email.
3. Upload UK business evidence (PDF/JPG/PNG, maximum 10 MB). Files live in the private `business-application-proofs` bucket.
4. Submit to the pending page. The response deadline is 72 hours after submission. No automatic approval occurs when the deadline passes.
5. Admin dashboard → Business applications → review details and private proof → approve, reject or request changes. Rejection and changes require a reason visible to the applicant.
6. Approval atomically creates a verified provider, changes the application status and writes an audit record. The applicant can refresh and open the workspace. Rejected applications can be corrected and resubmitted.

`NEXT_PUBLIC_BUSINESS_ENQUIRY_EMAIL` is intentionally unset. Add the user-supplied address to the business dashboard build environment and rebuild when available. Until then the overdue page explains that an enquiry email will be added; it contains no invented contact address.

## Release sequence

- Both production dashboard builds and the local customer-app production environment use the Production project URL and publishable key. Keep staging credentials in staging-only environments.
- `supabase/migrations/20260909100000_business_applications.sql` and the preceding pending security migrations are applied to Production.
- Confirm Auth signup is enabled, email confirmation is enabled, and the business dashboard origin is allowed as an email redirect. A session without a confirmed email cannot submit an application.
- Run `npm run verify` in both dashboard directories. Run `supabase/tests/business_application_workflow.test.sql` against the target in its rollback-only transaction.
- Deploy each verified dashboard using its existing Cloudflare Worker configuration and `--keep-vars` as documented in `DASHBOARD_HOSTING.md`.
- Check create account, email confirmation, upload, pending state, private proof review and approval with authorized test accounts. Do not operate the user's browser without permission.

## Validation evidence

Both dashboard verification commands passed (lint, TypeScript, builds, 38 tests in total). The SQL workflow test passed in rolled-back transactions on both staging and Production, including applicant isolation, denial of self-approval/direct status updates, idempotent submission, requests for changes/resubmission, stale revision rejection, provider provisioning and audit entries. Test accounts and records were rolled back. Both Cloudflare dashboards were deployed and their main/application routes returned HTTP 200. Production email signup is enabled and email confirmation is required. Production still needs its first administrator account before applications can be reviewed.

## Customer app verification — 2026-09-09

The customer app passed TypeScript, 40 tests, security checks and a clean Production web export. The clean export embeds only the Production Supabase host; an earlier cached export still embedded Staging, so the root `verify` command now clears the Metro cache before exporting. Read-only Production startup queries succeeded for categories, providers, reviews, review replies, services, opening hours and community posts. Production currently contains nine active categories and 112 provider listings, but no reviews, services, opening hours or published community posts. Browser UI automation was unavailable in the current environment, so visual interaction remains to be checked on a device or supported browser.
