# ChodhiQ beta launch readiness — 7 October 2026

## Decision

**The source tree is verified, but this beta is not cleared for broad download yet.** The app and all three web products pass their local verification workflows, Expo SDK 57 is aligned, and the Android JavaScript bundle exports successfully. No new signed APK was created: the automatic approval review rejected the EAS build because it would upload private app source and build context to Expo. The review states that general beta-preparation authorization is not specific approval for that upload and prohibits an indirect workaround.

The last signed APK is beta v28 from 6 October. It predates the current workspace source and must not be presented as this readiness pass. Keep a single tester distribution point and replace its active entry only after a new signed APK has been built and inspected.

## Local verification

- `npm run verify:all` — passed all four products after dependency changes.
- Customer Expo app — SDK 57.0.27, React Native 0.86.3; Expo Doctor 21/21; launch config, format, source-quality, accessibility, TypeScript, 129 tests, security invariants, redacted secret scan, and Expo web export passed.
- Admin dashboard — ESLint, web/worker/Edge Function types, production build, and 23 tests passed.
- Provider dashboard — ESLint, web/worker types, production build, and 28 tests passed.
- Coming-soon site — lint and production build/prerender passed.
- Android Expo export — passed; Android Hermes JavaScript bundle is 8.6 MB. This is a JS export, not a signed or installable APK.
- Web build stacks were updated to compatible Vinext/Vite/RSC/Cloudflare plugin versions. Node server-render tests now resolve Cloudflare's tracing binding in their test loader; production Worker code retains the platform binding.

## Security and operational gates

| Area | Current evidence | Release impact |
|---|---|---|
| Mobile npm audit | 38 findings: 24 high, 14 moderate, no critical. Safe `npm audit fix` made no changes; npm's suggested Expo 44 / React Native 0.72 downgrades conflict with SDK 57. | Requires advisory-by-advisory triage before expanding to unrestricted downloads. |
| Admin npm audit | 22 findings: 15 high, 7 moderate, no critical; production-only audit has zero findings. | Remaining findings are in development/build tooling. |
| Provider npm audit | 20 findings: 13 high, 7 moderate, no critical; production-only audit has zero findings. | Remaining findings are in development/build tooling. |
| Public site npm audit | 16 findings: 12 high, 3 moderate, 1 low, no critical; production-only audit has 6 high, 3 moderate, 1 low. | Review edge/runtime Vinext dependency advisories before deploying the site. Safe fixes would require a breaking Vinext downgrade; no force install was used. |
| Quote-request throttle | Migration `20261007130000_quote_request_rate_limits.sql` and SQL tests are in the workspace; Supabase CLI reports no access token in this session. Migration/test was not run on staging or production. | Do not claim the production database enforces this limit. Rehearse on staging, then use the normal reviewed database rollout. |
| Sentry release monitoring | `npm run monitoring:check` fails locally: source-map upload token is missing and configured release identity differs from Git HEAD. Secret values were not inspected or reported. | Confirm the EAS production environment has the complete Sentry setup and correct release identifier, or deliberately disable Sentry for the internal beta. |
| Legal publication | `npm run legal:check` reports unresolved operator, address, recipients, transfers, retention, moderation and liability values. | Keep public policy routes/store submission gated until the real business/legal details are approved. Internal beta profile does not require public legal URLs. |
| Android device behavior | No device run was performed in this workspace session. Login, notification permission/delivery, vibration setting, image picker, keyboard, install/upgrade, and community flows still need a signed build on real Android devices. | Required before describing login/push/vibration findings as resolved on-device. |
| Production database/security | PostGIS `public.spatial_ref_sys` warning is platform-owned metadata and not a customer-data exposure; do not retry the ineffective revoke. Live migration parity, policy matrix, storage/auth/backup configuration and deployed function parity remain outside local verification. | No production security certification is implied. |

## One-link release practice

Until the next APK exists, v28 remains the only signed tester APK on record, but it is not current to the source. Do not circulate it as the build verified here. After EAS build approval, record exactly one active build page and one download URL in this document, plus version code, SHA-256 and test status. Archive superseded URLs under a clearly labelled history section; distribute only the active URL. Give every future update a new version and update this single active entry.

## Current artifact record

- Last signed APK: beta v28, version code 28, app version 1.0.0; source/build details and previous URL are in [the 6 October release record](RELEASE_2026-10-06.md).
- Current source base commit: `51f156e0fb1d0f15a65586babd5d7fe90669b5ea`; the workspace has substantial uncommitted source changes, so this commit alone does not identify the verified build input.
- New APK: **not built**. EAS submission was blocked by automatic approval review before source upload.
- New APK signature, manifest, permissions and SHA-256: **not applicable; no new APK exists**.

## Approval needed to create the APK

The automatic approval review requires explicit authorization to upload the private customer-app source and EAS build context to Expo's EAS Build service. Once approved, build the `beta-apk` profile using existing signing credentials, inspect the resulting signed APK, and replace the active tester link above only after verification.
