# Backend fix plan

Read-only plan derived from `docs/backend-wiring.md` and targeted source checks. No source files or backend state were changed.

## 1. Phase check

- PHASE 1 COMPLETE
- PHASE 2 COMPLETE
- PHASE 3 COMPLETE
- PHASE 4 COMPLETE
- PHASE 5 COMPLETE
- PHASE 6 COMPLETE
- PHASE 7 COMPLETE
- Missing phases: none.

## 2. Non-CONNECTED items

UI action | file:line | what is wrong in one sentence | what it needs | launch impact
---|---|---|---|---
Community tab feed | `screens/CommunityFeedScreen.tsx:85,220-221` | The production tab initializes fixture posts and local UI state instead of loading/saving the real community feed. | code change | BLOCKER
Community tab publish/like/bookmark/comment | `screens/CommunityFeedScreen.tsx:85-221`; `components/PostCard.tsx:128-151` | These tab interactions are backed by local state or incompletely traced callbacks, so successful-looking actions may not persist remotely. | code change | HIGH
Subscription plan checkout | `src/screens/MarketplaceScreens.js:117`; route absent in `src/navigation/RootNavigator.js` | The checkout component invokes an existing function but has no registered navigation route, making it unreachable. | code change | HIGH
Guest mode | `src/screens/OpeningScreen.js:38` | Guest continuation only records a local onboarding flag and does not create a backend identity. | human decision | LOW
Avatar upload | `src/screens/ProfileScreen.js:88,162-163` | The selected avatar is saved as a local URI and is not uploaded to a storage bucket. | code change | LOW
Offers and events | `src/screens/DiscoveryScreens.js` (see component definitions); `src/data/discoveryData.js` | Offers and events are static local data rather than remotely managed records. | code change | LOW
Preferences sync | `src/screens/ProfileScreen.js:43-45,245-269` | The audit did not establish which preference fields persist remotely and what is read back. | code change | LOW
Become a provider | `src/screens/MarketplaceScreens.js` (screen map entry); `src/data/claimRepository.js` | The exact become-provider form-to-backend write path was not demonstrated in the source audit. | code change | HIGH
Session expiry mid-action | `src/lib/supabase.js:61-70`; write repositories | The audit did not establish consistent user-facing behavior when an auth session expires during a write. | code change | HIGH
EAS secret availability | `app.config.js:62-65`; EAS configuration | Source cannot prove that production EAS secrets exist or are populated. | human decision | HIGH
Sentry DSN/event delivery | `app.config.js:62-76`; `src/lib/sentryUtils.js` | Sentry setup is conditional and live DSN delivery/configuration is unverified. | config | LOW
Offline failed-write feedback | `src/data/syncRepository.js:63-91`; `src/hooks/useOfflineSync.js` | Failed or exhausted queued writes are counted locally without proven user-facing notification. | code change | HIGH
Legacy community writes | `src/screens/CommunityScreen.js:279-310,472`; `src/hooks/useCommunityFeed.js:331-542` | Several write paths are implemented, but action-specific readback and error display were not verified. | code change | HIGH
Review edit/delete policy | `src/data/reviewRepository.js:33-61` | The client edits and deletes reviews, but the effective deployed policy match was not proven. | migration | HIGH
Profile queued upsert policy | `src/data/syncRepository.js:48-53` | Offline profile synchronization uses upsert, while source policy review did not prove INSERT permission for every profile state. | migration | HIGH
Notification read update policy | `src/data/accountRepository.js:123-130` | Mark-read updates are issued but final deployed policy coverage is unverified. | migration | HIGH
Verification storage policy | `src/data/claimRepository.js:120-145` | Upload, download, and removal behavior may not all have matching bucket/object policies. | migration | HIGH
Service-role key presence | `.env.example:41` documents a server-side variable only; no app reference found | A service-role key must never be placed in client configuration, and repository-wide actual secret presence was left unchecked. | human decision | BLOCKER
Deployment migration state | `supabase/migrations/20261103120000_button_kill_switch_config.sql:1-20` | Source defines `app_config`, but without database inspection the migration's applied status is unknown. | migration | HIGH
Action-handler exactness in tab community | `screens/CommunityFeedScreen.tsx:220-221`; `components/PostCard.tsx:128-151` | Some individual mock/local actions lack an exact backend handler and readback trace. | code change | HIGH
Push token registration runtime | `src/lib/pushNotifications.js:31-101` | Registration code exists, but device permission, runtime module, and production configuration were not verified. | config | HIGH

## 3. Missing references and migration state

- Referenced-but-missing named table, RPC, Edge Function, or bucket: none confirmed in the backend audit source inventory.
- Dynamic names and deployed object availability remain unverified; do not infer absence from source search alone.
- Unapplied migrations: applied state cannot be checked under read-only/no-live-database constraints. In particular, `20261103120000_button_kill_switch_config.sql` defines `app_config` and may be unapplied.
- Client references include `set_provider_coordinates` and `app_error_events`; the audit did not establish a missing definition, so classify deployment as UNAPPLIED-OR-UNKNOWN rather than missing.

