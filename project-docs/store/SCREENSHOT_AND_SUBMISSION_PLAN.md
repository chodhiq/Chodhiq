# Screenshot and store-submission plan

## Required truthful screenshot set

Capture from signed release-candidate builds using fictional staging accounts and production-like data. Do not use design mock-ups that show unavailable features.

1. Home — nearby categories and discovery.
2. Explore — search/filter results.
3. Provider profile — services, trust state and contact options.
4. Quote request — customer workflow.
5. Booking — request and current status.
6. Reviews/community — genuine user-generated-content interface.
7. Account — replies, notifications or saved providers.
8. Privacy — export and deletion controls.

Remove personal data, test email addresses, internal URLs, debug overlays and status-bar anomalies. Use the same release commit submitted to the store.

## Asset targets

- Apple: capture an accepted highest-resolution iPhone portrait set and let App Store Connect scale where supported; upload 1–10 screenshots with no alpha channel.
- Google Play: provide phone screenshots plus the required high-resolution app icon and feature graphic using current Play Console validation.
- Locales: initial `en-GB`; do not add untranslated localisations.
- Store artwork must not imply provider endorsement, guaranteed outcomes, live payments, or features absent from the binary.

## Submission schedule

Submission cannot be responsibly dated until the signed builds, public legal URLs, review account and owner approvals exist. Once ready:

1. **T−14 days or earlier:** create store records, complete privacy/data-safety/content-rating forms, upload screenshots and internal-test builds.
2. **T−10 days or earlier:** submit the final release-candidate binaries and metadata for review with manual release selected.
3. **T−7 days:** resolve metadata or binary feedback; retain time for a replacement build and second review.
4. **T−2 days:** freeze metadata/configuration, repeat production smoke tests, verify URLs and support coverage.
5. **Launch:** release only after operational go/no-go approval; use phased/staged rollout and monitor alerts.

Review duration is not guaranteed. Do not promise a launch date until both stores approve the exact release.

## Evidence record

Record App Store Connect app/version/build IDs, Play package/release/version code, uploaded asset hashes, submission times, review correspondence, approval times and release controls in `project-docs/RELEASE_PROVENANCE.md`.
