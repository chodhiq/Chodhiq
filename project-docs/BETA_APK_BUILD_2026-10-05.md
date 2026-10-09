# ChodhiQ internal beta APK - 5 October 2026

## Status

Build `9f86f6aa-3c96-40eb-ad92-f3e401120c46` finished successfully after the user explicitly approved building through Expo. The APK has been downloaded and verified. The verified source was uploaded to the existing project `@chodhiq26/chodhiq`, ID `599ec186-c5e2-4228-b7f4-17ea866c409b`, using Android versionCode 27 and the existing remote signing credentials.

[Expo build page](https://expo.dev/accounts/chodhiq26/projects/chodhiq/builds/9f86f6aa-3c96-40eb-ad92-f3e401120c46)

[Download beta APK](https://expo.dev/artifacts/eas/j2UwLGaMHKX48oSZmMuEFegk6lnv-hBreaq6Xlnzi7c.apk)

Local file: `outputs/ChodhiQ-1.0.0-beta-v27.apk`.

## Build configuration

- Profile: `beta-apk`; internal Android APK, not a Play submission.
- Update channel: `beta-internal`, separate from existing production and Play beta channels.
- Package: `com.chodhiq.app`; retain the existing signing certificate so testers can update an existing installation.
- App version: follows the existing 1.0.0 strategy; Android versionCode increases through EAS remote versioning.
- Live backend required; missing backend configuration, a different Supabase project, or demo mode is rejected.
- Test promotional cards enabled; payments, Google banner delivery, and Google Maps disabled in the profile.
- Store-oriented profiles still require approved public Terms, Privacy, and account-deletion URLs. The internal APK uses the existing limited beta data-use disclosure while legal publication is pending.
- No personal legal details were inserted. Draft legal documents, dashboards, environment files, credentials, and Git metadata are excluded from the inspected upload archive.

## Verification

`npm run verify:release` passed launch configuration, formatting, source quality, accessibility invariants, TypeScript, 114 tests, security/secret checks, and the web export. `npx expo export --platform android --output-dir dist-beta-android --clear` produced the Android Hermes bundle successfully.

The EAS archive was inspected and its 346 files matched the current workspace hashes. The `.easignore` Git rule was corrected from `.git/` to `.git` because EAS tests that directory explicitly. The corrected archive excludes Git metadata and private inputs. Source hashes are recorded in `artifacts/beta-apk-build-source-20261005.json`; the Git HEAD alone does not represent the uncommitted workspace changes included in this build.

## APK verification

- Signature: Android `apksigner verify` passed.
- Signing certificate SHA-256: `ff6e67bc38d2394f9587919770499a8ffb4d23b0aa354544d9ccd76813b3baa2`, matching the existing ChodhiQ release certificate.
- Manifest: `com.chodhiq.app`, versionName `1.0.0`, versionCode `27`, non-debuggable release APK.
- SDK: minimum 24; target 36.
- File size: 108,864,092 bytes.
- APK SHA-256: `35d0d9d568371b8be1a3212c7d4636fa6dce07167f6b4b2c78010348cde74b2e`.
- All 346 recorded source files still match their inspected upload hashes.
- Verification record: `artifacts/beta-apk-verification.json`.

Phone runtime testing remains required. This is a direct-install testing APK. Building it does not deploy dashboard changes, Supabase migrations, or Edge Functions, and does not publish legal pages or submit a Google Play release. The Play beta still requires the approved public legal URLs and its AAB build.