## 4. RLS gaps and tables

- Tables confirmed RLS-off: none established. The audit did not inspect a live catalog; RLS-off status is UNCHECKED.
- Operations with policy alignment requiring verification: reviews update/delete; profiles upsert/insert during sync; notifications update; verification object read/remove; booking status changes; owner reply create/update; community engagement writes. Final effective policy state is UNAPPLIED-OR-UNKNOWN.
- Public `USING (true)` read policies are present for intended public catalog/review/community data; confirm selected columns do not expose private fields. No unrestricted write predicate was confirmed in the audit.
- Compare final deployed policies with anon, authenticated customer, business owner, and admin paths before launch.

## 5. Secrets and configuration

- Service-role exposure: no client reference was confirmed in `src`, `screens`, `components`, `App.js`, `app.config.js`, or `eas.json`; `.env.example:41` mentions a server-side secret name. Actual `.env`/`.env.local` secret-name presence was not conclusively audited. No values are included here.
- Production-required variables consumed by `app.config.js`: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_EAS_PROJECT_ID`, `EXPO_PUBLIC_RELEASE_COMMIT`, `EXPO_PUBLIC_TERMS_URL`, `EXPO_PUBLIC_PRIVACY_URL`, `EXPO_PUBLIC_DELETE_ACCOUNT_URL`, `EXPO_PUBLIC_SUPPORT_EMAIL`.
- Other client variables: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_ANDROID_SHA1`, `EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_APP_ENV`, `EXPO_PUBLIC_BRAND_NAME`, `EXPO_PUBLIC_BRAND_SHORT_NAME`, `EXPO_PUBLIC_PRIVACY_EMAIL`, `EXPO_PUBLIC_BUSINESS_EMAIL`, `EXPO_PUBLIC_ENABLE_PAYMENTS`, `EXPO_PUBLIC_ENABLE_CUSTOM_ADS`, `EXPO_PUBLIC_ENABLE_GOOGLE_ADS`, `EXPO_PUBLIC_ENABLE_GOOGLE_MAPS`, `EXPO_PUBLIC_GOOGLE_ADS_ANDROID_BANNER_ID`, `EXPO_PUBLIC_GOOGLE_ADS_IOS_BANNER_ID`, `EXPO_PUBLIC_DEMO_MODE`.
- `.env.local` does not define several template/config variables, including release commit, legal links, Sentry DSN and Google OAuth values. EAS secret inventory is inaccessible from local config: UNCHECKED.
- Sentry EAS/CI secrets needing presence confirmation: `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`; optional `SENTRY_URL`. Do not print secret contents.

## 6. Top 10 risks by launch impact

1. Community tab displays fixture-backed local posts/interactions in a production surface (`screens/CommunityFeedScreen.tsx:85-221`) — BLOCKER.
2. Service-role secret presence/exposure was not conclusively checked in local env files; verify it is server-side only (`.env.example:41`) — BLOCKER.
3. Subscription checkout screen is not navigable (`src/screens/MarketplaceScreens.js:117`, route absent in `src/navigation/RootNavigator.js`) — HIGH.
4. Deployed migration and effective RLS state are unknown, including the `app_config` kill-switch migration — HIGH.
5. Profile sync uses upsert and review edit/delete paths may lack aligned RLS operations — HIGH.
6. Offline writes can exhaust retries and remain failed without confirmed user notification (`src/data/syncRepository.js:63-91`) — HIGH.
7. Several legacy community, notification, verification, and booking writes lack proven policy match/readback — HIGH.
8. Production EAS variables/secrets and Sentry setup are not verifiable from local files — HIGH.
9. Avatar and offers/events remain local/static rather than remotely persisted — LOW.
10. Guest mode has no account identity and session-expiry behavior during writes is not fully traced — LOW/HIGH respectively.

## 7. Proposed fix order

### A: BLOCKERs
- Connect the Community tab to real feed reads/writes, authentication checks, and result readback; remove fixture content from production.
- Confirm service-role key is absent from client env/config and exists only in server-side secret storage if needed.

### B: Security and RLS
- Inspect effective deployed RLS and grants; add or correct least-privilege policies for profile upsert, review edit/delete, notifications, bookings, verification objects, community writes, and owner operations.
- Verify public read column exposure and check the `app_config` migration deployment status.

### C: LOCAL-ONLY that should be remote
- Decide whether avatars, offers, and events are launch requirements; if yes, add storage/table-backed persistence and readback.
- Keep guest mode local unless product requirements call for anonymous accounts; document the choice.

### D: UNCHECKED needing manual testing
- Verify EAS secret presence, Supabase Auth callbacks, token refresh/session expiry during writes, push registration, Sentry event delivery, and queued write failure UI on supported devices.
- Exercise the app against staging and confirm each write result is reloaded into the screen.

### E: Low impact
- Clarify guest account continuity and optional static offers/events behavior.
- Add visible status for noncritical local preference/avatar failures if those features remain local.
