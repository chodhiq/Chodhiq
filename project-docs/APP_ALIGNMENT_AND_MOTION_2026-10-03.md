# Customer app alignment, rendering and motion — 3 October 2026

This pass covers the Expo customer app, including shared controls used by its tab, detail, account, onboarding, discovery and form screens. It does not change backend behavior or either web dashboard.

## Alignment

- Shared screen headers reserve equal left/right space, including the Notifications action, so their titles remain centered. Titles/subtitles wrap and back buttons have a 44px target.
- Removed duplicate top safe-area padding on screens where ScreenHeader already supplies it.
- Category-grid columns account for actual window width, side insets, gutters and gaps, with a centered tablet-width cap.
- Saved tabs have a bounded horizontal scroll area inside the same gutters as the heading/list. They no longer use a full-width content container plus outside margins or consume the remaining vertical space.
- Community content has a centered width cap. Feed filters can wrap below their tabs on narrow screens, with a stable selected-state border width.
- Region tiles have consistent icon/label slots and a stable border width; this includes the previous alignment fix that was absent from version 19.
- Provider names/badges and metadata wrap; profile/account/privacy text columns can shrink. Provider action tiles grow with text rather than enforce a fixed height.
- Shared text removes Android font-padding offsets. Inputs align single lines centrally and multiline content at the top, preserving caller style overrides.
- PressableScale now applies the existing layout directly to the touchable rather than a separate outer view with an unstyled inner touchable. This also fixes alignment of CategoryIconTile's icon and label and makes the styled surface the real touch target.

## Rendering

- Search uses one vertical FlatList with header/empty content instead of a non-scrolling FlatList nested inside a vertical ScrollView. Its stable row renderer avoids invalidating unchanged rows on each raw-query update.
- Community and Saved use virtualized vertical lists rather than mount-all maps. Initial batches are 5, 8 and 6 rows respectively for Community, Saved and Search; a seven-viewport window supports variable-height rows. Clipping is disabled to preserve scaled buttons/shadows. No incorrect fixed-height getItemLayout was added.
- Search and Map defer result filtering while their inputs update immediately. Saved IDs use Set membership; saved providers are memoized.
- Poppins is loaded alongside Inter before navigation, avoiding a separate Community font-loading screen and first-visit font shift. This trades a small additional startup font load for stable first navigation.
- Navigation theme objects are memoized.
- One shared native accessibility/AppState subscription pair replaces per-control motion subscriptions.
- Decorative animation loops, skeleton pulses, offer timers and the Home carousel pause on hidden screens/background. The carousel also stops auto-advancing with reduced motion enabled.

## Motion

- Shared buttons and cards use a short UI-thread press/release scale, preserving existing transforms, callbacks, refs and disabled behavior.
- All six tabs use a subtle 180ms fade/6px entrance. Detail/form routes retain native-stack transitions.
- Existing section fades are shortened to 220ms. Modal transitions and tab/native-stack animations honor reduced motion, alongside existing Community interactions.
- Animation cleanup cancels running values; disabled/reduced-motion controls reset to normal scale.

## Verification and limits

Four behavioral tests cover shared listener lifetime across 100 consumers, foreground changes, stale preference reads and teardown. Final `npm run verify:release` passed: launch configuration, formatting, quality, accessibility, typecheck, all 96 tests, security and web export. Android Hermes export also passed. Reduced-motion-only controls observe a boolean snapshot so app foreground changes do not invalidate every button.

These are code-level improvements. No phone FPS, dropped-frame, memory or startup-time benchmark has been measured, and no pixel-perfect claim is made. Fresh screenshots at 320/390/430px, large-font tests, keyboard interaction and device scrolling still need runtime verification. Chrome was not used. The earlier multi-space screenshot requirement remains open.

Version 19 predates this pass. No new signed APK or OTA update has been published for these changes.
