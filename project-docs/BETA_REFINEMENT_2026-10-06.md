# Beta refinement ? 6 October 2026

## Implemented

Keyboard-aware input scrolling across customer account, provider claim, community, quote, booking and reset-password flows. Android resize behavior and older Android missing keyboard events are covered by geometry checks. Shared web focus/visual viewport handling keeps mobile fields visible; provider refreshes preserve typing and photo upload uses current form state.

Community now requests incremental 30-row pages and scoped engagement, caches private image links per account, resizes images without cropping, converts unsupported picker formats to JPEG, and releases native image resources. Low-memory phones use smaller feed rendering batches and less ambient motion. Likes have lightweight animated feedback, reduced-motion support, duplicate-submit guards and optimistic rollback.

Push registration reports configuration/permission errors, has bounded waits, refreshes rotated tokens, and routes notification taps. Backend distinguishes submission acceptance from receipt confirmation, checks receipts every five minutes, expires stale receipts without claiming delivery, and guards token removal against newer tokens.

## Released

- Admin worker: e600a4da-e380-4db8-bdc3-9259f831cdee, https://chodhiq-admin-dashboard.chodhiq.workers.dev
- Provider worker: a5a65a70-7859-4b28-b701-1f3c98c4e927, https://chodhiq-business-dashboard.chodhiq.workers.dev
- Supabase: migrations 20261006120000 and 20261006130000 applied to gfjhvsajwjrrlylgrkhf; push-notification and check-push-receipts deployed.
- Shared database types regenerated from deployed schema.

## Validation

App release checks: 126 tests, types, formatting, quality, accessibility, secret/security invariants, web export passed. Admin verification: 23 tests, lint/types/function checks/build passed. Provider verification: 28 tests, lint/types/build passed. Android Hermes export passed. New database suites passed 18 assertions before and after deployment, rollback-only with outbound push disabled inside each test transaction. Both live dashboards returned HTTP 200 and included the keyboard helper; receipt endpoint rejected unauthenticated POST with HTTP 401. Live browser interaction verification was interrupted by a browser connection timeout.

Compatible dependency patches reduced advisories; shell-quote critical advisory patched. Remaining npm audit reports 23 moderate and 29 high findings, no critical findings. These include upstream framework/build dependencies and need scoped review; forced SDK downgrades/major framework upgrades were not applied.

## Pending before new APK and beta sign-off

Firebase client configuration and FCM credentials are not configured. The prepared Firebase project setup requires the account owner to review/accept terms before creation can continue. New beta Android builds deliberately fail until valid Google services client configuration is supplied; private service-account files are excluded from source/upload. No new APK or OTA containing these native changes has been released. The previous signed v28 APK does not include this refinement.

User has no phone available. Device installation, actual soft-keyboard behavior, low-memory performance, photo picking, permission denial/recovery and foreground/background/closed-app notification display are not verified. Universal smooth performance across all mobile versions is not a guarantee; existing Android minimum is SDK 24. No Play submission was performed.

## Confirmed architecture and Play release follow-up

User confirmed on 6 October that Supabase remains the backend and Firebase is used only for Android FCM push delivery. No backend/data/auth migration is planned. Routine administration remains in the ChodhiQ dashboard.

Rechecked Firebase setup: ChodhiQ project name entered; optional developer signup off; terms not accepted and project not created. Requested account-owner completion of the legal terms step.

The store beta profile already produces a signed AAB and increments Android version codes; it remains gated on valid push client config and published legal URLs. Existing release credentials are retained. No Play submission has been made.

The legal readiness command fails because policy/store drafts contain unresolved operator/contact/age/retention and publication details. Requested approved public operator/status/address/contact/age/country details. Evidence: artifacts/beta-legal-readiness-20261006.log. Owner policy decisions and final wording approval still remain; do not publish placeholder policies.

## Firebase client configured

Account owner completed Firebase project creation: chodhiq-2650c (Spark). Android client com.chodhiq.app registered. Newly downloaded google-services.json validated against package/project and stored as an ignored workspace file. Expo project @chodhiq26/chodhiq now has GOOGLE_SERVICES_JSON as a production file environment variable.

Prepared restricted service account chodhiq-expo-push, intending only Firebase Cloud Messaging API Admin. It is not created yet; requested confirmation for persistent key generation and transfer to Expo. Internal beta APK build submitted independently of server credentials; results pending. Store AAB remains blocked by unfinished legal publication.

## FCM sending credentials completed

User explicitly approved FCM-only key generation and Expo upload. Verified chodhiq-expo-push had no role, then granted exactly Firebase Cloud Messaging API Admin; IAM confirmed that role. Generated JSON key for that account and validated project/email identity locally without printing private contents. Key stored in ignored fcm-service-account.json and excluded from EAS source archives. Expo CLI confirmed upload and assignment to com.chodhiq.app for FCM v1, using beta-apk build credentials. Firebase console confirms FCM v1 API enabled. The broader Admin SDK key downloaded by the owner was not uploaded or used.

New internal APK build: https://expo.dev/accounts/chodhiq26/projects/chodhiq/builds/4915f5e3-2434-40de-885f-91c6006bcd92 (version code 29). Build/result and device delivery validation remain pending; this is not a Play AAB. Store policies/publication details remain outstanding.

After verified Expo upload, removed the temporary private-key workspace copy; owner download remains outside source. Security/secret checks pass. No private key is retained in the app source or APK upload.

User approved ChodhiQ as the public business name. Terms and privacy drafts now describe ChodhiQ as an unregistered business run by its founding team. Actual controller details and other unresolved publication information remain placeholders; drafts are not published or approved policies.

User supplied chodhiq@gmail.com for the pending support/privacy contact. Applied to support/privacy placeholders in policy/store drafts. Moderation/appeal ownership and response commitments remain unconfirmed.

User approved minimum age 18 and beta service countries United Kingdom and India. Applied to terms/privacy drafts. This does not set operating base, governing law, hosting region, or Play distribution; app enforcement and Play settings still need to match.
