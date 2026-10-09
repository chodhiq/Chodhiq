# Performance and motion pass — 3 October 2026

The customer Expo app retains its existing colors, typography, layouts, navigation structure, APIs and workflows. No animation or image dependencies were added. Chrome was not used.

## Changes

- Shared timings: first screen entrance 520 ms/18 px, native viewport section reveal 720 ms/16 px, press feedback 0.98 scale with 120/160 ms timing, tab feedback 220 ms, subsequent tab content transition 320 ms. Native stack fade requests 320 ms; actual Android stack timing is controlled by the native navigator.
- Existing section wrappers inside the supported vertical scroll views reveal once when visible using Reanimated UI-thread measurements. Scrolling retains native inertia. Horizontal lists and scroll views with an existing scroll callback retain their existing implementation. Web uses mount fades. Feed rows do not stagger.
- Existing hero/editorial backgrounds reveal after loading with an 850 ms opacity/1.04-to-1 scale transition; overlays remain stationary. A bounded 512-image history skips repeated reveals. Existing image sources and geometry remain intact. Thumbnail decoding uses Android's resize hint. Native image caching is retained; no new persistent cache is claimed.
- Community rows are memoized with stable callbacks, per-post engagement and memoized provider lookup. Composer edits no longer invalidate every card's props. Like, save, reporting, blocking, comments and navigation handlers remain the existing handlers.
- Marketplace skeleton bones share one pulse instead of independent loops. Existing foreground/focus and reduced-motion guards remain. Reduced-motion users receive immediate content without entrance, image or press movement.
- Removed stray whitespace string children in community list header/footer fragments, which could cause React Native raw-text errors.

Parallax and blur were omitted to preserve image framing and avoid extra compositing cost. Existing bottom sheets retain their native spring/gesture implementation.

## Verification

Results are recorded in `outputs/motion-release-verification.log` and `outputs/motion-platform-verification.log`. The release checks include configuration, formatting, code quality, accessibility invariants, TypeScript, unit/behavior tests, secret/security checks and web export. The platform export compiles Android and iOS Hermes bundles plus web.

These checks do not measure device frame rate or prove visual alignment on phones. Physical Android/iOS testing remains necessary: long feed scroll, switching tabs, opening sheets, cold/cached/failed image loads, reduced-motion changes, foreground/background transitions, narrow/wide displays and repeated navigation. No measured 60 fps claim is made.

This is a source change. The previously delivered version 19 APK does not include this pass; a new APK must be built before testing these changes on a phone.

Final result: all release checks passed, 100/100 tests passed, Android/iOS Hermes and web exports completed successfully, and the source diff whitespace check passed.
