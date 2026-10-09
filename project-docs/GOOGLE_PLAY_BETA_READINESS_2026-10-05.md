# Google Play beta readiness — 5 October 2026

## Decision

The Android customer app has a viable closed-test path, but the current source is **not yet a verified Play beta artifact**. The first closed-test upload should follow a signed AAB build, end-to-end Android checks, and a provider booking test. A public release on 15 October is a target only. If the Play developer account is a personal account created after 13 November 2023, Google requires at least 12 testers continuously opted in to closed testing for 14 days before an application for production access; a 7 October start cannot satisfy that by 15 October. Confirm the account type and creation date in Play Console.

## Existing architecture and beta functions

- Customer: Expo SDK 54 / React Native 0.81 app at the workspace root. The package is `com.chodhiq.app`; current app version is `1.0.0`; EAS manages Android version codes remotely. Expo SDK 54 targets Android API 36, matching Google's current new-app requirement.
- Provider: React/Vinext web app in `business-dashboard`. Administration is in `admin-dashboard`.
- Backend: Supabase Auth, Postgres/RLS, Storage, Realtime and Edge Functions, with migrations in `supabase`.
- Existing customer flows include email confirmation and password recovery, bookings, quote requests, community posts/photos, notifications, permission requests, offline/local data, account export and account deletion. Payments and Google ads are disabled in the Android beta profile.
- Android internal APKs exist, including a verified email-confirmation version 24. The latest community-interaction source was submitted as APK version 26, but the saved status is only `IN_PROGRESS`; neither an installed phone result nor an AAB for the current source is recorded.

## Findings and fixes by priority

| Priority | Area | Evidence and action |
| --- | --- | --- |
| P0 — fixed in source, deployment pending | Booking delivery | The customer inserts into `bookings`, but the provider dashboard's Bookings tab rendered quote leads and its loader did not query bookings. Added a provider-scoped booking query, a real Bookings view, visible load errors, refresh and status actions. Verify with separate customer/provider accounts before beta. |
| P0 — fixed in source, deployment pending | Account deletion | `delete-account` removed verification and provider files but omitted the user-prefixed `community-images` bucket. Added cleanup before auth user deletion. Deploy the function and test with a disposable account after other journeys. |
| P0 | Release provenance | The working tree contains substantial uncommitted changes; existing APKs do not represent the current source. Checkpoint the reviewed source, set a matching release commit, build a signed beta AAB and record its hash, version code and Play track. |
| P0 | Play setup and privacy | Store/legal worksheet remains draft. Verify a public privacy-policy URL and an outside-app account-deletion URL, complete Data safety/content rating/app access/listing and screenshots against the exact AAB, then create the closed tester list. Play Console account type and production-access status are unknown. |
| P0 | Security and live workflow evidence | The release evidence register still marks role isolation, private uploads, fresh staging migrations and authenticated workflows `NOT RUN`. Run these with separate test accounts; do not run the older staging mutation harness against Production. |
| P1 — fixed in source | Account export | `PrivacyScreen` called `Share.share` without importing `Share`. Added the import; verify the export action on Android. |
| P1 | Authentication | Hosted email confirmation and callback fixes are built in APK v24, but real phone signup, resend, invalid/expired link, password reset and cross-device sign-in remain unverified. |
| P1 | Notifications | Database dispatch and push function have local and deployment evidence, but open/background/killed delivery, Android channel behaviour and opt-out need real-device proof. An accepted Expo push ticket alone is not delivery proof. |
| P1 | Uploads | Community photos use a private 5 MB bucket and signed read URLs. Verify upload persistence after restart, failed upload cleanup, permissions and deletion on physical Android. |
| P1 — recovery added in source | Permissions/session | Denied location and community-photo requests now offer device settings while preserving manual area selection or text-only posting. Settings exposes a notification-permission recovery link. Denial/recovery and signed-in/signed-out restart behaviour still need phone tests. |
| P1 | Observability/operations | `npm run monitoring:check` fails for missing `SENTRY_AUTH_TOKEN` and a release commit mismatch. Incident owners and rollback/restore drill evidence remain open. |
| P2 | Bookings reliability | The customer button disables while saving, but retry after an ambiguous network failure can create another request. Test repeated taps and loss of connection; add server idempotency if reproduced. |
| P2 | Provider data | The older content audit found incomplete provider images, contact details and verification. Recheck participating beta listings and their owners. |
| P2 — prepared in source, deployment pending | Advertising | Admins can upload a JPEG/PNG/WebP creative (5 MB maximum) for a verified provider, review its HTTPS destination and schedule, then approve or pause it. A campaign is served only during its approved active window; no active campaign leaves no first-party ad card in the app. Google banners are disabled in the beta profile. Deploy the new storage/RLS migration and admin dashboard, then verify upload, approval, impression, click and pause on a device. |
| P2 — prepared in source, deployment pending | Community privileges | The admin dashboard includes community-space visibility, posting/comment switches, owner/moderator/member roles and individual posting/comment restrictions. Database RPCs audit changes, reject stale edits and prevent removal of the last owner; direct and queued posts have enforcement checks. Deploy the privileges migration and dashboard, run the database test suite and verify member/owner separation with distinct live accounts. |
| P0 — publication pending | Terms and privacy | The [terms](legal/TERMS_OF_SERVICE.md) and [privacy notice](legal/PRIVACY_POLICY.md) now cover community content, personal resale and sponsored cards. They remain publication candidates because operator/contact details, age, retention and counsel-approved clauses are unresolved. `npm run legal:check` currently blocks publication. Public policy and deletion URLs must be live and linked from the app/store before Play submission. |
| P3 | Design polish | Defer visual refinements until critical journeys pass. |

