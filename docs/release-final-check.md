# Android release final check

Audit date: 2026-11-05. Scope: read-only inspection of this workspace and Git history; no database or EAS service was queried. Secret values are intentionally omitted. Current Git HEAD is `2fa41e31337102d70efe9a9eb9e0e6f801b3dd4c`; worktree contains pre-existing modifications and untracked files.

## Verdict: NOT READY

The app build/test checks passed, but release readiness is not established. The live production signing lineage is unclear and a prior build note records an APK signed with the `dom789` lineage that cannot update version 28 installations. Remote versionCode, production EAS variables/credentials, current live closed-test build, and Supabase migration application state were not queried. The new migration tightens policy access for some workflows, and one additional migration has a data update inside its SQL despite this audit not running it.

## Build and code

| # | Result | Proof / findings |
|---|---|---|
| 1 | PASS | `npx tsc --noEmit`: exit 0. `npm run lint`: exit 0, 0 errors and 174 warnings. `npm run test:buttons`: 12 suites, 92 tests passed. `npm run test:ci`: exit 0; embedded lint, button tests, and Node suite passed. Node suite: 166 tests, 165 passed, 0 failed, 1 skipped. `npm test` independently confirmed those counts. Test skip location: not found by a search for `.skip()` in `__tests__`; skipped test identity was not printed by TAP summary. Current changed test files and recent commits could not be reliably determined because the worktree contains pre-existing edits; `git log` has no conventional recent commit for the current feed test. |
| 2 | UNVERIFIED | `npx expo-doctor` failed before running: npm reported EACCES fetching `expo-doctor` from the npm registry. No doctor result is available. |
| 3 | UNVERIFIED | [app.base.json](../app.base.json#L6) keeps version `1.0.0`, and lines 23-25 keep package `com.chodhiq.app`; [app.config.js](../app.config.js#L202) allows `EXPO_ANDROID_PACKAGE` override. [eas.json](../eas.json#L71) production has `autoIncrement: true` and remote app version source at lines 2-4, but does not set an Android `buildType`; production store distribution/default AAB behavior was not verified by a build. Current versionCode and signing credentials are remote and cannot be proved locally. `project-docs/ANDROID_APK_BUILD_2026-10-12.md:18,36,38` says the version 29 APK from `dom789` cannot update version 28 installs with another certificate; lines 3,10 say later versionCode 30. This contradicts a general assumption that package/signing remain unchanged for every live closed-test cohort. `.env` can override dynamic config and is not displayed. No `APP_VARIANT` definition was found in `app.config.js` or `eas.json`; some package/slug/scheme variables can override production identity in [app.config.js](../app.config.js#L190-L205). |
| 4 | FAIL | [app.config.js](../app.config.js#L150-L155) configures the Google Mobile Ads plugin with production ID environment variables but silently falls back to Google's test app IDs if missing. Production profile explicitly sets `EXPO_PUBLIC_ENABLE_GOOGLE_ADS=false` in [eas.json](../eas.json#L75-L79); a real production Android app ID is therefore not established. Safe module absence is handled by [GoogleBanner.native.js](../src/components/GoogleBanner.native.js#L23-L43), which returns null and reports unavailable module/configuration errors. |
| 5 | UNVERIFIED | Sentry is enabled only when DSN, Sentry org/project/auth variables all exist in [app.config.js](../app.config.js#L61-L76); otherwise upload is disabled. `app_config` kill-switch row/table is defined by [20261103120000_button_kill_switch_config.sql](../supabase/migrations/20261103120000_button_kill_switch_config.sql#L1-L20). Production env flags are declared in [eas.json](../eas.json#L71-L80), but EAS-held Sentry, push, and kill-switch settings were not queried. Push build requires `GOOGLE_SERVICES_JSON` and FCM credentials per [app.config.js](../app.config.js#L121-L139). |
| 6 | PASS (repository scan only) | Required production public names are declared/validated at [app.config.js](../app.config.js#L30-L38) and missing production values throw at lines 82-117. EAS variable presence is UNVERIFIED. Search excluding `node_modules` found no `SERVICE_ROLE`/`service_role` variable references in client files, `app.config.js`, `eas.json`, or `EXPO_PUBLIC_` names. `.env` and `.env.local` exist and `git check-ignore` confirms both are ignored. No secret values were read. |

## UI

| # | Result | Proof / findings |
|---|---|---|
| 7 | PASS | [AccountScreens.js](../src/screens/AccountScreens.js#L497-L507) passes text via `label` to `AsyncGlowButton` and gives the auth button height 54. [GlowButton.tsx](../components/ui/GlowButton.tsx#L481-L518) renders labels and child text inside React Native `<Text>`; no raw text-child issue found in the inspected sign-in flow. |
| 8 | PASS | Home “Create a post” routes to the new feed via [HomeScreen.js](../src/screens/HomeScreen.js#L475-L477) (`CommunityTab`, compose param); `CommunityTab` maps to `CommunityFeedScreen` in [RootNavigator.js](../src/navigation/RootNavigator.js#L94-L98). The old Mela Feed remains reachable as stack route `Community` at [RootNavigator.js](../src/navigation/RootNavigator.js#L242); it is also reachable from routes/links not fully enumerated here. `CommunityScreen` remains imported and registered in lines 15, 56, 242. |
| 9 | FAIL | Category, sort, and report choice sheets use `GlowSheet` at [CommunityFeedScreen.tsx](../screens/CommunityFeedScreen.tsx#L393-L424) and #L589-L607. “All categories” sets null at lines 373-378 and 416-419; filtering preserves all posts for null at lines 71-75 and `ListEmptyComponent` handles no results at lines 427-450/490-493. However the old route's block confirmation still uses `Alert.alert` at [useCommunityFeed.js](../src/hooks/useCommunityFeed.js#L685-L718); feed success/error/guest dialogs also call `AppAlert` at [CommunityFeedScreen.tsx](../screens/CommunityFeedScreen.tsx#L110-L121) and #L226-287. This is not proof of native `Alert` specifically for category/sort/emoji/post options; category/sort use the themed sheet. |
| 10 | UNVERIFIED | A broad automated JSX audit for every decorative layer was not available. Static scan found 68 literal `pointerEvents="none"` uses under `src/`, `screens/`, and `components/`; this count does not prove every decorative layer is covered. |
| 11 | PASS | The screen map labels OLD UI: Opening (#1), Email confirmation (#11), Quote requests (#15), Bookings (#16), Reviews (#17), Privacy (#20), Help (#21), Categories (#24), Offers (#28), Events (#29), Subscription plans (#31; no route), font startup loading (#42), and auth bootstrap loading (#43), per [app-screen-map.md](app-screen-map.md#L11-L54). Mixed UI also remains on tabs and account/discovery screens per same map. |
| 12 | UNVERIFIED | Static heuristic scan found 201 style dimension entries below 44 (width/height/minHeight) and 189 hex color occurrences in `src/`, `screens/`, `components/` excluding `theme.ts`. These are occurrence counts, not counts of unique controls/colors; no full touch-target audit was done. |

## Backend (source and migrations only)

### 13. New migration files versus live build baseline

The repo's Android build note identifies commit `f506df9496aef3b9948182b26ba64ee44af912dd` and says the shipped archive also contained uncommitted workspace changes (`project-docs/ANDROID_APK_BUILD_2026-10-12.md:46`). Comparing the current worktree against that Git commit finds 12 tracked migration files added after that commit and 4 more untracked migration files. Since the exact archive source hashes are not enumerated by this comparison, treat the set as “added since Git baseline,” not proven unapplied/live-database migrations.

**Tracked after Git baseline:**

- `20261011120000_community_actor_names_in_notifications.sql` — additive notification actor display data.
- `20261014120000_guard_confirmed_booking_slots.sql` — booking slot guard; constrains/blocks unavailable or confirmed slots.
- `20261014130000_complete_comment_identity_booking_availability.sql` — additive comment identity and booking availability data/functions.
- `20261014140000_complete_account_deletion_cleanup.sql` — expands account deletion cleanup; destructive deletion behavior.
- `20261021100000_notification_actor_details.sql` — additive notification actor details.
- `20261021120000_harden_supabase_linter_findings.sql` — access/security hardening; may tighten old access.
- `20261022120000_admin_targeted_notifications.sql` — additive targeted admin notification support.
- `20261022130000_timed_community_privileges.sql` — time-bounds community privileges; tightens access.
- `20261023100000_admin_notification_history_read.sql` — admin notification history read policy/function support.
- `20261023110000_admin_permission_enforcement.sql` — tightens admin permission enforcement.
- `20261024193000_provider_directory_filter_summaries.sql` — additive provider directory summaries.
- `20261024202600_fix_provider_directory_verification_date.sql` — changes verification-date summary logic.

**Untracked after baseline:**

- `20261027120000_optional_campaign_business_destination.sql` — loosens required columns `ad_campaigns.provider_id` and `destination_url`, but tightens destination URL format to HTTPS when present.
- `20261103120000_button_kill_switch_config.sql` — additive `app_config` table and public read-only row policy/grant.
- `20261104130000_geocode_provider_locations.sql` — adds/replaces authenticated `set_provider_coordinates` RPC and updates a matching provider's missing coordinates in its SQL body (the audit did not run this migration). It allows owner/admin or a user with a pending verification request; execution granted to authenticated only.
- `20261105150000_customer_owner_rls_baseline.sql` — creates/reasserts app_config and drops all policies then replaces access rules on profiles, reviews, bookings, quote_requests, saved_items, notifications, community_posts, community_comments, community_post_likes, community_saved_posts, community_post_reports, community_user_blocks, and storage verification documents. This tightens and changes access; see below.

Potential previous-version breakage: strict own-row predicates can reject legacy rows whose `user_id`, `author_id`, `reporter_id`, `blocker_id`, or storage path does not match `auth.uid()`. The new community comment SELECT allows only own comments and can block reading other users' comments in feed/details. `notifications` customer inserts are owner-only, so server-created notifications for another user must use an Edge Function/service role. The migration's `DO` block removes all prior policies on listed tables, including any needed provider/admin policy, then recreates only policies shown in this migration. Owner/business/admin behavior needs a migration-level policy regression review before deployment.

### 14. Old version operations blocked by new policies

The requested `git show` baseline is `f506df9496aef3b9948182b26ba64ee44af912dd`; it is not the exact shipped app per the build note. Old source operations found:

- **Guest:** old `CommunityScreen.js` reads published community posts and spaces, and reads comments; migration makes posts public but comments SELECT authenticated-only and actor-only. A guest reading comments will be blocked by the new comments policy. Proof: old commit `src/screens/CommunityScreen.js:134,141,165,599`; new policies in migration `20261105150000_customer_owner_rls_baseline.sql:145-180`.
- **Signed-in customer:** old app reads comments by post, community engagement counts, and member profiles. The comment read is narrowed to own comments only; likes/saved-post records are read only for self, while aggregate counts need their RPC to remain privileged/correctly scoped. Old read paths: `src/screens/CommunityScreen.js:599`; current feed reads via `src/hooks/useCommunityFeed.js:124`, #143; new rules at migration lines 163-211. Inserts/deletes to own likes/saves/comments/reports/blocks match their new owner predicates when identity fields are correct.
- **Business owner:** new customer-only own-row policies on profiles, reviews, bookings, quote requests, saved items and notifications may conflict with provider access to customer-owned rows; old app has business workflows and Edge Functions. No proof was found that the app directly uses those customer tables as an owner for another user's row. UNVERIFIED rather than asserting breakage.
- **Admin:** because the migration removes all prior policies (lines 22-42) then installs owner policies (e.g. community reports/blocks at lines 215-244), existing admin direct table access may be blocked unless admin RPCs/service-role Edge Functions bypass RLS. The old commit has admin functions/routes; exact use by this mobile app is UNVERIFIED.

### 15–18. Community and account

| # | Result | Proof / findings |
|---|---|---|
| 15 | FAIL | Current new Community tab uses real backend: posts `community_posts` in [useCommunityFeed.js](../src/hooks/useCommunityFeed.js#L86-L124); publish insert/queue at lines 270-328; likes `community_post_likes` with optimistic rollback at lines 344-420; bookmarks `community_saved_posts` with rollback at lines 455-505; comments `community_comments` with rollback at lines 540-605; reports `community_post_reports` lines 633-679; blocks `community_user_blocks` lines 685-735. Permanent failed queued likes/bookmarks/comments reconcile counts/feed through [CommunityFeedScreen.tsx](../screens/CommunityFeedScreen.tsx#L124-L222), and failed writes surface through shared pending-write alerts. But the new migration comment SELECT policy grants only the actor their comments (migration lines 163-180), which prevents the feed's intended public comment list for other authors. New tab report/block are remote; block's confirmation is native `Alert.alert`, not a themed sheet. |
| 16 | FAIL | Community post queued state is distinguished and confirmation is shown after synced operation (`CommunityFeedScreen.tsx:107-122,240-263`). But `reportPost` returns success immediately for queued auth failures at [useCommunityFeed.js](../src/hooks/useCommunityFeed.js#L666-L675), while the UI's report action calls “Report sent” at [CommunityFeedScreen.tsx](../screens/CommunityFeedScreen.tsx#L415-L422) without waiting for remote confirmation. Other local/queued success candidates outside these paths were not exhaustively enumerated. |
| 17 | PASS | Privacy settings is reachable and contains export/delete controls: [PrivacyScreen.js](../src/screens/PrivacyScreen.js#L202-L211) export and #L236-248 delete; action wired via profile/settings navigation in the screen map and route tree. Delete calls `deleteAccount` at lines 61-68, whose repository invokes `delete-account` at [accountRepository.js](../src/data/accountRepository.js#L140-L143). Export uses `exportCurrentAccount` at [PrivacyScreen.js](../src/screens/PrivacyScreen.js#L32-L42) and the account repository reads account tables locally/remotely at lines 149-190; it does not invoke a named `export` Edge Function. |
| 18 | FAIL | No rollback/down SQL was found for the RLS-tightening migration or the other new migrations (`supabase/migrations/20261105150000_customer_owner_rls_baseline.sql`). The audit did not execute SQL. |

## Other release checks and blockers

### Service-role and environment checks

- No service-role variable-name references were found in client sources, `app.config.js`, `eas.json`, or `EXPO_PUBLIC_` variable names. Files searched excluded `node_modules`; `.env` and `.env.local` exist and are git-ignored. Their contents were not read for this report.
- Required production `EXPO_PUBLIC_*` names: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_EAS_PROJECT_ID`, `EXPO_PUBLIC_RELEASE_COMMIT`, `EXPO_PUBLIC_TERMS_URL`, `EXPO_PUBLIC_PRIVACY_URL`, `EXPO_PUBLIC_DELETE_ACCOUNT_URL`, `EXPO_PUBLIC_SUPPORT_EMAIL`. These are mandatory in production config but EAS value presence is UNVERIFIED.
- Push config needs `GOOGLE_SERVICES_JSON`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_ANDROID_SHA1`, FCM v1 service-account credentials; values/presence unverified. Sentry requires `EXPO_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`; presence unverified. Ads are disabled in production profile, so production Ads app/unit IDs are not verified/set as real IDs.
- The kill-switch table migration is present in source; whether it is applied remotely and whether an enabled row is configured are UNVERIFIED.

### Top blockers

1. **BLOCKER — signing/update lineage:** prior release notes show version 29's `dom789` signing certificate cannot update version 28 installations (`project-docs/ANDROID_APK_BUILD_2026-10-12.md:18,36,38`). Confirm the target closed-test cohort and release signing lineage before publishing.
2. **BLOCKER — migration compatibility:** owner-policy migration restricts comment reads to the comment author and removes all existing policies before re-adding a smaller set (`20261105150000_customer_owner_rls_baseline.sql:22-42,163-180`). This conflicts with public community discussion/comments and may remove business/admin policies.
3. **BLOCKER — migration deployment state:** migrations are not confirmed applied; no live database query was run. New code and backend policy deployment must be coordinated.
4. **HIGH — production EAS configuration unknown:** EAS production variables, push credentials, Sentry configuration and remote versionCode were not queried.
5. **HIGH — production Ads ID fallback:** plugin silently selects test app ID when production env var is absent (`app.config.js:150-155`). Ads are currently disabled by the production profile.
6. **HIGH — queued reports can show premature success:** auth-expired report is queued then caller reports “Report sent” before backend completion (`useCommunityFeed.js:666-675`, `CommunityFeedScreen.tsx:415-422`).
7. **HIGH — Expo Doctor unknown:** check did not run due registry access EACCES.
8. **MEDIUM — no migration rollback SQL:** no rollback file found for access tightening.
9. **MEDIUM — old screen remains reachable:** Mela Feed stack route remains alongside new tab.
10. **LOW — UI audit is heuristic:** static scans did not establish every touch target or decorative pointer-events behavior; colors/dimension counts are broad source occurrences, not unique issues.

### Acceptable known issues (not release blockers by themselves)

- Lint has 174 warnings and zero errors.
- Node test suite has one skipped test and 165 passes; button suite has 92 passes.
- Production Google ads are explicitly disabled; safe null behavior prevents a crash when the native ads module/config is unavailable.
- Several screens remain OLD/MIXED UI according to the screen map; product decision whether to ship mixed UI remains with release owner.
- Offers and events are static/feature-gated per `docs/app-screen-map.md:242-251`.

