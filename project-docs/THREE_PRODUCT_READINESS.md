# ChodhiQ product readiness

Assessment date: 2026-09-21

## Current local verification

- Customer app: formatting, code-quality, accessibility, incremental JavaScript type checking, 46 behavior/contract tests, security checks, and Expo web export pass.
- Administration dashboard: lint, web and worker TypeScript, Edge Function checks, production build, and 22 tests pass.
- Business dashboard: lint, web and worker TypeScript, production build, and 21 tests pass.
- Coming-soon site: lint and static production build are part of the root verification gate.
- `workspace-scripts/verify-all.ps1` is the canonical local command for all four deployable products.

The automated total is 89 passing tests. The coming-soon site has build and lint gates but no dedicated behavior tests.

## Completed engineering controls

- The applications use one migration-managed Supabase backend.
- RLS is authoritative; database functions and authenticated Edge Functions own privileged writes.
- Automated contracts cover authorization, moderation, claims, bookings, offline synchronization, rate limiting, notifications, validation, and commercial feature gates.
- Production configuration rejects demo mode and missing required public configuration.
- Payments and paid placement remain launch-gated.
- Customer web fonts import only the five weights used by the interface.
- Large customer hero and onboarding artwork used at runtime is delivered as WebP.

## Required deployment and staging evidence

- Restore source-control provenance and tie the release candidate to a known commit/tag.
- Apply and verify all migrations against production-like staging.
- Run database security tests and prove role and account isolation.
- Run authenticated end-to-end workflows without skipped environment variables.
- Verify private uploads, realtime behavior, audit records, rate limits, and every deployed Edge Function.
- Exercise payment webhook lifecycle scenarios before enabling payments.

## Required device and operational evidence

- Produce signed Android and iOS release candidates.
- Test authentication callbacks, deep links, push notifications, permissions, consent, offline recovery, account export, and account deletion on physical devices.
- Complete keyboard, zoom, and screen-reader testing across supported browsers.
- Approve legal documents, store disclosures, provider participation, and listing accuracy.
- Demonstrate monitoring, alerts, backups, rollback, incident ownership, and launch-day support.

## Deferred post-launch engineering

- Split the business dashboard's large route into workflow modules.
- Split the largest customer screens into smaller feature components and hooks.
- Expand incremental JavaScript checking toward full coverage or migrate core modules to TypeScript.
- Add browser end-to-end and visual-regression coverage.
- Reassess dependencies during planned Expo and dashboard toolchain upgrades.

## Launch decision

Local engineering checks are healthy, but public release remains conditional on the evidence in `QA_RELEASE_EVIDENCE.md`. A calendar date alone is not a go-live approval.
