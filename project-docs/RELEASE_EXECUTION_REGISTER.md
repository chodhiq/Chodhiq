# ChodhiQ release execution register

Updated: 2026-10-09

## Current verification target

Project refs are confirmed: `gfjhvsajwjrrlylgrkhf` is production and `ljhncdzhzoatonhhofbv` is staging. On 2026-10-09, the linked production ref was read locally and checked before remote access; `supabase migration list --linked` showed local/remote migration history aligned through `20261009004000`, and `supabase db push --linked --dry-run` reported the remote database up to date with no pending migrations. No production migration or other database mutation was run in that session. Staging was not contacted. Local verification remains available; use `npm run launch:config` for local configuration checks. See `DASHBOARD_HOSTING.md` and `PROVIDER_EMAIL_CONFIRMATION_2026-09-22.md` for hosting configuration and confirmation-link evidence.

Automated local verification passed for all three products on 2026-08-29: 59 tests, three production builds/exports, lint, formatting, TypeScript, accessibility and security invariants. This does not replace staging or physical-device evidence.

Customer-app verification passed again on 2026-08-30 after adding password recovery, Expo Go native-module guards, Explore filter corrections, preview-build feature gates and Expo-compatible Sentry 7.2.0: 30 tests plus formatting, 68-file quality checks, accessibility, TypeScript, security invariants and a production web export.

| Gate                   | State    | Next executable action                                                                                                                                      | Required input/owner                                                    |
| ---------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Source checkpoint      | COMPLETE | Push reviewed commits to confirmed remotes.                                                                                                                 | Repository owner and remote confirmation                                |
| Local database suite   | PASS     | `npm run test:db` passed 14 SQL files / 208 pgTAP assertions on 2026-10-09 after applying pending workspace migrations to LOCAL Supabase only. | Complete |
| Customer app suite     | PASS     | 144/144 tests, typecheck, formatting, quality, accessibility, security, launch config, and Expo web/Android exports passed locally. | Complete |
| Dashboard suites       | PASS     | Isolated business dashboard verification passed 28/28 tests; isolated admin dashboard verification passed 23/23 tests, including their lint, typecheck, and builds. Existing dashboard output directories were not overwritten. | Complete |
| Staging link           | CONFIRMED / NOT ACCESSED | Staging is `ljhncdzhzoatonhhofbv`; no linked or remote staging command was run during the 2026-10-09 production check. | Link staging deliberately before any staging-only rehearsal. |
| Migrations/functions   | LOCAL PASS / PRODUCTION HISTORY ALIGNED; DRY-RUN EMPTY | Local suite covers quote request rate limit, booking datetime validation, quote insert grant, profile/saved-item grants, verification notification branding, and non-null quote contact validation. Production migration history lists all six reviewed migrations through `20261009004000`; the linked dry-run reported no pending migrations. This confirms migration ledger parity, not runtime behavior or the physical schema. No production changes or post-apply checks were performed in that run. The previously deployed read-only health function returned HTTP 200 with `database: connected`. | Reconcile migration-history evidence with deployment records; run requested production workflow checks only under the explicit approval already given, using safe, transactionally rolled-back tests and avoiding externally side-effecting triggers. |
| Customer saves/profile | LOCAL PASS / REMOTE WORKFLOW UNVERIFIED | Saved businesses and profile name/phone/city now use Supabase with queued offline writes, owner-scoped RLS, local legacy-save import, and optimistic UI rollback. Avatar file URIs remain device-local. | Perform approved, non-destructive production permission and ownership verification; test actual customer persistence in staging. |
| Offline directory UX   | LOCAL PASS | Home and Explore show stale/offline state, cached last-updated time, retry and pull-to-refresh. Cache write failure no longer discards a successful fresh response; app foreground requests refresh. | Verify visually on web and device. |
| Sentry / Android       | SENTRY SKIP VERIFIED / APK BUILD BLOCKED | The preview profile explicitly selects the `preview` EAS environment; incomplete Sentry config omits the build plugin. With credentials absent, Gradle successfully skipped source-map upload, cleanup, and module-collection tasks. The full isolated APK build hit JVM/native memory exhaustion; no APK or source-map upload is claimed. | Verify EAS variables without exposing token; retry release build on a machine with adequate memory or use the approved EAS build. |
| Brand cleanup          | MIGRATION IN PRODUCTION HISTORY; RUNTIME UNVERIFIED | The migration history includes `20261009002000_rename_sanjha_verification_notification.sql`. Historical provider `data_notes` seed text and migration comments still contain the old name; application code does not fetch or display those notes. The `sanjha.provider_workflow` setting is an internal database key, not user-facing. | Verify notification behavior without creating external side effects. |
| Authenticated security | BLOCKED  | Populate isolated test accounts/env vars and run staging workflow plus RLS matrix.                                                                          | Two customers, two providers, admin accounts                            |
| Stripe                 | BLOCKED  | Configure test secrets/webhook and exercise complete lifecycle/replay matrix.                                                                               | Stripe test account and price IDs                                       |
| Push/telemetry         | PARTIAL  | Push shared secret, database webhook and function are configured; add FCM/APNs and Sentry DSN, then test receipt/tap/redaction.                             | Expo/Firebase/Apple and monitoring accounts                             |
| Android/iOS            | READY    | Preview profile disables demo mode, payments and Google Ads; produce signed builds and execute device matrix.                                               | EAS access, Apple/Google credentials, devices                           |
| Browser/accessibility  | READY    | Deploy staging dashboards; execute browser, keyboard, zoom and screen-reader matrix.                                                                        | Staging URLs, Safari/iOS and assistive-tech testers                     |
| Provider content       | BLOCKED  | Audit found 135 providers: 128 lack cover images, 33 lack phone and WhatsApp, 127 are unverified. Confirm participation/details and obtain licensed images. | Business outreach owner                                                 |
| Legal                  | BLOCKED  | Counsel reviews this pack, privacy/retention spec and product behaviour.                                                                                    | Named UK counsel/controller                                             |
| Operations             | BLOCKED  | Assign owners; configure alerts; execute restore and rollback drills.                                                                                       | Named primary/backup owners                                             |

