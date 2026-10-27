# ChodhiQ Android APK build — 12 October 2026

## Latest build — version code 30

- EAS build: [eb0d6e8f-7741-418a-b405-b11a487317ca](https://expo.dev/accounts/dom789/projects/chodhiq/builds/eb0d6e8f-7741-418a-b405-b11a487317ca)
- Status: finished; confirmed as the newest Android build in `@dom789/chodhiq`.
- Created: 2026-10-12 17:20:35 UTC
- Profile/distribution/channel: `beta-apk` / internal / `beta-internal`
- App/package: 1.0.0 / `com.chodhiq.app`
- Android version code: 30
- APK: `outputs/ChodhiQ-1.0.0-beta-v30.apk`
- [Download APK](https://expo.dev/artifacts/eas/k9gHnl2S9hKNbZ-DpLIIW-dFyB6xSPr4TAg1aaQ96sc.apk)
- Size: 128,181,920 bytes
- SHA-256: `77A86D211D8C8D18E21D6ED1D3D6DAA78759B4B68E99299E03B7D3A528FF021A`
- Archive check: ZIP listing passed with 1,428 entries, including `AndroidManifest.xml` and `classes.dex`.
- EAS used the remote Android keystore `ISLP6tvuV1`; this build was not independently checked with `apksigner` on this machine.

The existing version 28 compatibility finding below still applies: this project uses the `dom789` signing lineage, which cannot update a differently signed version 28 installation.

## Build

- EAS project: `@dom789/chodhiq` (`1ace485e-57df-4d2a-ad23-8e51f9286e75`)
- Build: [1f99ba74-3541-48d4-b315-c97ca8011c1f](https://expo.dev/accounts/dom789/projects/chodhiq/builds/1f99ba74-3541-48d4-b315-c97ca8011c1f)
- Profile/distribution/channel: `beta-apk` / internal / `beta-internal`
- App/package: 1.0.0 / `com.chodhiq.app`
- Android version code: 29
- APK: `outputs/ChodhiQ-1.0.0-beta-v29.apk`
- Download: https://expo.dev/artifacts/eas/Op8amTr2CtA4wuJWdv93Up-JkrnEztvuLD7-UP_Jq2M.apk
- Size: 128,181,920 bytes
- SHA-256: `7379ADE2F163C848DDC052BAC5793F00A077695393C0BE35BB6497473A261051`
- Android manifest: min SDK 24, target SDK 36
- Signature: `apksigner verify` passed with APK Signature Scheme v2; certificate SHA-256 is `5bb025f46133a432677539a7441a0f7a38274830b5871e6c1b0a9cb88291aab2`.

## Compatibility finding

The linked version 7 APK and this version 29 APK use the same signing certificate. The previously released version 28 APK uses a different certificate: `ff6e67bc38d2394f9587919770499a8ffb4d23b0aa354544d9ccd76813b3baa2`. Android will reject version 29 as an update to version 28 even though version 29 is correctly signed and has a higher version code.

This build is suitable for a fresh install or an update from the version 7 project lineage. To update existing version 28 installations without removing app data, build from the original `@chodhiq26/chodhiq` EAS project using its signing credentials. The current EAS session is `dom789` and cannot access that project.

## Verification and provenance

- Android Hermes export completed; bundle audit verified 4,145 source-map entries and found none of the audit-only packages.
- Launch configuration, code quality, accessibility, TypeScript, security, APK ZIP structure, manifest, and v2 signature checks passed.
- The full `verify:release` command stopped at Prettier: 31 files need formatting.
- Device installation was not run.
- Git commit: `f506df9496aef3b9948182b26ba64ee44af912dd`; the EAS build included uncommitted workspace changes. EAS fingerprint: `f44a8f73107ee9f86e0a137090c6cdffc9477306`.

Detailed artifact verification: [release-apk-verification-20261012.json](../artifacts/release-apk-verification-20261012.json).
