# ChodhiQ community backend design

**Status:** Foundation replayed and tested on local Supabase; not applied to Production  
**Scope:** Backend foundation for a regular, Reddit-like community. The current community interface remains unchanged until the backend work is complete.

## Current foundation

The production schema now includes `community_posts`, `community_comments`, `community_post_reports`, `community_post_likes`, and `community_saved_posts`, plus the `community_post_engagement()` RPC and the admin moderation queue.

Posts also serve provider promotions and are created from the customer app, offline sync, and business dashboard. Existing post IDs are referenced by comments, likes, saves, and reports. Keep those IDs stable and preserve the promotion trigger and its provider ownership checks.

The customer client expects these post fields and behaviors: `region_key`, `location_city`, like and save rows, and engagement counts. Keep those contracts working during any migration or client transition.

## Proposed model

### Topic spaces

- Add `community_spaces` with a stable UUID, unique slug, name, description, rules, visibility, status, and timestamps.
- Start with public, read-accessible spaces. Require membership to publish; allow reading without joining. Add private spaces only if a later product decision needs them.
- Add `community_memberships` with a unique `(space_id, user_id)` key and a role such as `member`, `moderator`, or `owner`. Platform administrators continue to use the existing `is_admin()` authorization.
- Create one public `General` space as the compatibility default and backfill every existing post to it. Preserve all post IDs, authors, statuses, timestamps, comments, reactions, bookmarks, and reports. Add other topics after the new community interface is ready.
- Add `community_id` to `community_posts`, backfill it, then enforce `NOT NULL`. Keep provider promotions representable in the existing post table; they can be excluded from ordinary topic spaces by a server-side rule if product chooses that behavior.

### Discussion and voting

- Add nullable `parent_comment_id` to `community_comments`, referencing the same table. Null means a top-level comment; a value means a reply. Add indexes for `(post_id, parent_comment_id, created_at)` and validate that a parent belongs to the same post.
- Keep `community_post_likes` as upvotes for the first release. It already provides one reaction per `(post_id, user_id)` and the engagement RPC already returns counts without exposing voter identities. Defer downvotes until there is a product decision and ranking policy.
- Keep `community_saved_posts` as the bookmark store.

### Safety and moderation

- Add `community_user_blocks` with `(blocker_id, blocked_id)` as the key, a self-block prohibition, and authenticated owner-only read/write policies. Blocking is directional: hide the blocked person's posts and comments from the blocker, and prevent new interactions between the pair. Do not notify the blocked person.
- Extend the existing post report table with an optional `comment_id`; retain `post_id` as the parent post for navigation. Use separate partial unique indexes for `(post_id, reporter_id)` on post reports and `(comment_id, reporter_id)` on comment reports. Preserve existing report IDs and moderation statuses, and update the admin queue to show either target.
- Retain audit records for moderator actions. Community owners/moderators may act only inside their own space; platform administrators retain global access.
- Add server-side rate limits for post creation, comments/replies, reports, membership joins, and blocking. Enforce them in database triggers, never only in the client. Use atomic per-user/action windows, return a stable rate-limit error, and allow narrowly defined administrator bypasses.

### Initial limits

- Posts: 5 per 10 minutes and 20 per 24 hours; provider promotions continue to use their existing entitlement limit.
- Comments and replies: 20 per 10 minutes and 100 per 24 hours.
- Reports: 5 per hour.
- Membership joins and blocks: 20 per 24 hours each.

These are conservative starting values and can be adjusted after observing abuse and normal usage.

## Access rules

- Anyone may read published posts in public spaces; authenticated members may create posts there.
- Authors may edit/delete their own eligible content. Moderators may hide/remove content only in spaces they moderate. Platform administrators retain existing global moderation controls.
- Users may read their own memberships, votes, saved posts, and blocks. Voter identities and other users' private relationship rows are not exposed.
- Comments inherit the post's space for authorization. Replies must point to a comment on the same post.
- Block filtering is applied to feed and comment reads, while database write checks prevent blocked-pair interactions. Reporting remains available for blocked content.
- Keep promotion entitlements and provider ownership enforcement intact while community permissions are added.

