# ChodhiQ pre-launch audit

> Historical assessment from 2026-09-01. For current local status and test totals, use `THREE_PRODUCT_READINESS.md`; preserve this report as an audit record.

**Audit date:** 2026-09-01  
**Workspace:** `C:\Users\ASUS\Documents\Codex\chodhiq`  
**Decision:** **NO-GO for production today**

## Executive summary

The customer app, provider dashboard, and administration dashboard all pass their repository-defined formatting/lint, type-check, build, and automated test pipelines. The verified total is **65 passing tests**: 33 customer-app tests, 14 provider-dashboard tests, and 18 admin-dashboard tests.

Production launch is nevertheless blocked by incomplete production configuration, unremediated customer-app dependency advisories, and missing proof for live database, authenticated end-to-end, load, native-build, deployment, and monitoring workflows. These are release-evidence gaps, not theoretical documentation tasks.

The earlier report's statement that ChodhiQ was ready after four straightforward blockers is no longer supported by the current evidence. The appropriate decision is to complete the blockers below and repeat the release gate against the actual staging and production projects.

## Verification results

| Area | Command/evidence | Result |
|---|---|---|
| Customer app quality | `npm run verify:release` | Pass |
| Customer app tests | Node test runner | 33 passed, 0 failed |
| Customer web export | Expo web export | Pass; 5.46 MB JavaScript bundle |
| Provider dashboard | `npm run verify` | Pass |
| Provider tests | Node test runner | 14 passed, 0 failed |
| Admin dashboard | `npm run verify` | Pass |
| Admin tests | Node test runner | 18 passed, 0 failed |
| Edge-function type checks | Deno checks invoked by admin verification | Pass for 4 selected functions |
| Launch configuration | `npm run launch:config` | **Fail** |
| Authenticated staging E2E | `npm run test:e2e:staging` | **Skipped**; required staging variables absent |
| Root production dependency audit | `npm audit --omit=dev` | **27 findings: 10 high, 17 moderate** |
| Provider production dependency audit | `npm audit --omit=dev` | 0 findings |
| Admin production dependency audit | `npm audit --omit=dev` | 0 findings |
| Provider full dependency audit | `npm audit` | 20 findings: 15 high, 4 moderate, 1 low |
| Admin full dependency audit | `npm audit` | 22 findings: 17 high, 4 moderate, 1 low |
| Database/RLS execution | Repository contains 25 migrations and RLS policies | **Not executed against a live/local database in this audit** |
| Load test | `k6` command | **Unavailable; not run** |
| Release traceability | `git status` | **Workspace is not recognized as a Git worktree** |

## Launch blockers

### P0 — must be closed before production

1. **Complete production configuration.** The launch gate reports missing `EXPO_PUBLIC_EAS_PROJECT_ID`, `EXPO_PUBLIC_SENTRY_DSN`, and admin-dashboard `SITE_URL`. Re-run `npm run launch:config` until it passes without printing or committing secrets.

2. **Triage and remediate the customer app's production dependency advisories.** The current lockfile reports 27 production findings, including 10 high-severity findings. Many flow through Expo/Metro and the registry proposes an Expo major-version upgrade; do not apply a forced major upgrade without an Expo compatibility migration and native regression test. Record exploitability decisions for any accepted findings.

3. **Prove the database and RLS state on the target Supabase project.** SQL files and static contract tests do not establish that all 25 migrations are applied or that production policies match the repository. Run migration-status checks, database tests, and `db/RLS_AUDIT.sql` (or the current canonical equivalent) on staging, archive results, and verify the production migration plan and rollback.

4. **Run the authenticated staging journey.** The only authenticated marketplace E2E test skipped because its Supabase URL/key, service role secret, three test accounts, and provider ID were absent. It must pass—not skip—across customer, owner, and admin roles.

5. **Build and smoke-test native release artifacts.** A web export passed, but no EAS Android/iOS production build, install, deep-link/auth callback, notification, permission, ad-consent, or account-deletion smoke test was demonstrated.

6. **Validate production monitoring.** The build warns that Sentry organization/project configuration is absent and the DSN is missing from the launch configuration. Demonstrate a captured staging error, source-map symbolication, alert delivery, privacy filtering, and release tagging.

7. **Establish release traceability.** The authoritative workspace is not recognized as a Git worktree. Confirm the intended repository metadata, clean/known commit, tag or release SHA, and reproducible build source before deployment.

### P1 — required release evidence

1. Install `k6` in the release environment and run the repository load test against staging. Define and record thresholds for error rate, p95 latency, database saturation, and rate-limit behavior.
2. Upgrade the provider/admin build toolchain advisories, prioritizing non-major fixes for `@cloudflare/vite-plugin`, `vinext`, `vite`, and `react-server-dom-webpack`, then re-run both full verification pipelines.
3. Expand CI. The only workflow found runs root `npm test` plus a production audit; it does not run full customer verification, either dashboard verification, launch configuration, database checks, or authenticated E2E.
4. Review web performance. The customer web export emits one 5.46 MB JavaScript bundle and several 1.8–2.31 MB hero images. Measure real compressed transfer, startup time, and low-end mobile behavior; optimize before treating web as launch-ready.
5. Verify every deployed Edge Function. Admin verification Deno-checks four functions, while the shared directory contains seven function entry points plus the rate-limit helper. Ensure checkout and Stripe webhook paths are explicitly checked and tested even while payments remain gated off.

## Positive findings

- All repository-defined static checks and builds pass for all three products.
- The automated suites cover validation, rate limiting, booking mapping, schema contracts, sync behavior, commercial feature gating, admin authorization/auditing invariants, CSV formula escaping, and server rendering.
- Payments are represented as launch-paused in tests and configuration examples.
- RLS is extensively represented in migrations, including newer rate-limit, telemetry, advertising, consent, community, and booking policies.
- `.env`, `.env.local`, build artifacts, logs, and load-test output are listed in `.gitignore`.
- Targeted scans found no source-code `TODO`/`FIXME` markers, `eval`, `new Function`, or `dangerouslySetInnerHTML` usage outside excluded generated/dependency/documentation paths.

## Go-live acceptance gate

Change the decision to GO only when all of the following are attached to a single release candidate:

- `npm run verify:launch` passes from the authoritative workspace.
- The customer dependency audit is remediated or every remaining production finding has an approved, evidence-based risk acceptance.
- Staging migration status and RLS audit pass against the same schema planned for production.
- Authenticated E2E completes with zero skips and zero failures.
- Load thresholds pass with recorded results.
- Signed Android and iOS builds pass the native smoke-test matrix.
- Sentry test event, symbolication, alert, and release metadata are verified.
- Deployment, rollback, backups, domain/TLS, privacy/support links, app-store metadata, and an on-call owner are confirmed.
- The release is tied to a known source commit/tag and the worktree state is understood.

## Recommended sequence

1. Restore/confirm source-control provenance and finish environment configuration.
2. Remediate dependency advisories and re-run all three verification pipelines.
3. Apply/verify staging database migrations and RLS.
4. Run authenticated E2E and load tests.
5. Produce native release candidates and execute smoke tests.
6. Verify monitoring and operational rollback, then hold a documented go/no-go review.

This report intentionally does not claim a launch date or success percentage: neither can be responsibly inferred until the P0 evidence exists.
