# Monitoring and operations evidence — 2026-09-21

## Assessment

| Control                     | Status                    | Evidence / next gate                                                                                                                            |
| --------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Sentry SDK                  | PARTIAL                   | Customer app SDK and privacy filter are present. Dashboard apps do not yet have Sentry SDKs.                                                    |
| Sentry organization/project | BLOCKED                   | No `SENTRY_ORG`, `SENTRY_PROJECT`, DSN, or authenticated Sentry session was available. Account creation/project mutation was not attempted.     |
| Native source maps          | READY, NOT PROVEN         | Expo plugin now reads org/project and production builds require the upload token. Proof requires a signed staging build and symbolicated event. |
| Staging alert               | READY, NOT RUN            | `npm run monitoring:test:staging` is deterministic and contains no customer data. It cannot run without the staging DSN.                        |
| Staging backups             | FAILED GATE               | Supabase CLI returned no backup entries and PITR disabled for `ljhncdzhzoatonhhofbv`.                                                           |
| Rollback procedure          | DOCUMENTED, NOT REHEARSED | Concrete sequence is in `docs/OPERATIONS_RUNBOOK.md`; no deployment IDs, signed rollback binary, or timed rehearsal evidence is available.      |
| Incident owner              | BLOCKED                   | All primary and backup owner fields remain `UNASSIGNED` in `project-docs/LAUNCH_OPERATIONS.md`.                                                 |
| Launch-day coverage         | BLOCKED                   | No named shifts, contact routes, acknowledgement target, or escalation backup has been supplied.                                                |

## Source-map release contract

- Runtime release: exact `EXPO_PUBLIC_RELEASE_COMMIT`.
- Upload target: `SENTRY_ORG` + `SENTRY_PROJECT` through the Expo plugin.
- Upload credential: server-side `SENTRY_AUTH_TOKEN` in EAS/CI only.
- Production build guard: fails when any of the above is missing.
- Preflight: `npm run monitoring:check` also rejects a release commit that differs from `git rev-parse HEAD`.

## Required evidence to close the gates

1. Sentry project URL and a redacted screenshot/export of the project settings.
2. Staging drill event ID, alert-created time, delivery time, acknowledgement time, recipient, and escalation result.
3. A stack trace showing application frames symbolicated for the exact release commit.
4. Supabase backup timestamp and a successful restore to a disposable non-production project, including critical row and private-object checks.
5. Timed rollback drill with the last-known-good git tag and dashboard/function/mobile artifact identifiers.
6. Named primary/backup incident owners and a launch-day roster with time zone, shift boundaries, paging route, and handoff record.

Public launch remains blocked until every item above has evidence rather than a planned procedure.
