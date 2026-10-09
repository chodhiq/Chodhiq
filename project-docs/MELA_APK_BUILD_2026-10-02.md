# Mela Feed friends-test APK — 2 October 2026

Build completed successfully on Expo EAS and was downloaded into the authoritative
ChodhiQ workspace.

| Field | Value |
| --- | --- |
| File | `outputs/ChodhiQ-1.0.0-mela-feed-v18.apk` |
| EAS build ID | `5ac95a5a-949a-46b8-a00f-af5075adb8e8` |
| Build page | https://expo.dev/accounts/chodhiq26/projects/chodhiq/builds/5ac95a5a-949a-46b8-a00f-af5075adb8e8 |
| Profile / distribution | `production-apk` / internal |
| Update channel | production |
| App package | `com.chodhiq.app` |
| Version / Android version code | 1.0.0 / 18 |
| Size | 108,234,656 bytes |
| APK SHA-256 | `f1063568524ab6171721fbd839643bd2908ce892b7f04d21c3dfd677da9a6945` |
| Signing certificate SHA-256 | `ff6e67bc38d2394f9587919770499a8ffb4d23b0aa354544d9ccd76813b3baa2` |
| Base Git commit | `51f156e0fb1d0f15a65586babd5d7fe90669b5ea` |
| App source manifest SHA-256 | `00a7e2989f3b2f1c7796fb861a15397de5d1844c9973c6011885f318cde4a085` |
| Expo fingerprint | `63a3d88f2b78d54d72740c5224e47b0170a79bab` |

## Source and configuration

This is a build of the current working tree, including uncommitted community and
Mela Feed changes, not just the base commit. `artifacts/mela-apk-source-manifest.json`
records 157 app-source/asset hashes and the working-tree status. Every hash still
matched after the build. The EAS build message also records the source hash prefix.

The production APK profile overrides EXPO_PUBLIC_RELEASE_COMMIT with the current
full base commit. Existing .env/.env.local files were preserved. The Sentry upload
token remains an EAS secret; it was not copied into local configuration. Its
absence from local monitoring:check is expected. The local release value remains
older, but the APK uses the profile override.

The existing remote Android keystore was used. Version code was incremented from
17 to 18. Demo mode, Google Maps, payments and Google ads are disabled by this
profile. No app-store submission or OTA update was performed.

## Verification

- Launch configuration, source security invariants and secret-exposure audit passed.
- Build-profile JSON formatting and Git whitespace checks passed.
- The earlier UI verification passed 92 tests, typechecks, formatting, quality,
  accessibility checks and web export.
- EAS completed Android bundling, native compilation and packaging successfully.
- Android aapt confirms package/version and a non-debuggable release APK.
- Android apksigner cryptographically verifies the APK signature.
- APK code contains Mela Feed, Active in General and Tap to reveal UI markers,
  plus the expected Production Supabase URL.
- No private Sentry upload-token pattern was found in the bundled app code.
- Sentry upload tasks and successful file-upload markers are present in build
  logs. A device runtime event remains necessary to verify end-to-end symbolication.
- The backend is deployed at 52/52 migrations and previously passed 84 live
  rollback-only community assertions. See COMMUNITY_PRODUCTION_DEPLOYMENT_2026-10-02.md.

The generated web preview was moved to `dist-mela-preview` so the audit recognizes
compiled output while retaining credential-pattern scanning. No audit rules were
weakened.

## Device test still required

The connected-device check found zero authorized Android devices. No installation
or device interaction was performed. Install this APK on a phone, sign in, publish
a text post, and use a second signed-in account to comment/upvote/report. Check
the composer keyboard, both themes, offline retry and the resulting Sentry events
before distributing broadly.

Additional evidence is under `artifacts/`: build status, download digest, native
verification and Sentry build-verification JSON files.
