# Community backend verification � 2 October 2026

All work was performed in the authoritative ChodhiQ workspace against `supabase_db_chodhiq`, database `postgres`. No production migrations were applied.

## Results

| Verification | Result |
| --- | --- |
| Database pgTAP suites | 111 checks passed across 5 files |
| Customer app tests | 86 passed |
| Customer typechecks | Passed |
| Admin web typecheck | Passed |
| Security invariants and secret audit | Passed |
| Populated upgrade rehearsal | Passed; local DB ends at 52 migrations |
| Synthetic fixture cleanup | Passed; zero rehearsal/concurrency users remain |

## Rate limits and promotions

`npm run test:community:local` uses only a hard-coded local Docker container. For each of `post_10m`, `post_24h`, `comment_10m`, `comment_24h`, `report_1h`, `membership_24h`, and `block_24h`, it seeds the committed counter two slots below the configured maximum, then races 12 independent PostgreSQL connections performing actual authenticated table inserts. Exactly two commit, ten receive the rate-limit error, and the persisted count equals the maximum. The pgTAP suite separately tests the final allowed request and first rejected request for each action window, and rejects direct caller access to the limiter.

Twelve concurrent promotion inserts commit exactly three and leave entitlement usage at three. SQL checks cover valid owner publication, nonowner denial, inactive plans, missing poster images, absent/expired entitlement expiry, monthly rollover, the fourth monthly promotion, and preventing an ordinary post being edited into a promotion without entitlement enforcement.

## Author content and moderation

Tests verify author body edits and deletion, cross-user edit/delete isolation, own-comment deletion, immutable post identity/space/type, inability to republish removed content, ordinary-user moderation denial, administrator comment-report resolution, parent-post preservation, comment-target audit details, stale status/timestamp rejection, and repeated-resolution rejection. Existing space-moderator scope checks remain passing. Comment body editing is not currently an exposed product capability; these checks cover post editing and post/comment deletion.

## Offline publication

The runner executes the real `flushPendingOperations` source with injected local storage/transport dependencies and real SQL publication. It simulates an initial network failure and then a lost acknowledgement after server commit. The next retry acknowledges the same receipt, creates no duplicate, and removes the queue item and local cached post. Twelve concurrent calls with the same operation ID also create only one post. SQL tests verify receipt privacy, author spoof rejection, unchanged allowance on retries, payload-change rejection, per-author operation identity, and no resurrection after deletion.

The new `publish_queued_community_post` RPC is security invoker: normal RLS, promotion triggers, memberships, and rate limits still apply. Durable receipts survive post deletion and are deleted when the user is deleted. This verifies queued synchronization, not device network-detection UI behavior.

## Populated-data upgrade

`npm run test:community:upgrade:local` explicitly resets LOCAL Supabase to migration `20261001120000`, commits synthetic legacy content, applies pending migrations with `migration up --local`, and compares before/after JSON snapshots.

Fixtures contain four posts (published, under review, removed, promotion), three comments, two likes, two bookmarks, two reports (open and resolved), and a paid entitlement. Original IDs, relationships, values, timestamps, statuses, and entitlement usage are identical after upgrade. All posts are assigned to General, the author's membership is backfilled, and anonymous visibility still exposes only published posts. Fixtures are then deleted. Snapshots are stored under `tmp/community-upgrade-before.json` and `tmp/community-upgrade-after.json`.

## Fixes exposed by verification

- `20261002120000_guard_community_edits_and_join_limits.sql`: prevents promotion and moderation bypass through author edits; existing General memberships no longer consume repeat join allowance.
- `20261002130000_idempotent_community_offline_publication.sql`: adds per-author operation receipts and queued-publication RPC. `src/data/syncRepository.js` now uses it.

During verification, an initial upgrade-fixture cleanup failed because the provider owner foreign key required deleting the provider first. Cleanup order was fixed and the full rehearsal rerun successfully. SQL delimiter errors introduced while expanding the test were corrected; the final suite passes.

## Release work still required

The four requested backend verification tasks are complete locally. Production review/deployment and post-deployment verification remain. Apply database migrations before releasing the updated offline worker. Topic spaces, threaded replies, blocking, and comment reporting still need customer UI integration and device-level checks before calling the whole community tab release-ready. The administrator report queue was validated through its database contract and web typecheck, not a live browser interaction.
