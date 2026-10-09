# Community opening crash fix — 3 October 2026

The version 20 motion pass imported `useLiveCallback` as a named export in CommunityScreen, while its module exports the hook as default. Metro compiled this mismatch, and opening Community attempted to call undefined. This is a client-side render failure; no backend migration change is required.

Fix: use the hook's default import. Existing community functionality, layout and backend calls remain intact.

Regression coverage: an AST-based audit checks local JS import/export contracts throughout the customer app. A negative case reproduces and rejects the exact default/named mismatch. This closes a gap in the existing TypeScript check, which checks only selected JavaScript modules.

Verification results: pending full release checks. A corrected APK will be built as version 21; do not use version 20 to test Community.

Full release checks passed: 102/102 tests, configuration, formatting, quality, accessibility invariants, TypeScript, security/secret audit and web export. Phone runtime confirmation remains pending the corrected APK.

Corrected APK submitted: https://expo.dev/accounts/chodhiq26/projects/chodhiq/builds/ae3c222c-1bf7-41b7-a6e6-03e3ecb6ce61 (version 21). A background monitor downloads and verifies the APK when Expo finishes.

Build completed successfully. Download: https://expo.dev/artifacts/eas/v4pKJNycmV1RlXHLEzpjrBrozcjvVi2R2UWZvMHUb50.apk
Local APK: outputs/ChodhiQ-1.0.0-community-crashfix-v21.apk
SHA-256: 2ff3676c410246f718ac7e22d61443a953a1fc92cca6822a1606247bba55fe4d
Size: 108247928 bytes.
Verified: package com.chodhiq.app, version 1.0.0/code 21, non-debuggable; signature valid and certificate matches version 19; recorded source files still match upload hashes.
Phone runtime testing remains pending.
