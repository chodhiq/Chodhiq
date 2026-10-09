# Mela Feed implementation — 2 October 2026

UI implementation in the authoritative ChodhiQ workspace. No Supabase schema,
RLS, migrations, backend functions, or offline sync worker were changed in this
task. Existing backend changes already present in the working tree are separate.

## 1. Theme and typography

- `src/theme/mela.js` defines the specified cream/maroon palettes and saturated
  marigold, teal and red accents. ThemeContext exposes a community-only palette.
- Poppins regular and semibold are loaded by CommunityScreen. Only these two
  weights are bundled. `@expo-google-fonts/poppins` is the only added dependency.
- Space names and section headings use Georgia on iOS/web and system serif on
  Android, the permitted fallback for Fraunces.
- Marigold controls use dark text; inline actions use teal in light mode and
  marigold in dark mode. The header animates its accent border while retaining a
  dark background so its white logo remains readable.

## 2. Post cards

- Discussion, experience, recommendation and complaint types share a teal-edged
  discussion card, including any supplied image.
- The actual `promotion` type maps to the provider-offer card: marigold edge,
  image, SVG ring tracking elapsed offer duration, remaining-time label, and a
  gradual shift toward red during the final hour. Expired/invalid dates are handled.
- A marketplace presentation is implemented for `marketplace`, with an
  image-first layout and FOR SALE chip. This is dormant: the current database
  allows only discussion, experience, recommendation, complaint and promotion.
  No marketplace publishing option or invented database enum was added.
- Marketplace UK mobile/landline numbers become reveal pills. A 200ms fade reveals
  the digits; a Sentry breadcrumb records the action without phone numbers or body
  text. This is display obscuring, not backend privacy or access control.

## 3. Interactions

- Upvotes sweep upwards over 180ms, roll the count and use the existing light haptic.
- The formerly inline composer now uses the existing Gorhom BottomSheetModal
  with spring settings, integrated keyboard inputs, backdrop dismissal, a close
  button and Android back handling. Publish logic and offline worker are preserved.
- Custom animation components honor reduced-motion preferences. Gorhom retains
  its default system reduced-motion handling.
- No community realtime subscription existed. Realtime-only arrival animation
  was deferred rather than introducing a new feed synchronization mechanism.
- Native pull-to-refresh is retained and tinted marigold. A custom flower spinner
  was deferred because RefreshControl does not expose a custom indicator view.

## 4. Spaces

- General is pinned, followed by the signed-in user's active joined spaces.
- The selected icon scales to 115%; accent colors are a stable hash of the slug.
  Header accent transitions take 150ms.
- Existing post queries/pagination are retained, scoped to the selected space
  when the spaces schema is available. Publishing includes that existing space ID.
- General remains available when the spaces table has not been deployed. Missing
  schema never becomes an empty spaces tray. Space selection resets pagination.
- Out-of-order feed responses are ignored. Only General feed results are written
  to the shared legacy community cache, avoiding cross-space cache fallback.

## 5. Empty states

- An SVG opening stall and contextual copy replace the bare empty feed.
- An Active in General strip reads up to three recent published General posts.
  Opening the strip selects General and clears region/category/Nearby filters.
- When General is also empty, the strip invites a first conversation rather than
  presenting synthetic content. Existing loading/error states remain visible.

## 6. Trust and safety controls

- New here uses a 14-day window for the authenticated user's own posts, using the
  creation date already available in their session. Other authors' profiles are
  self/admin-readable under current RLS, so their ages are not queried or inferred.
- Post/comment overflow menus expose safety actions. The existing report handler
  is reused, extended with the existing comment_id field when available. A reason
  picker avoids Android Alert's three-button limitation.
- Block author writes to the existing user-block table after the normal in-app
  confirmation. Own-author block actions are omitted. Block/comment-report controls
  depend on spaces-schema availability; legacy production retains post reporting.

## Verification

- Root typechecks, Prettier formatting, code-quality invariants, accessibility JSX
  invariants, security checks and secret-exposure audit passed.
- All 92 app tests passed, including six new behavior tests for card mapping,
  UK phone segmentation, false matches, countdown boundaries, member-age bounds,
  and deterministic space accents.
- Expo web export passed. No standalone root lint script exists; formatting and
  code-quality checks are the existing source checks.
- SHA-256 comparison confirmed 70 Supabase/offline-worker source files unchanged
  from the source ZIP created before this UI task.
- Browser/device visual verification remains: the available browser inventory was
  empty. No APK build, production deployment or live safety-action mutation was
  performed. Keyboard/sheet behavior, screen readers, haptics and both themes need
  a device check before distribution.

## Deployment dependency

The earlier live check found production at 47/52 migrations, without spaces or the
queued-publication RPC. The UI task itself did not deploy them. Following explicit
user authorization, all five were deployed later on 2 October 2026: production is
now at 52/52 migrations and passed 84 live rollback-only community assertions.
See `COMMUNITY_PRODUCTION_DEPLOYMENT_2026-10-02.md`. The APK still needs a rebuild
to include the UI changes and device verification before distribution.
