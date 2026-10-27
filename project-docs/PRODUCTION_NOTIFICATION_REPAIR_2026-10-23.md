# Production notification repair — 2026-10-23

The admin notification composer failed because the Production database did not
have `public.admin_send_notification`, although the dashboard called it and its
migration was present in the repository.

Applied `supabase/migrations/20261022120000_admin_targeted_notifications.sql`
to Production project `gfjhvsajwjrrlylgrkhf` and recorded migration
`20261022120000` as applied.

A follow-up backend check found that notification history and its counts were
blocked by RLS: users could read only their own rows, while the admin page
queries all notifications. Added the narrowly scoped
`Admins read notification history` SELECT policy, requiring
`admin_has_permission('notifications.send')`, in
`supabase/migrations/20261023100000_admin_notification_history_read.sql`.
Applied it to Production and verified the live policy. No notifications or user
records were created by verification.

## Verification

- Production PostgREST recognizes `admin_send_notification`; an anonymous
  request is denied execution rather than reporting the function missing.
- `notifications` grants SELECT to authenticated users, and the new RLS policy
  allows notification-history reads only to admins with the send permission.
- The `dispatch_notification_push_trigger` trigger is enabled on
  `public.notifications`.
- The notification webhook URL and secret are configured in Vault.
- `public.notifications` is included in `supabase_realtime`.
- A request signed using the Vault secret reached the live push function and
  returned its expected invalid-payload response (HTTP 400). This verified the
  webhook path without delivering a push.
- The `admin-role-control` and `push-notification` Edge Functions are active.
- Production aggregate counts were 134 notifications, 0 provider analytics
  events, 0 subscription requests, and 7 audit events at verification time.

Admin-created notification rows can now reach the in-app notification stream.
Push delivery additionally depends on a recipient having a valid registered
device token and allowing notifications. No real broadcast or device push was
sent during verification. Analytics and subscription tables are present and
queryable, but were empty at verification time.

Other pending migrations were left untouched.
