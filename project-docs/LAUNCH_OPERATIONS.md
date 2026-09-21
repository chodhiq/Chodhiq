# ChodhiQ launch operations

## Named ownership required before public release

Replace every `UNASSIGNED` entry with a named person and tested contact route.

| Responsibility | Primary owner | Backup | Evidence required |
| --- | --- | --- | --- |
| Customer support and privacy requests | UNASSIGNED | UNASSIGNED | Shared inbox tested end to end |
| Production incident commander | UNASSIGNED | UNASSIGNED | Alert acknowledgement drill |
| Supabase/database recovery | UNASSIGNED | UNASSIGNED | Staging restore with timestamp and result |
| Mobile release and rollback | UNASSIGNED | UNASSIGNED | Signed rollback build installed on devices |
| Admin security and access reviews | UNASSIGNED | UNASSIGNED | Staging role review and revocation test |
| Advertising operations | UNASSIGNED | UNASSIGNED | Consent, campaign and expiry audit |

## Public-launch gates

- Run customer journeys on signed Android and iOS builds: sign-up, sign-in, password reset, deep link, push opt-in/out, booking, quote, review, data export and deletion.
- Use two customer accounts, two provider owners and two admin roles on staging to prove RLS, owner isolation, signed storage access and audited mutations.
- Verify production AdMob app and banner IDs on release builds. Confirm no test IDs and no ad request before consent.
- Trigger an alert, acknowledge it, escalate it and record the incident timeline.
- Restore the latest Supabase backup to a non-production project and verify critical row counts and storage objects.
- Rehearse rollback for the mobile apps and both dashboards, including database-forward compatibility.

## Incident minimum

1. Declare severity and incident commander.
2. Preserve logs and audit evidence; do not expose personal data in chat or tickets.
3. Disable the affected feature with its launch flag where available.
4. Notify users when required by the approved incident/privacy policy.
5. Record resolution, recovery validation and follow-up owner.

