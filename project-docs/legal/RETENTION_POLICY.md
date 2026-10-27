# ChodhiQ retention schedule

**Status:** Working schedule aligned to the published beta Privacy page; record-specific periods and implementation evidence remain to be confirmed for wider launch.  
**Version:** 1.0 · **Effective:** 14 October 2026 (published beta page)

The published beta notice states that personal data is deleted within 14 days after an account deletion request, except for limited records the law requires ChodhiQ to keep. It also states that no routine Supabase database backups are currently kept. These are the current public commitments; verify the live configuration and deletion workflow continue to meet them. The notice does not state a separate active-use period for each record category, so this schedule does not invent one.

| Record                                        | Active retention                                                  | Deletion/exception rule                                                                                                                                     |
| --------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Account and profile                           | Account lifetime                                                  | Delete on verified account deletion; retain minimal suppression/security record only if approved and necessary                                              |
| Saved providers and preferences               | Account lifetime                                                  | Delete with account                                                                                                                                         |
| Quotes and bookings                           | While account/service purpose remains; deletion request covered by 14-day public commitment | Keep only where needed for the service, dispute, or legal obligation; document any exception                                                                |
| Reviews, replies and community posts          | While published or otherwise needed for the account/service      | Remove account-linked data within 14 days after deletion request, except where law requires limited retention                                               |
| Provider applications and ownership claims    | While application/review purpose remains; deletion request covered by 14-day public commitment | Keep verification evidence private; document any legal or dispute exception                                                                                 |
| Verification documents                        | While review/appeal purpose remains; deletion request covered by 14-day public commitment | Restrict access and remove when no longer needed, subject to the public deletion commitment and legal exceptions                                            |
| Provider listing and agreement acceptance     | While provider relationship/service purpose remains               | Remove account-linked data within 14 days after deletion request, except where law requires limited retention                                               |
| Payment/subscription identifiers and invoices | ChodhiQ payments are disabled in the beta                          | No ChodhiQ payment collection in current beta; reassess and state any lawful accounting retention before enabling payments                                  |
| Support and privacy requests                  | While needed to handle the request; deletion request covered by 14-day public commitment | Keep only necessary records for a live complaint or legal obligation and document the exception                                                             |
| Moderation reports and audit log              | While needed for review/safety; deletion request covered by 14-day public commitment | Limit access; retain beyond the public deletion period only where law requires it                                                                           |
| Push tokens                                   | Until opt-out, sign-out, invalidation or account deletion         | Clear immediately when no longer required                                                                                                                   |
| Diagnostics and security telemetry            | While needed for reliability/security; deletion request covered by 14-day public commitment | Minimise identifiers and free text; confirm supplier-side retention before wider launch                                                                    |
| Backups                                       | No routine Supabase database backups currently kept, as stated in the public beta notice | Verify actual Supabase and other supplier backup settings; update the public notice before any material change                                               |

## Controls

The 14-day deletion commitment must be checked against scheduled deletion/anonymisation jobs, storage-object cleanup, device data handling, and supplier configuration. Each legal exception needs an owner, reason, access restriction, and review/end point. Review this schedule before wider launch and whenever features, vendors, or law change.

This working schedule records the public beta commitment; it does not by itself prove hosted cleanup or approve the separate business-dashboard legal publication.
