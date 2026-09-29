# Operations runbook

## Deployment order

1. Back up the production database and record the migration version.
2. Apply Supabase migrations in a staging project and run authenticated E2E tests.
3. Deploy Edge Functions with server-only secrets.
4. Configure database and Stripe webhooks, then send signed test events.
5. Apply production migrations during the approved window.
6. Deploy Edge Functions, then mobile/web clients.
7. Run booking, claim, deletion, push and payment smoke tests.

## Required server secrets

- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `PUSH_WEBHOOK_SECRET`
- `EXPO_ACCESS_TOKEN` when Expo push access security is enabled

Never use an `EXPO_PUBLIC_*` prefix for server secrets.

## Rollback

- Stop client rollout when a gate fails.
- Prefer a forward-fix migration. Do not manually edit production schema state.
- Disable affected Edge Functions or webhook destinations if they cause unsafe writes.
- Restore a backup only after impact assessment because it can discard valid writes made after the backup.
- Record the incident timeline, affected users, recovery action and follow-up owner.

### Release rollback procedure

1. Declare the incident and freeze migrations and releases. Record the deployed commit, mobile build IDs, dashboard deployment IDs, and latest applied migration.
2. Web dashboards: redeploy the last-known-good artifact tied to a verified git tag, then run authentication and role-isolation smoke tests.
3. Mobile: halt the store rollout. If the faulty build is already public, ship the pre-signed last-known-good or forward-fix build; store binaries cannot be remotely replaced.
4. Edge Functions: redeploy the function versions associated with the last-known-good commit. Disable webhook destinations first if unsafe writes are occurring.
5. Database: prefer a forward-compatible corrective migration. A backup restore requires incident-commander approval, a measured recovery point, and an accepted plan for writes after that point.
6. Verify customer/provider/admin isolation, private storage access, booking/quote writes, notifications, and account deletion before resuming rollout.
7. Attach logs, command output, timestamps, approvers, and validation results to the incident record.

### Backup status

On 2026-09-21, `supabase backups list --project-ref ljhncdzhzoatonhhofbv` reported no available backup entries and `pitr_enabled: false` for staging (region `ap-south-1`; WAL-G enabled). A recoverable backup and a successful non-production restore drill are therefore not confirmed.

## Alert priorities

- P0: account crossover, leaked verification media, unauthorized ownership or payment privilege.
- P1: authentication outage, destructive migration, deletion failure or sustained payment mismatch.
- P2: push outage, elevated API errors, stale marketplace data or degraded booking flows.

## Alert routing and thresholds

- Page the P0 security owner immediately for any confirmed cross-account read/write or exposed verification document.
- Page the P1 on-call owner when fatal errors exceed 3 in 15 minutes, checkout/webhook failures exceed 2% for 10 minutes, or authentication probes fail twice consecutively.
- Open a P2 incident when one app area exceeds 25 errors in an hour, push delivery failures exceed 5%, or marketplace refresh remains stale for 30 minutes.
- Build dashboards from `operational_error_summary`, Stripe webhook records, push delivery responses and database health metrics. Group alerts by app area and platform to prevent one incident from paging repeatedly.
- Route production alerts to a staffed paging destination; email-only routing is insufficient for P0/P1 incidents. Record the owner and escalation backup in the deployment environment, not this repository.

## Offline synchronization recovery

- Retryable writes use capped exponential backoff and continue processing later queue items.
- Validation, authorization and conflict failures are retained as failed items instead of retrying forever.
- A queue item stops automatically after five attempts. Inspect redacted `offline-sync` telemetry before replaying it.
- Never edit and resend a failed operation without checking current server state; a booking, claim or report may already have been accepted.
- After recovery, refresh canonical account and marketplace data so server state wins over optimistic local presentation.
