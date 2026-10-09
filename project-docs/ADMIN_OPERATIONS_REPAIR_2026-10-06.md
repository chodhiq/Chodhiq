# Admin operations repair - 6 October 2026

## Findings

Pending business applications are stored in business_applications. Provider rows are created only after approval. The application review page existed but had no sidebar or overview entry. The dashboard's provider count therefore did not describe the pending application queue. Live production data and the submitted DRD application have not been inspected in this change.

Community feed subscriptions depended on the complete admin context, which changes during confirmations and mutations. Photos were rendered as external links rather than inline attachments. Several operational routes were missing from navigation, and Payouts incorrectly linked to Analytics when monetisation was disabled.

## Changes

- Grouped navigation exposes business review, providers, verification, bookings and quotes, demand, customers, categories, reviews, community feed, privileges, reports, advertising, notifications, analytics, administrator management and audit history. Payments and subscriptions remain governed by the existing monetisation setting.
- Overview shows pending applications, verified providers, bookings and open community reports. Review queue preview includes deadlines and links to review. Metrics now use the displayed status rather than counting every row under an inaccurate label.
- Applications refresh on focus, every 30 seconds and through realtime events; display reference IDs; link approved applications to provider details.
- Feed subscriptions are independent of changing admin action state. Search, status filters, author names, inline images, attachment failure messages and per-post reasons are included. Request IDs prevent older fetches overwriting newer results.
- Admin can inspect paginated comments and remove or restore them using reasons, confirmation, server authorization, concurrent-status checks and atomic audit logging.
- Author links open exact customer ID searches. Community privileges link to the existing space, owner/moderator/member and participation controls.
- Operational cards, navigation groups, media and comment areas have responsive layout rules.

## Backend release dependency

Apply supabase/migrations/20261006100000_admin_feed_operations.sql after the existing October migrations, including community privileges. It adds audited comment moderation and business-application realtime publication.

The community feed supports images only. Comment moderation requires the new RPC.

No database migration or dashboard deployment was performed. No production account/application state was altered.

## Verification

npm run verify --prefix admin-dashboard passed: lint; web and worker TypeScript checks; Deno checks for shared functions; production build; all 23 automated tests including route rendering.

supabase/tests/admin_feed_operations.test.sql covers unauthorized moderation, required reasons, invalid status, remove/restore, stale decisions, audit records. These database tests are authored but not executed: the local Docker/Supabase engine is unavailable.

Before release, execute the new database tests and existing business application/community privilege/security tests in a test database, then verify the specific submitted application, private media, admin moderation, and desktop/mobile layouts in an authenticated browser session. Existing unrelated workspace edits were preserved.

## Release follow-up

Released on 6 October 2026 after explicit authorization. See RELEASE_2026-10-06.md for applied migrations, live admin verification, passing database tests and verified APK v28. Earlier local-only and unexecuted-test notes above describe the pre-release state. Physical phone testing remains unexecuted because no phone was available.
