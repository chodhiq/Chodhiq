# Community production deployment — 2 October 2026

Completed with explicit user authorization in the authoritative ChodhiQ workspace.
Target: ChodhiQ Production, project `gfjhvsajwjrrlylgrkhf`.

## Applied migrations

1. `20261001130000_community_spaces_and_safety.sql`
2. `20261002100000_restore_category_and_review_read_grants.sql`
3. `20261002110000_secure_community_engagement_visibility.sql`
4. `20261002120000_guard_community_edits_and_join_limits.sql`
5. `20261002130000_idempotent_community_offline_publication.sql`

The pre-deployment dry run listed exactly these five migrations. `db push --linked
--yes` applied all five. A subsequent dry run returned up to date with no pending
migrations. Production now has 52 migration records. No seed or role files were pushed.

## Production verification

| Check | Result |
| --- | --- |
| Community backend suite | 26 assertions passed |
| Community release suite | 48 assertions passed |
| Community offline suite | 10 assertions passed |
| Total live assertions | 84 passed |
| Test data cleanup | Zero synthetic test users remain |
| General space | One active General space |
| Posts without space assignment | Zero |
| RLS | Enabled on posts, comments, spaces, memberships, blocks, receipts and rate-limit buckets |
| Queued-publication RPC | Present and security invoker |
| Queued-publication privileges | Authenticated execution allowed; anonymous execution denied |
| Direct rate-limiter access | Denied to authenticated callers |
| Public REST reads | Spaces, posts and comments return HTTP 200 using app configuration |

Live tests were executed in rollback-only transactions. Temporary wrappers turn
pgTAP failures into SQL exceptions and verify assertion counts, because the
Management API only returns the final result set. The original checked-in suites
were not modified. All synthetic fixture writes and temporary test objects were
rolled back, including any test-only extension creation.

Before/after counts and content checksums match for posts, comments, likes, saves,
reports and provider entitlements. These six tables were empty before deployment
and remain empty after verification; populated-data preservation was previously
rehearsed locally, not established by this empty production snapshot.

Evidence files are under `artifacts/`: production before/after snapshots, three
rollback-only test scripts, test-results JSON and REST-check results JSON. They
contain no credentials or customer content.

## Verification limits and next step

The attempted local concurrency-runner rerun could not start because Docker
Desktop's Linux engine was stopped. The earlier successful local concurrency and
upgrade evidence remains in `COMMUNITY_BACKEND_VERIFICATION_2026-10-02.md`; this
deployment adds the live assertions above, not a fresh production concurrency run.

The production backend is ready for the posting/commenting workflow. A new APK
must still be built to include the Mela UI changes. No APK build, Sentry device
drill or device-level UI verification was performed during this deployment.

Subsequently, the signed Mela Feed APK (version code 18) was built and verified.
See `MELA_APK_BUILD_2026-10-02.md`. Device testing remains because no authorized
Android device was connected.
