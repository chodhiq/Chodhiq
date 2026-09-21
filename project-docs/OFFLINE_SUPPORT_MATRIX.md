# Offline support matrix

Offline behavior is opt-in. A feature not listed here is online-only.

| Entity/workflow          | Read cache                             | Offline writes                            | Conflict rule                                                                              | Invalidation                                   |
| ------------------------ | -------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| Categories               | Native SQLite and web local store      | No                                        | Server snapshot wins                                                                       | Marketplace refresh replaces cache             |
| Providers/services/hours | Native SQLite and web local store      | No                                        | Server snapshot wins                                                                       | Marketplace refresh replaces cache             |
| Public reviews           | Included with marketplace/account data | No                                        | Server snapshot wins                                                                       | Review creation triggers marketplace refresh   |
| Community posts          | Native SQLite and web local store      | Create queue only                         | Pending local rows survive refresh; permanent failures leave the active queue              | Successful sync and feed refresh               |
| Quote requests           | Account state                          | Create queue when supported by repository | Server identity replaces queued operation; permanent validation/auth failures do not retry | Account reload or successful sync              |
| Provider reports         | No user-visible cache                  | Create queue when supported by repository | Idempotent submission; permanent validation/auth failures do not retry                     | Successful sync                                |
| Saved providers          | Marketplace/account state              | No                                        | Optimistic UI rolls back on failure                                                        | Account reload                                 |
| Bookings                 | Account state                          | No                                        | Server status and stale-write checks win                                                   | Account reload/status notification             |
| Notifications            | Memory only                            | Mark-read requires network                | Server state wins                                                                          | Realtime event plus 60-second fallback refresh |

## Rules

- Do not add a table to SQLite merely because it exists in PostgreSQL.
- Every queued operation must classify retryable and permanent failures.
- Sync metadata is local-only and must never be sent to Supabase.
- Schema changes to cached projections require native and web cache compatibility review.
- Security-sensitive actions, payments, authentication, booking transitions, and admin actions remain online-only.