## Safe migration sequence

1. Add the spaces and memberships tables, policies, indexes, and a seeded `general` space.
2. Add nullable `community_id`; backfill existing rows to `general`; verify zero nulls and preserve row counts; then add the foreign key and `NOT NULL` constraint.
3. Add threaded comment parent support and same-post validation.
4. Add votes, backfill likes as upvotes, and make the engagement RPC compatible with old and new clients.
5. Add block storage and enforce filtering/interaction rules.
6. Extend reports to comments and adapt the admin queue without dropping existing report records.
7. Add and test server-side rate limits.
8. After database replay and RLS tests pass, update generated database types and application repositories. Restructure the interface only after this backend contract is stable.

Each stage should be a separate forward-only migration with a rollback note. Do not drop or rename existing tables, columns, functions, or IDs during the compatibility period.

## Required verification

- Clean local database replay applies every migration in order.
- Existing community posts, comments, likes, saves, and reports remain readable after backfill.
- RLS tests cover anonymous reads, member posting, non-member denial, author edits, moderator scope, administrator scope, and cross-user isolation.
- Thread tests reject cross-post parents; vote tests enforce one signed vote per user/post and verify score changes.
- Block tests verify feed/comment hiding and blocked-pair write denial without leaking block lists.
- Rate-limit tests exercise concurrent requests and confirm limits cannot be bypassed with direct table inserts.
- Existing promotion, offline post sync, and admin moderation workflows continue to pass.

## Defaults selected for the first backend version

- Start with public `General`; allow future public/private spaces, with membership required outside `General`.
- Use upvotes only; keep the existing like storage and engagement RPC.
- Preserve provider promotions in `General` under the existing provider ownership and entitlement checks.
- Add the limits listed above, enforced server-side.

## Implementation status

- The local migration adds `General`, memberships, space assignment, nested comments, comment reports, user blocks, per-user rate limits, and moderator RPCs.
- The admin report queue and shared dashboard mapper now show comment reports and resolve/remove reported comments.
- No migration has been applied to Production. Initial local replay and RLS checks pass; remaining release verification is listed below.

## Local verification � 2 October 2026

The community foundation has been replayed locally. Production remains unchanged.

Added `20261002110000_secure_community_engagement_visibility.sql` to:
- Restrict the engagement RPC to readable active spaces and filter blocked comments from counts.
- Reject likes and bookmarks on posts the caller cannot read.
- Break the recursive space/membership RLS dependency with a current-user-only membership lookup.

Added rollback-only `community_backend.test.sql` with 26 checks covering legacy General posting, public/private reads and aggregates, membership authorization, nested replies, duplicate votes, bookmarks, blocking, reporting blocked content, moderation scope, and direct-insert post limits. Together with existing tests, 53 database checks pass. Shared types were generated from the local database.

The four follow-up backend verification tasks are complete locally (see COMMUNITY_BACKEND_VERIFICATION_2026-10-02.md):
- Every configured action window passed boundary checks and a 12-connection concurrent insert race.
- Promotion ownership, expiry, monthly cap, and concurrent entitlement enforcement passed.
- The actual offline sync worker recovered from transport failure and a lost committed response without duplicate publication.
- Author edits/deletes, promotion-edit bypass prevention, comment-report resolution/auditing/conflicts, and populated-data migration preservation passed.

Two additional forward migrations guard post edits/automatic join counting and add idempotent queued publication. The offline sync worker uses the new RPC. Deploy the database migrations before releasing this client change; the new RPC must exist in the target environment.

Remaining integration/release work:
- Customer UI currently exposes posts/comments/likes/saves/post reports, but not spaces, threaded replies, user blocking, or comment reporting.
- Verify admin report resolution end to end and regenerate/validate any additional client-specific contracts.
- Review migrations, then deploy only with explicit production authorization and run post-deployment checks.

No claim of full community release readiness is made from the passing subset above.
