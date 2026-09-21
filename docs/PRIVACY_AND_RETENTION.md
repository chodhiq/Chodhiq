# Privacy and retention specification

This engineering specification is not a substitute for a counsel-approved privacy policy.

| Data | Purpose | Visibility | Proposed retention |
|---|---|---|---|
| Profile and contact details | Account and provider communication | User and authorized operations | Account lifetime plus legally required backup window |
| Approximate city | Marketplace discovery | User-controlled/public where applicable | Account lifetime |
| Push token | Opted-in notifications | Backend delivery systems only | Clear immediately on opt-out or sign-out |
| Verification documents | Business ownership review | Claimant and authorized reviewers | Delete after the approved legal review window |
| Quotes and bookings | Customer-provider workflow | Participants and authorized operations | Defined commercial/support window |
| Payment identifiers | Subscription reconciliation | Authorized operations | Statutory financial retention period |
| Error telemetry | Reliability and incident diagnosis | Administrators | Short rolling window; no message bodies or direct identifiers |

## User rights

The app provides data export and account deletion under Settings → Privacy & your data. Production operations must document identity verification, response deadlines, backup expiry and exceptions required by law.

## Collection rules

- Collect only fields required for the active feature.
- Never place secrets, document contents, contact details or free-form customer messages in telemetry.
- Do not publish imported providers without a recorded lawful basis and publication consent.
- Record changes to retention and consent behavior as reviewed migrations and release notes.

