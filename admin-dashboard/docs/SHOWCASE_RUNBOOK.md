# Staging showcase runbook

## Rehearsed flow

1. Open the private staging URL and identify the `STAGING` badge.
2. Sign in with the fictional administrator account.
3. On Overview, confirm metrics load from Supabase; explain that `Unavailable` is shown instead of a false zero when a query fails.
4. Search for `Demo — Kerala Kitchen Birmingham` and open its dossier.
5. Edit one safe description field, save once, and wait for the audited-success message.
6. Open Verification, select `Demo — Pending Verification`, and open the two-minute signed synthetic document.
7. Enter a decision note and request changes or approve only when evidence exists.
8. Open a report queue, enter a resolution note, and resolve or dismiss one demo report.
9. Open Users, enter a reason, and suspend or reactivate `Demo — Suspended User`.
10. Open Payments and explain that CSV export contains the current page and is formula-injection protected.
11. Open Audit log and correlate the completed actions.
12. Sign out.

## Read-only fallback

If mutations or external services are unavailable, tour Overview → Providers → Provider dossier → Verification evidence metadata → Reports → Users → Payments → Audit without submitting actions. State the outage honestly and use prepared screenshots only as presentation safeguards.

## Rollback

Switch back to checkpoint commit `ea0d7b26e8e0a2c3541601efe99a0125434e183d`, restore the ignored environment snapshot documented in `PRIORITY_0_SAFETY.md`, redeploy the last known-good private Sites version, then run the scoped staging reset in `STAGING_DATA_AND_RESET.md`.
