# Community interactions and notifications — 4 October 2026

Changes:

- Read all removes read notifications from the in-app list, persists the change,
  and dismisses matching phone notifications. Opening the screen no longer marks
  everything read automatically. Failed writes leave items visible for retry.
  Notifications arriving during the request are preserved, and stale refreshes
  cannot restore the cleared snapshot.
- Removed explicit haptic feedback from navigation, buttons, likes, authentication,
  and successful form submissions. Added Notification vibration in Profile and
  Settings, persisted on the device and synced to the registered push profile.
  Separate Android channels support vibration on/off. Existing installed versions
  retain the default channel until a new client registers its channels.
- Create Post opens a compact popup. Optional topic, area and business fields are
  collapsed. Both community entry points open this composer; Home's community CTA
  also opens it instead of the old business promotion screen. Draft text survives
  closing or failed requests. Keyboard avoidance covers post and comment inputs.
- General remains the shared community space, with an explanation below Your spaces.
- New backend notifications cover post likes, comments, replies, report receipts,
  admin report queues, report decisions and content removal. Existing new-post,
  booking, quote and review notifications remain. Reports never disclose the
  reporter to the content author. Self, blocked and inaccessible private activity
  does not generate engagement notifications. Re-liking cannot repeatedly notify.
- Push delivery checks Expo ticket errors and clears invalid device tokens. A
  successful ticket means accepted by Expo, not confirmed delivery to the phone.

Deployment:

- Applied only migration 20261004150000_community_activity_notifications.sql after
  comparing remote history and a db push dry run.
- Deployed the updated push-notification Edge Function to gfjhvsajwjrrlylgrkhf.
- Regenerated shared database types from the linked schema.

Tests:

- Fifteen database assertions passed in a rolled-back local Supabase transaction
  with outbound push disabled; no test notifications were sent to real users.
- Five executable notification-state regression tests passed (concurrent arrivals,
  failed writes, stale refresh, selective phone dismissal, account switching).
- Full release checks passed, including 111 app tests; Android Hermes export also
  passed. Results are recorded in
  artifacts/community-interactions-verification.log and
  artifacts/community-interactions-android.log.

Physical Android testing remains necessary for keyboard visibility, photo picking,
background notification delivery and the vibration toggle. Android notification
permissions, user channel overrides and battery restrictions still apply. Build 25
was submitted before these changes and does not contain this fix.

Replacement Android APK submitted as version 1.0.0/code 26, EAS build
c979d6fd-3be3-4b81-9987-ef33897bfbff (production-apk). Build page:
https://expo.dev/accounts/chodhiq26/projects/chodhiq/builds/c979d6fd-3be3-4b81-9987-ef33897bfbff
Source hashes: artifacts/community-interactions-build-source.json.
