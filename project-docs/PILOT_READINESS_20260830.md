# ChodhiQ pilot readiness — 2026-08-30

## Completed without external credentials

- Added end-to-end Supabase password recovery: generic email request, `chodhiq://auth/reset` deep link, PKCE code exchange, 10-character password validation, confirmation and clean sign-out.
- Corrected Explore search/filter behavior for category synonyms, plurals, service fields, rating sort, unknown opening-hours data and case-insensitive locations.
- Guarded Google Mobile Ads and remote notification modules inside Expo Go while retaining them for installed native builds.
- Configured the EAS preview profile to disable demo data, payments and Google Ads.
- Restricted production-only secret validation to the production build profile.
- Aligned `@sentry/react-native` to Expo SDK 54's supported 7.2.0 release and corrected the config plugin.
- Blocked Android microphone permission because the customer app does not record audio.
- Ignored `.env*.local` and separated the dynamic Expo config base from the former static `app.json` conflict.
- Applied all 24 Supabase migrations and deployed six Edge Functions with appropriate JWT/webhook settings.
- Configured the push shared secret and database webhook.

## Automated evidence

- `npm run verify:release` passed on 2026-08-30.
- Formatting, code-quality checks across 68 source files, accessibility invariants, TypeScript and security invariants passed.
- 30 behavior/schema/security tests passed.
- Expo web production export completed with 3,515 modules and 20 packaged assets.

## Live directory audit

- Providers: 135
- Categories: 23
- Providers without a cover image: 128
- Providers without both phone and WhatsApp: 33
- Providers currently unverified: 127
- Placeholder-image URLs: 7; the public UI rejects these and uses category artwork instead.

## Requires manual or external ownership

- Create/sign an EAS Android preview build and install it on physical devices.
- Configure Firebase/FCM and verify remote notification permission, token, delivery and tap behavior.
- Add a real Sentry DSN and verify native crash/error delivery.
- Exercise password recovery from a real email client into an installed build.
- Run isolated customer/provider/admin RLS workflows with controlled test accounts.
- Obtain provider participation, current contact details and licensed images.
- Complete legal, accessibility-device and operational sign-offs.
- Stripe remains intentionally disabled and out of pilot scope.
