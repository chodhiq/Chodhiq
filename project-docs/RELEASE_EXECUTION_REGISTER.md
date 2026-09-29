# ChodhiQ release execution register

Updated: 2026-09-22

## Current verification target

Live verification now uses ChodhiQ Production (`gfjhvsajwjrrlylgrkhf`) and the deployed ChodhiQ Workers. The staging rows below record earlier work and are not the active run target. Use `npm run launch:config` to check local project alignment, each product's verification command for code, and read-only live checks before account-owner sign-in tests. Do not run the older staging mutation or cleanup harnesses against Production. See `DASHBOARD_HOSTING.md` and `PROVIDER_EMAIL_CONFIRMATION_2026-09-22.md` for current configuration and confirmation-link evidence.

Automated local verification passed for all three products on 2026-08-29: 59 tests, three production builds/exports, lint, formatting, TypeScript, accessibility and security invariants. This does not replace staging or physical-device evidence.

Customer-app verification passed again on 2026-08-30 after adding password recovery, Expo Go native-module guards, Explore filter corrections, preview-build feature gates and Expo-compatible Sentry 7.2.0: 30 tests plus formatting, 68-file quality checks, accessibility, TypeScript, security invariants and a production web export.

| Gate                   | State    | Next executable action                                                                                                                                      | Required input/owner                                                    |
| ---------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Source checkpoint      | COMPLETE | Push reviewed commits to confirmed remotes.                                                                                                                 | Repository owner and remote confirmation                                |
| Local database suite   | BLOCKED  | Start Docker Desktop, then run `npx supabase test db` from `chodhiq`.                                                                                       | Local Docker daemon                                                     |
| Staging link           | COMPLETE | Linked and connectivity-checked against project `ljhncdzhzoatonhhofbv`.                                                                                     | Reconfirm environment ownership before public release.                  |
| Migrations/functions   | COMPLETE | All 24 local migrations match remote; six required Edge Functions are active.                                                                               | Preserve deployment evidence and repeat on the final release candidate. |
| Authenticated security | BLOCKED  | Populate isolated test accounts/env vars and run staging workflow plus RLS matrix.                                                                          | Two customers, two providers, admin accounts                            |
| Stripe                 | BLOCKED  | Configure test secrets/webhook and exercise complete lifecycle/replay matrix.                                                                               | Stripe test account and price IDs                                       |
| Push/telemetry         | PARTIAL  | Push shared secret, database webhook and function are configured; add FCM/APNs and Sentry DSN, then test receipt/tap/redaction.                             | Expo/Firebase/Apple and monitoring accounts                             |
| Android/iOS            | READY    | Preview profile disables demo mode, payments and Google Ads; produce signed builds and execute device matrix.                                               | EAS access, Apple/Google credentials, devices                           |
| Browser/accessibility  | READY    | Deploy staging dashboards; execute browser, keyboard, zoom and screen-reader matrix.                                                                        | Staging URLs, Safari/iOS and assistive-tech testers                     |
| Provider content       | BLOCKED  | Audit found 135 providers: 128 lack cover images, 33 lack phone and WhatsApp, 127 are unverified. Confirm participation/details and obtain licensed images. | Business outreach owner                                                 |
| Legal                  | BLOCKED  | Counsel reviews this pack, privacy/retention spec and product behaviour.                                                                                    | Named UK counsel/controller                                             |
| Operations             | BLOCKED  | Assign owners; configure alerts; execute restore and rollback drills.                                                                                       | Named primary/backup owners                                             |

Public release remains blocked until every Priority 0 item in `QA_RELEASE_EVIDENCE.md` has dated evidence and the legal/operations sign-offs are complete.
