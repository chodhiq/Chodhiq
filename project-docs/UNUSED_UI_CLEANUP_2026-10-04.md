# Unused UI cleanup — 4 October 2026

Removed the unreachable customer Creators/Freelancers screen, its card components,
empty creator dataset, creator-only styles/imports, and unused asset exports.
Removed duplicate category asset keys and obsolete creator category aliases.
Updated Explore search text to describe the supported businesses and services.

An import graph rooted at App.js, including native/web module variants, and a
workspace reference search confirmed these files had no active consumers:

- Customer BusinessDashboard/AdminDashboard screen and its dashboard repository/mappers.
- CategoryChip, CategoryIconTile, AppErrorBoundary (App.js uses Sentry.ErrorBoundary).
- useAsyncResource hook.

Removed the tests exclusive to the deleted dashboard mappers. Updated production
guards to check the active admin web verification/report RPCs and retained the
customer navigation isolation and web dashboard ownership/role checks. Removed
an unused provider fallback lookup; the provider repository no longer imports
prototype provider data.

Moved 13 old generated dist-* previews and unused creator demo/theme images into
the ignored output/obsolete-ui-cleanup-20261004 archive. They remain recoverable
locally and no longer sit in the active source asset folders. Kept dist-verify,
current release artifacts/APK, design source originals, migration history, and
the explicitly enabled marketplace demo/offline functionality.

No hosted database records, credentials, .env files, or live deployments changed.
Validation: all checks in npm run verify:release passed (106 tests, type checks,
formatting, quality, accessibility, security audits, and web production export).
The initial run flagged archived generated bundles after they moved under
artifacts; placed the recoverable archive in output and reran security and web
export successfully. Android production Hermes export also passed.