No live backend mutation, dashboard deployment, Play upload or tester invitation is included in these source fixes.

The [workflow and privacy source audit](WORKFLOW_AND_PRIVACY_AUDIT_2026-10-05.md) records the later legal-link build guard, broader account export, sign-out/deletion state fixes and cross-product verification. The operator details remain undecided, so no legal page is published and the beta EAS build requires approved HTTPS Terms, Privacy and deletion URLs.

## Advertising and community release order

1. Apply migrations through `20261005110000_admin_ad_creatives.sql` to the intended environment and run the Supabase database tests, including `community_privileges.test.sql`.
2. Deploy the admin dashboard from the same reviewed source. Sign in as a platform administrator; confirm the **Advertising** and **Community privileges** navigation entries. A community owner must not gain platform administration.
3. Upload a test image for a verified provider with a harmless HTTPS destination and short future schedule. Confirm it stays hidden in review, appears only after approval and within the schedule, shows a **PROMOTED** label, and disappears after pause or expiry. Check the app when no campaign exists: there must be no empty ad slot.
4. Create a test community space; change posting/comment rules; add a member, moderator and owner; verify restrictions with separate accounts and confirm the last owner cannot be removed. Check the admin audit log.
5. Remove the test campaign and users/content according to the test-data cleanup plan. Do not enable third-party Google banners as part of the first beta.

## Local verification of current beta source

On 5 October, the customer `npm run verify:release` passed formatting, quality, accessibility, type checks, 111 tests, security and web export. `npx expo export --platform android --output-dir artifacts/beta-android-export --clear` produced an Android Hermes bundle. The provider `npm run verify` passed lint, web/worker type checks, build and 27 tests. The updated deletion Edge Function passed Deno checking. These checks do not establish real-device or Play-distributed behaviour.

The later advertising/community pass also passed the customer release verification. After starting Docker Desktop, all six pending migrations applied to the **local** Supabase database and all 158 database assertions passed across nine files, including the community privilege and image tests. The Stripe SDK billing-period type mismatch in `stripe-webhook/index.ts` was corrected to use subscription-item periods; the complete admin `npm run verify` now passes lint, web/worker/Edge Function type checks, build and 23 tests. The legal publication check correctly fails until the approved operator and policy values are supplied.

## Concrete implementation and test checklist

1. Complete and review the source fixes above. Run customer release verification, provider `npm run verify`, and Edge Function type checking.
2. Deploy the updated provider dashboard and `delete-account` function through the existing scoped release process. Record deployment identifiers.
3. With two isolated customers and two provider owners, test booking creation, provider visibility, confirmation/decline, notification, RLS separation and network retry. Test account deletion last, including a community photo and stale-session restart.
4. Resolve legal/operator placeholders; verify public privacy and deletion pages; reconcile the Play Data safety form and permissions with the exact signed manifest. Prepare store copy, icon and screenshots.
5. Confirm Play developer account type/date and app registration. Use the `beta` EAS profile to build an Android App Bundle with production-safe backend configuration and a release commit matching reviewed source. Verify package, version code, target API, signing and artifact hash.
6. Install the Play-distributed build via internal test first, then closed testing for the controlled 20–40 testers. Add their Google accounts to one Play Console email list or Google Group. Send the **same** Play opt-in URL once through a group message, website or QR code; each tester must opt in with an eligible Google account before installing. A closed-test app is not discoverable through ordinary Play search before open/production release. Subsequent updates arrive through Play. Record tester ID, device/OS, build, expected/actual result, reproduction and redacted logs.
7. Gate promotion on zero open P0/P1 issues, completed physical-device journeys, backend evidence, monitoring and incident ownership. Apply the account-specific Play waiting period before planning a production date.

## Play policy references

- [Testing requirements for new personal developer accounts](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en-GB)
- [Set up and share a closed test](https://support.google.com/googleplay/android-developer/answer/9845334?hl=en)
- [Target API requirements](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en)
- [Account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en-EN)
- [Expo SDK 54 Android versions](https://docs.expo.dev/versions/v54.0.0/)
