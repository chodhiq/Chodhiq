# Production target status — 2026-09-22

| Product | Target and evidence | Status |
| --- | --- | --- |
| Admin dashboard | Production Worker `chodhiq-admin-dashboard`; deployed version `386d36f9-b0a6-438e-ac93-9b4f3581474f`. The hosted applications page loaded after deployment in an authenticated administrator session. | Live |
| Business dashboard | Production Worker `chodhiq-business-dashboard`; deployed version `a2c16696-d1c5-4d46-97d8-116837e52fa7`. The hosted sign-in page loaded after deployment with the new confirmation resend action. | Live |
| Customer Expo app | Local `.env` and `.env.local` point to Production Supabase; the clean web export contains the Production project reference and no Staging project reference. The Production EAS profile selects the Production environment and channel. Google Ads, demo mode, and payments are disabled for this build. | Signed Android Production `.aab` built; store release pending. iOS signing blocked. |

`npm run launch:config` checks the same Production Supabase URL and public key across all three products, plus both hosted dashboard site URLs. `app.config.js` rejects any other Supabase URL during a Production EAS build. Historical Staging mutation scripts have explicit Staging project guards and are outside the active release workflow.

The Expo CLI is signed in as `chodhiq` and can read `@chodhiq26/chodhiq`. The existing Production EAS Supabase URL, public key, and project ID match the local Production configuration. The owner confirmed there is no Sentry project, so the Sentry build plugin is optional when all Sentry settings are absent; partial Sentry configuration still fails Production config evaluation. Monitoring remains unavailable and its separate readiness check remains incomplete.

Android Production build `47282b3b-3801-473c-88be-2dc1232d15ba` finished successfully at 2:12 pm IST. EAS produced a signed Play Store `.aab` for version 1.0.0 (version code 10). No automatic store submission was requested. The build used the Production EAS environment; no Staging target was selected. The iOS Production attempt stopped before upload: Expo requires Apple Developer account sign-in to establish the missing signing credentials. The owner confirmed there is no Apple Developer membership, and no Apple credentials were entered. The Android build still needs Play Console upload, device testing, and a release decision; neither platform has a store submission.

Google Play Console opened under `chodhiq@gmail.com` on a **Creating a developer account** page. After the owner enabled 2-step verification, the flow advanced to the personal-versus-organization ownership choice; this account does not currently expose an existing ChodhiQ app listing. ChodhiQ is not yet a registered organization. Google Play Help says personal accounts created now require a closed test with at least 12 opted-in testers for 14 continuous days before applying for Production access, while organization enrollment requires a D-U-N-S number. Google now documents an individual-to-organization account conversion flow after organization payment-profile verification. The owner must choose whether to begin personal-account enrollment or wait for the organization's registration. No Play release was created.

Google Play references: [account type](https://support.google.com/googleplay/android-developer/answer/13634885), [personal account testing](https://support.google.com/googleplay/android-developer/answer/14151465), and [changing account type](https://support.google.com/googleplay/android-developer/answer/13634888).

## Live data update — 24 September 2026

The Supabase CLI was relinked to the same Production project reference used by
the customer app. The staging-only `20260910130000` migration was recorded as
skipped/applied without executing its staging data in Production. Production
then received the provider read-grant restoration, Auth profile synchronization,
and `20260924120000_import_fsa_confirmed_leicester_food_businesses.sql`.

The live anonymous REST API returned all 28 expected FSA-backed Leicester
listings with their expected postcodes. These listings remain unclaimed and do
not receive the ChodhiQ verified-business badge.
