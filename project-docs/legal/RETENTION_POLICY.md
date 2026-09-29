# ChodhiQ retention schedule

**Status:** Proposed schedule requiring privacy/legal approval and implementation evidence.  
**Version:** 1.0 · **Effective:** `{{EFFECTIVE_DATE}}`

| Record                                        | Active retention                                                  | Deletion/exception rule                                                                                                                                     |
| --------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Account and profile                           | Account lifetime                                                  | Delete on verified account deletion; retain minimal suppression/security record only if approved and necessary                                              |
| Saved providers and preferences               | Account lifetime                                                  | Delete with account                                                                                                                                         |
| Quotes and bookings                           | `{{QUOTE_BOOKING_PERIOD}}` after closure                          | Extend only for an active dispute, legal claim or required accounting record                                                                                |
| Reviews, replies and community posts          | Until deleted/account closure or moderation action                | Remove public copy with account deletion unless retention is legally required; preserve limited moderation evidence where justified                         |
| Provider applications and ownership claims    | `{{APPLICATION_PERIOD}}` after final decision                     | Delete declined/withdrawn evidence sooner where no dispute exists                                                                                           |
| Verification documents                        | `{{VERIFICATION_DOCUMENT_PERIOD}}` after decision/re-verification | Private; delete promptly when review/appeal purpose ends unless law requires longer                                                                         |
| Provider listing and agreement acceptance     | Relationship lifetime plus `{{PROVIDER_RECORD_PERIOD}}`           | Retain version/timestamp needed to establish the contract                                                                                                   |
| Payment/subscription identifiers and invoices | `{{FINANCIAL_PERIOD}}`                                            | Never store full payment-card data; retain only legally required accounting records                                                                         |
| Support and privacy requests                  | `{{SUPPORT_PERIOD}}` after closure                                | Extend for complaint, regulator or legal claim                                                                                                              |
| Moderation reports and audit log              | `{{MODERATION_PERIOD}}`                                           | Longer only for serious safety/repeat-abuse evidence with documented necessity                                                                              |
| Push tokens                                   | Until opt-out, sign-out, invalidation or account deletion         | Clear immediately when no longer required                                                                                                                   |
| Diagnostics and security telemetry            | `{{TELEMETRY_PERIOD}}` rolling                                    | Redact direct identifiers and free-text content; security incidents may have a separately approved hold                                                     |
| Backups                                       | `{{BACKUP_PERIOD}}` rolling                                       | Encrypted/restricted; expire automatically; deleted accounts are not restored to live service except disaster recovery and are re-deleted after restoration |

## Controls

Retention must be implemented through scheduled deletion/anonymisation jobs, storage-object cleanup, backup expiry, litigation-hold controls and quarterly evidence review. Each exception needs an owner, lawful basis, start/end date and access restriction. The privacy owner reviews this schedule at least annually and whenever features, vendors or law change.

No placeholder-bearing version is approved for publication.
