# Monitoring and alerting

## Current verification (2026-09-28)

- The customer app initializes Sentry with a deployment environment and exact release commit.
- Sentry organization `chodhiq` and React Native project `chodhiq-mobile` now exist. The project DSN, organization, project slug, Sentry URL, and EAS project ID are configured for preview and production. Preview is tagged `staging`; both EAS environments use the configured release commit.
- The Expo Sentry build plugin requires `SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_AUTH_TOKEN` for source-map upload. Its project settings and `SENTRY_AUTH_TOKEN` secret are present in both EAS environments. The unused duplicate organization token was revoked; one active CI token remains.
- Four customer-data-free staging events were accepted by Sentry and appear under the expected `staging` environment and release. The latest drill event is `4f457de3b7362cd78b261944ea3c3463`.
- Project privacy settings now prevent IP storage, apply Sentry's default scrubbers, redact email and location fields, and remove `user.geo`. The latest test event shows its geography fields as `[Filtered]`.
- `npm run monitoring:check` reports the EAS-only `SENTRY_AUTH_TOKEN` missing when run locally; the secret is intentionally unavailable outside EAS. Android preview build `846453eb-ae65-43a6-abd4-e22f65f4c658` succeeded and uploaded the source map for release `com.chodhiq.app@1.0.0+15` (Debug ID `97680a6c-f450-438c-976c-c6ca3965838f`). A runtime event from that build is still needed to verify symbolication. Sentry issue alert `1307693` is active for the mobile project across environments and notifies the signed-in Sentry member; the test notification was received. A backup route has not been configured.

Do not mark monitoring complete until the event ID is visible in Sentry, its stack frames are symbolicated against the matching release, and the routed alert is acknowledged by the named incident owner.

The applications emit structured errors to their platform logs. Production should route those logs to one central alerting service before launch.

## Required alerts

- Supabase Edge Function error rate above 2% for five minutes.
- Stripe webhook signature failures or three consecutive delivery failures.
- Push-notification function failures above 5% for ten minutes.
- Admin and business dashboard HTTP 5xx responses.
- Database connection exhaustion, storage upload failures, and RLS permission errors.
- No successful synthetic authenticated journey for 30 minutes.

## Recommended setup

1. Connect Cloudflare Worker logs and Supabase logs to Sentry, Datadog, or the team’s approved equivalent.
2. Store DSNs/tokens only in Cloudflare and Supabase secrets; never use a `NEXT_PUBLIC_` secret.
3. Use environment tags (`staging`, `production`) and release commit hashes.
4. Redact authorization headers, emails, phone numbers, quote messages, review text, booking notes, and document paths.
5. Route warning alerts to the operations channel and paging alerts to the named on-call owner.
6. Run the authenticated journey in `tests/authenticated-workflows.mjs` against staging only.

## Synthetic journey

The staging monitor should create isolated fictional accounts, then verify: customer review creation; quote creation; owner response; customer receipt; booking request; owner confirmation; admin visibility. Delete or expire these fixtures through the reviewed staging reset procedure.

## Staging alert drill

1. Keep `EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_APP_ENV=staging`, `EXPO_PUBLIC_RELEASE_COMMIT`, `EXPO_PUBLIC_EAS_PROJECT_ID`, `SENTRY_ORG`, `SENTRY_PROJECT`, and secret `SENTRY_AUTH_TOKEN` in the preview/EAS environment.
2. Run `npm run monitoring:check` only where `SENTRY_AUTH_TOKEN` is available; do not copy the EAS secret into local files.
3. Produce a staging build so the Sentry Expo plugin uploads native source maps.
4. Run `npm run monitoring:test:staging` and record the emitted event ID.
5. Confirm the event has `environment=staging`, the expected release commit, no personal data, and readable application frames.
6. Confirm the alert reaches the primary route, is acknowledged, and escalates to the backup route. Record timestamps and owner names in the launch evidence.
