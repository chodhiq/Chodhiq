# Opening page, community upload and map fixes - 3 October 2026

Implemented in the authoritative customer app workspace.

- Startup shows a branded loader instead of a blank font-loading screen. Font loading no longer blocks the app indefinitely. Cached marketplace listings appear before refresh completes, and remote directory queries abort after eight seconds.
- Home hero uses one responsive height, with a taller layout to keep text and actions aligned. Narrow phones omit the crowded trust panel. Preloaded image layers crossfade for 1.1 seconds, respecting reduced motion, focus and foreground state.
- Opening account/sign-in/guest routes and home actions were reviewed in source. Gallery, poster upload and camera controls are now touchable actions rather than static views.
- Create post supports gallery selection, camera permission/capture, preview, replacement and removal. One image up to 5 MB matches the existing image_url schema. Images upload into the existing user-scoped provider-media bucket and their public URL is saved on the post. Failed image publication preserves the draft rather than claiming an image has been queued offline. Permanent server rejection is shown rather than queued.
- Personal updates and events no longer require a business profile. Business offers still require an owned profile.
- Themed, accessible dialogs replace native alerts across customer screens and community post actions. Confirmation callbacks remain connected.
- Fixed native map cluster geometry: cluster entries wrap providers, so selected provider IDs and coordinates must be read from their respective fields. Coordinates outside valid bounds are excluded. All matching businesses remain supplied to the map while viewport filtering controls result cards.
- Google Maps is disabled and no key is configured in the local environment. Added Leaflet/OpenStreetMap in Expo-compatible react-native-webview 13.15.0 for native, and an iframe for web. Markers select business cards; viewport messages drive visible results. The existing map layer action switches road/satellite tiles. The map needs an internet connection.
- Removed Explore by region from Community. Other community redesign work is deferred as requested.

Verification:

- npm run verify:release passed: launch config, formatting, quality, accessibility, TypeScript, 104 tests, security and secret audit, and web export.
- Final Android export passed with 4,082 bundled modules.
- git diff --check passed.
- Two map regression tests cover invalid/zero coordinates and safe HTML embedding of business names.
- Browser UI testing could not run: computer-use inventory exposed no browser or native app surfaces. No phone runtime test, live image publication or actual camera capture was performed.

A new APK is required because react-native-webview adds a native dependency. Existing APKs do not include these changes. No new APK was built or deployed in this pass. Environment files and existing workspace changes were preserved.

Satellite service reference: https://doc.arcgis.com/en/data-appliance/latest/imagery-elevation/world-imagery.htm
