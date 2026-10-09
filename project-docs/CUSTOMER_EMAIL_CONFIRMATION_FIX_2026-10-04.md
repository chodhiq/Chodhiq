# Customer email confirmation fix — 4 October 2026

Status: hosted confirmation page deployed to Production, exact HTTPS redirect saved in Supabase, and Android version 1.0.0/code 24 built, downloaded and verified. The default Supabase email template remains active; this project's Free plan requires custom SMTP or an upgrade for template customization, which was not part of this rollout.

## Observed failure

The supplied iPhone recording shows the email confirmation link attempting to open another application, then reporting that the application could not be opened. Dismissing the dialog leaves a blank browser page. The Android recording shows a blank Gmail browser view after tapping the email confirmation link. Neither recording establishes whether backend email verification succeeded.

The customer signup requested a direct `chodhiq://auth/callback` redirect, with no hosted fallback. Navigation sent the callback to the ordinary welcome screen, which did not exchange a returned PKCE code.

## Changes

- Native signup and resend use `https://chodhiq-business-dashboard.chodhiq.workers.dev/auth/confirm`. Web signup keeps its own callback origin, now recognized by navigation.
- The hosted confirmation page handles verified PKCE redirects and hashed-token email links. A hashed-token link requires a deliberate Confirm email action, avoiding verification from a simple email scanner GET. Its transient Supabase client does not persist a dashboard session. Single-use values are removed from browser history; existing Worker headers prohibit caching and referrer disclosure.
- The page offers Open ChodhiQ and manual app/password-sign-in instructions. There is no automatic launch that can strand users on a blank page. Invalid or reused links show recovery instructions.
- A dedicated native callback screen exchanges codes, updates the existing account context, and opens the main app. Missing verifiers on another device offer password sign-in. OAuth and navigation share one code exchange, cleared on sign-out.
- Signup switches to sign-in after requesting confirmation. The sign-in screen offers resend. Secure-link expiry messages now request a fresh email rather than always suggesting a password reset.
- A branded confirmation template is prepared locally for future supported customization. It routes native customer confirmations to the hosted token-hash page and preserves provider/admin confirmation URLs. It was not applied to Production: the active default template verifies the email at Supabase, then redirects to the hosted page with a PKCE code.

## Verification

- Customer `npm run verify:release` passed: launch configuration, formatting, quality, accessibility, type checks, 110 tests, security checks and clean web export.
- After preserving web callback origins and using the stable callback hook, the customer formatting, quality, accessibility, type checks, 110 tests and security checks were rerun; Android/iOS Hermes exports passed.
- Business dashboard `npm run verify` passed lint, web/Worker type checks, build and 27 tests, including the hosted route response and its private/no-referrer headers.
- Live browser verification confirmed the page renders recovery instructions, removes the fake test token from browser history, and handles a deliberately invalid verification token with an expired/reused-link message. No production customer accounts were created, confirmed, modified or emailed during verification. Real phone email click-through remains pending.

## Production rollout

The browser was reconnected to the ChodhiQ Cloudflare account and Production Supabase project after the user said they were ready. Wrangler was reauthenticated through that existing browser session. The verified Worker was deployed with `--keep-vars`; initial deployed version: `ea4cff8e-49f1-422d-be72-bd935c10032c`. A further verified refinement makes Open ChodhiQ visibly actionable and explains how to sign in on the original device when the app is not installed on the email-reading device.

Supabase URL Configuration now has five exact redirect entries: the four existing business/admin/native callback/reset URLs plus `https://chodhiq-business-dashboard.chodhiq.workers.dev/auth/confirm`. The existing Site URL was preserved. This change was saved and read back in the authenticated dashboard. No bulk configuration push or credential-store probing was used.

The email template customization UI explicitly requires custom SMTP or Pro. No SMTP credentials, billing upgrade or email hook was configured. The optional `scripts/configure-email-confirmation.mjs` is prepared for a later authorized supported template rollout; it was not applied. The active default-template flow uses the verified PKCE callback branch of the hosted page and needs no custom template.

Android build: https://expo.dev/accounts/chodhiq26/projects/chodhiq/builds/ec6d6f4f-692c-4487-9fab-421cad36c12e. Profile: `production-apk`, existing remote Android keystore, internal distribution, version 1.0.0/code 24. Source hash record: `artifacts/email-confirmation-build-source.json`. No iOS IPA or store submission was performed.

Verified APK: `outputs/ChodhiQ-1.0.0-email-confirmation-v24.apk`. Download: https://expo.dev/artifacts/eas/kiW46jaTPt4EgHYPOkkgQN3N1YSVa4eZAS5jt7CeDL0.apk. SHA-256: `223c5226cfddfcddb514e23478e2246dff7beb1c8ac04985f08a5539ff821f67`. Verification confirmed package `com.chodhiq.app`, version 1.0.0/code 24, non-debuggable release, valid signature matching the established release certificate, registered `chodhiq` callback scheme and all 13 recorded uploaded customer source hashes unchanged. Full metadata: `artifacts/email-confirmation-apk-verification.json`. Repeatable verification command: `workspace-scripts/verify-email-confirmation-apk.ps1`.

After installing the updated build, request fresh confirmation emails. Previously issued emails retain their original destination. Test signup, resend, successful confirmation, app open, manual sign-in, expired/reused links and opening email on another device. The shared iOS code is export-verified, but live iPhone testing needs a build containing the fix. Check the account's confirmation state through an authorized account; do not infer it from a blank browser.

Automatic approval review rejected credential-store probing and a generated partial Supabase CLI config push. The latter could replace unrelated Production settings. Neither action was performed. The scoped Management API script replaces that unsafe rollout approach, but needs an explicitly supplied authorized credential.

## References

- [Supabase email templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Supabase redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase scoped Auth configuration endpoint](https://supabase.com/docs/reference/api/v1-update-auth-service-config)

## Deployment and live-browser checks

Final Worker version: `1046584d-2573-40fc-a083-f43ac00b81ad`, deployed with hosted variables preserved. Browser checks covered the missing-token recovery page, deliberately invalid token response, cleared token URL, visible Open ChodhiQ action and 390×844 phone layout. Screenshot: `artifacts/auth-behavior-review/live-confirmation-mobile.jpg`. No existing iOS EAS build was found; shared iOS JavaScript exports passed, but a signed iOS release still needs its release setup.

The user explicitly narrowed the remaining release work to Android and asked to leave iPhone aside. No iOS release setup or deployment is required for this task.