Public release remains blocked until every Priority 0 item in `QA_RELEASE_EVIDENCE.md` has dated evidence and the legal/operations sign-offs are complete.

The 2026-10-09 local database runs exposed two privilege gaps: quote requests lacked authenticated `INSERT`, and profiles/saved items lacked the table grants required for owner-scoped access. New local migrations grant only the needed table privileges; existing RLS policies and quote triggers still enforce row ownership. Tests now verify own-account writes and cross-account isolation. These migrations are LOCAL ONLY until target identity and approval are resolved.

## Migration rollout evidence and rollback notes

On 2026-10-09, the user authorized production deployment of the six reviewed migrations only. The linked ref printed before remote access was `gfjhvsajwjrrlylgrkhf`. `supabase migration list --linked` showed both local and remote history aligned through the following six reviewed versions:

1. `20261007130000_quote_request_rate_limits.sql`
2. `20261008150000_validate_booking_request_datetime.sql`
3. `20261009001000_grant_customer_quote_inserts.sql`
4. `20261009002000_rename_sanjha_verification_notification.sql`
5. `20261009003000_grant_customer_profile_saved_item_access.sql`
6. `20261009004000_quote_request_contact_not_null.sql`

The requested `supabase db push --linked --dry-run` returned `upToDate: true`, with empty migration, seed, and role lists. Consequently, this session applied none of the six, created no backup, and ran no production workflow tests. A migration history ledger does not itself prove that the corresponding runtime schema is intact. Do not re-run or force these migrations. Production workflow verification remains outstanding; staging was not contacted.

Before any staging rehearsal, record a staging ref that is distinct from the protected production ref and verify the linked target against it. Capture a database backup and migration-history snapshot. Inspect staging for quote rows with null/overlong messages or invalid/missing contact choices; inspect rate-limit counters for the `customer-quote-requests` scope; inspect active bookings for missing date/time; and confirm every customer, provider, dashboard, and service-role write path. Existing past bookings can be valid historical records and must not be treated as malformed solely because their date is now in the past.

For any environment whose history is genuinely behind, first verify exact target identity, take a backup, inspect data and mutation side effects, and review the dry-run. Never attempt to force migrations or bypass a migration-history mismatch. Verify migration history, own-account quote insert, cross-account and anonymous denial, provider read/update, allowed and null/invalid contact choices, the 5-per-hour boundary, valid future booking acceptance, null/past booking rejection, and owner-only profile/saved-item access. Run `npm run test:db` locally; do not point the local DB test runner at production.

Rollback must target only the confirmed environment and be rehearsed before release:

1. Quote insert grant: `REVOKE INSERT ON public.quote_requests FROM authenticated;` This restores the prior customer quote-write failure; do not use if the privilege was already required by another approved client.
2. Booking date/time guard: drop `validate_booking_request_datetime_trigger` from `public.bookings`, then drop `public.validate_booking_request_datetime()`. This restores acceptance of missing or past date/time values.
3. Quote rate limit: drop `limit_customer_quote_requests_trigger`, drop `public.limit_customer_quote_requests()`, and drop only the two constraints `quote_request_message_length` and `quote_request_contact_allowed`. Do not drop the shared `edge_rate_limits` table.
   If rolling back only the quote-contact hardening migration, restore the previous `quote_request_contact_allowed` definition (`check (preferred_contact in ('whatsapp','call','email')) not valid`); this permits null values and must not be used as the preferred state.
4. Profile/saved-item grants: revoke only the grants introduced by the local grant migration, and only after checking the target's pre-migration privilege state; revocation would disable the new persistence workflow.
5. Notification branding: this updates stored notification text and replaces a trigger function. Treat the text rewrite as forward-only unless a backup is available; do not blanket-replace `ChodhiQ` with `Sanjha`, which could overwrite legitimate later edits.

No staging or production database was changed by the 2026-10-09 migration-list and dry-run checks. The previously reported local database changes and test results are separate.
