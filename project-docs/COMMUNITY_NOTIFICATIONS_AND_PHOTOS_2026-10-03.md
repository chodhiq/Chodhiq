# Community notifications and photo uploads

The customer community composer now supports one JPEG, PNG, or WebP photo per post (5 MB maximum), with a preview, replacement, and removal. Upload errors preserve the draft. Photo posts require a connection. Failed post inserts attempt to remove their uploaded image.

Photos use the private `community-images` bucket. Posts store a stable `community-image:` storage reference; the feed resolves it to a one-hour signed URL under the reader's permissions. Existing external image URLs remain supported.

Migration `20261003110000_community_images_and_post_notifications.sql` creates storage policies and new-post notifications. General posts notify other profiles; other spaces notify members. Blocked authors and self notifications are excluded. Edits do not notify again. Notifications include community-post routing metadata. In-app and device notification taps open Community and select the destination space. Notifications refresh on app foregrounding as well as realtime events.

Production inspection found that `20261003100000_allow_community_post_images.sql` was already applied and the `push-notification` Edge Function was deployed, but there was no webhook trigger on `public.notifications`. Migration `20261003120000_connect_notification_push_delivery.sql` now adds asynchronous dispatch through `pg_net` and enables notification realtime publication. The dispatch function reads its URL and credential from Vault, and the updated Edge Function accepts a separate `COMMUNITY_PUSH_WEBHOOK_SECRET` without replacing its existing credential. `scripts/configure-community-push.mjs` configured the matching secret using temporary files that were deleted and never logged.

Production rollout completed after the user's follow-up instruction to resolve the issue. The revised rehearsal disables push dispatch in its transaction, tests synthetic fixtures, and rolls everything back. All 12 notification/image-privacy assertions passed both before and after deployment, including administrator access to removed-post photos for moderation. The admin community page source resolves private photo references to signed links; no admin web hosting deployment was performed. TypeScript, launch, quality, accessibility, security, all 105 application tests, formatting, the Android Hermes export, and the final `npm run verify` web export passed. Admin web type checking, lint, and build passed; the changed push function passed a targeted Deno check. The broader function check encountered an unrelated existing Stripe `Subscription.current_period_end` type error. ADB reported no attached device, so phone runtime testing remains pending.

APK build: version 1.0.0/code 23, build `cc3602d8-f690-4f92-a260-0c13db72cbed`, using the existing production APK profile and remote keystore.
Build page: https://expo.dev/accounts/chodhiq26/projects/chodhiq/builds/cc3602d8-f690-4f92-a260-0c13db72cbed
Source hash record: `artifacts/community-photos-build-source.json`.

Approved rollout sequence: rehearse with `node scripts/rehearse-community-notifications.mjs`; deploy `push-notification` with JWT verification disabled (its existing webhook authentication remains); configure the separate push credential; dry-run and apply exactly the two pending community migrations; rerun rehearsal with `--deployed`; verify the dispatch trigger, private bucket, realtime publication, migration status, and unauthenticated webhook rejection. Device delivery requires a registered token and OS notification permission. No store submission or OTA update is part of this change.

Production evidence: exactly migrations `20261003110000` and `20261003120000` were applied, with no seeds or roles. A subsequent dry run reports up to date. Both notification triggers are enabled; `community-images` is private with a 5 MB limit; realtime publication contains notifications; Vault configuration is present; `pg_net` is installed; authenticated clients cannot directly execute dispatch; zero synthetic users remain. A harmless invalid-event request sent from `pg_net` with the Vault credential returned HTTP 400 (`Invalid notification webhook payload`), demonstrating authenticated connectivity without delivering a push. A request without a credential returned HTTP 401. The function retained its existing `verify_jwt=false` setting, confirmed from production before deployment; webhook-secret authentication remains enforced. Workspace security checks passed again after rollout.

APK completed: https://expo.dev/artifacts/eas/lGQbDhPwy3Ts_uuvs0sZwiqtFzMyxQmsEItOAkzylsU.apk
Local APK: outputs/ChodhiQ-1.0.0-community-photos-v23.apk
SHA-256: 5c00c38cbbb3ecbb6c94d077099167b99fc6cafa693ab22302d145d9a1cccc61
Size: 108866504 bytes.
Verified package com.chodhiq.app, version 1.0.0/code 23, non-debuggable, valid signature matching the previous release, and source hashes unchanged since upload.
Phone runtime testing remains pending.
