# ChodhiQ app screen map

## Summary

- **Phase 1 inventory / Phase 2 entries:** 44
- **Design status:** NEW glow UI 3 · OLD UI 13 · MIXED 28
- Design labels are source-based: NEW means the new glow component set is predominant; OLD means the legacy layout is predominant; MIXED means both visual systems are used. The repository does not label screens by design generation.

| # | Screen | Group | Who sees it | Design |
|---:|---|---|---|---|
| 1 | Opening | Onboarding and Auth | guest | OLD UI |
| 2 | Main tabs container | Main tabs | all | MIXED |
| 3 | Home | Main tabs | all | MIXED |
| 4 | Explore | Business and discovery | all | MIXED |
| 5 | Map | Business and discovery | all | MIXED |
| 6 | Community feed | Main tabs | all | NEW glow UI |
| 7 | Saved | Main tabs | all | MIXED |
| 8 | Profile | Account | all | MIXED |
| 9 | Provider detail | Business and discovery | all | MIXED |
| 10 | Welcome / sign in / sign up | Onboarding and Auth | guest | MIXED |
| 11 | Email confirmation | Onboarding and Auth | guest | OLD UI |
| 12 | Reset password | Onboarding and Auth | guest | MIXED |
| 13 | Location | Account | all | MIXED |
| 14 | Notifications | Account | signed-in | MIXED |
| 15 | Quote requests | Account | signed-in | OLD UI |
| 16 | Bookings | Account | signed-in | OLD UI |
| 17 | Reviews | Account | signed-in | OLD UI |
| 18 | Edit profile | Account | signed-in | MIXED |
| 19 | Settings | Account | all | MIXED |
| 20 | Privacy | Account | signed-in | OLD UI |
| 21 | Help | Account | all | OLD UI |
| 22 | Become a provider | Business owner | signed-in | MIXED |
| 23 | Claim listing | Business owner | signed-in / prospective owner | MIXED |
| 24 | Categories | Business and discovery | all | OLD UI |
| 25 | Create post | Community | signed-in | MIXED |
| 26 | Community | Community | all | MIXED |
| 27 | Community profile | Community | all | MIXED |
| 28 | Offers | Business and discovery | all | OLD UI |
| 29 | Events | Business and discovery | all | OLD UI |
| 30 | Dev UI gallery | Dev-only | development builds | NEW glow UI |
| 31 | Subscription plans | Business owner | business owner | OLD UI |
| 32 | App dialog | Modals and sheets | all | MIXED |
| 33 | Community post composer | Modals and sheets | signed-in | MIXED |
| 34 | Community category chooser | Modals and sheets | all | MIXED |
| 35 | Community report post | Modals and sheets | signed-in | MIXED |
| 36 | Community comments | Modals and sheets | all; sign-in for writes | MIXED |
| 37 | Feed-card comments | Modals and sheets | all; sign-in for writes | NEW glow UI |
| 38 | Provider photo viewer | Modals and sheets | all | MIXED |
| 39 | Request a quote | Modals and sheets | signed-in | MIXED |
| 40 | Report provider information | Modals and sheets | signed-in | MIXED |
| 41 | Request a booking | Modals and sheets | signed-in | MIXED |
| 42 | Font startup loading | Onboarding and Auth | all | OLD UI |
| 43 | Auth bootstrap loading | Onboarding and Auth | all | OLD UI |
| 44 | App error fallback | Onboarding and Auth | all | MIXED |

### Navigation tree

```text
App
├─ font startup loading → RootNavigator
├─ app error fallback (on uncaught render error)
└─ RootNavigator
   ├─ auth bootstrap loading (until authReady)
   └─ Stack
      ├─ Opening (guest default)
      │  └─ Welcome → EmailConfirmation / ResetPassword
      ├─ MainTabs (signed-in or completed onboarding)
      │  ├─ Home → Explore, Location, Notifications, Categories, ProviderDetail, Community
      │  ├─ Explore → ProviderDetail, Events
      │  ├─ MapTab → ProviderDetail, Explore
      │  ├─ CommunityTab (CommunityFeedScreen) → Welcome when a guest tries to post
      │  ├─ Saved → ProviderDetail, CommunityProfile, CommunityTab
      │  └─ Profile → Welcome, EditProfile, Saved, Reviews, Bookings, ClaimListing
      ├─ ProviderDetail → quote / booking / report / photo overlays; Map; Welcome
      ├─ Community → composer / category / report / comments overlays; CommunityProfile; ProviderDetail
      ├─ Account routes: Location, Notifications, QuoteRequests, Bookings, Reviews,
      │  EditProfile, Settings, Privacy, Help
      ├─ Business routes: BecomeProvider, ClaimListing, Categories, CreatePost
      ├─ Discovery routes: Offers, Events, Map
      └─ DevUIGallery (only when __DEV__)
```

### Data map

| Database table / API / local source | Screens that use it |
|---|---|
| Supabase Auth (`getSession`, sign-in/up, reset/update password, callback exchange) | 10–12, 23, 25–27, 39–41 |
| `providers`, `categories`, `reviews`, `review_replies`, `services`, `provider_hours`; RPC `public_provider_coordinates` | 3–5, 9, 24, 28–29, 31, 39–41 |
| `saved_items` and local saved/account cache | 3–5, 7–9, 14–19 |
| `notifications` | 14, 19 |
| `quote_requests` | 9, 15, 19, 39 |
| `bookings`; RPC `get_confirmed_booking_slots` | 9, 16, 41 |
| `profiles` | 10, 14, 18–20, 26–27 |
| `community_posts`, `community_spaces`, `community_memberships`, `community_post_likes`, `community_saved_posts`, `community_comments`, `community_post_reports`, `community_user_blocks`; RPCs `community_post_engagement_for_posts`, `get_community_member_profile`, `publish_queued_community_post` | 6–7, 25–27, 33–37 |
| `verification_requests`, `verification_documents`; RPCs `list_claimable_providers`, `claim_imported_provider`, `submit_provider_verification`; storage bucket `verification-documents` | 22–23 |
| Edge Function `create-checkout-session` | 31 (unrouted component) |
| Edge Functions `delete-account`, account export queries | 20 |
| Edge Function `uk-address-suggestions`; local device location / postcode lookup | 13 |
| RPCs `list_active_ad_campaigns`, `record_ad_campaign_event`; feature-gated offer data | 3 |
| Static discovery data (`discoveryData`) | 28–29 |
| AsyncStorage onboarding flag, location, avatar, theme; local database/cache and pending sync queue | 1, 3–9, 13–20, 23, 25–27 |
| In-memory props/state only; no direct persistence/API in the surface | 2, 30, 32, 34, 37–38, 42–44 |
| Actual per-screen visit/analytics counts | **not found** |

## Screen and page entries

### Onboarding and Auth

### 1. Opening
- File / navigator: `src/screens/OpeningScreen.js`, Stack `Opening`
- What it is: Guest-facing three-step introduction and entry point to account creation or sign-in.
- Who sees it: guest
- What's on it: branded hero and introduction → three-page progress/content → sign-up and sign-in actions
- Data idea: reads/writes local `chodhiq-onboarding-complete` AsyncStorage flag; no remote reads; page index is local state; no data loading/error state found
- Design: OLD UI

### 10. Welcome / sign in / sign up
- File / navigator: `src/screens/AccountScreens.js`, Stack `Welcome`
- What it is: Shared email/password sign-in, account creation, guest continuation, and password-reset request form.
- Who sees it: guest
- What's on it: brand/hero → sign-in or sign-up fields → consent and auth feedback → guest/social actions
- Data idea: Supabase Auth sign-in/up, resend-confirmation and reset-email APIs; writes account/profile through auth flow; local form/busy state; inline auth errors and confirmation-pending message
- Design: MIXED

### 11. Email confirmation
- File / navigator: `src/screens/EmailConfirmationScreen.js`, Stack `EmailConfirmation`
- What it is: Exchanges an auth callback and reports whether email confirmation/sign-in completed.
- Who sees it: guest
- What's on it: brand mark → progress indicator and status message → continue/back-to-sign-in action
- Data idea: reads callback params; Supabase Auth callback/session exchange; local progress/message state; completion/error message shown
- Design: OLD UI

### 12. Reset password
- File / navigator: `src/screens/AccountScreens.js`, Stack `ResetPassword`
- What it is: Validates a recovery link and accepts a replacement password.
- Who sees it: guest
- What's on it: title/instructions → recovery-link progress or error → new-password and confirmation fields → update action
- Data idea: Supabase Auth recovery preparation and `updateUser`; local form/busy state; invalid-link and update errors are rendered
- Design: MIXED

### 42. Font startup loading
- File / navigator: `App.js`, full-page state before app providers/navigation
- What it is: Brief startup splash while Inter/Poppins fonts load, with a 2.5-second wait limit.
- Who sees it: all
- What's on it: centered ChodhiQ logo → activity indicator
- Data idea: reads font-loading result and local timeout state only; no table/API; font error or timeout allows app startup rather than showing a separate error
- Design: OLD UI

### 43. Auth bootstrap loading
- File / navigator: `src/navigation/RootNavigator.js`, full-page state while `authReady` is false
- What it is: Blocks route selection until authentication state is ready.
- Who sees it: all
- What's on it: centered activity indicator → “Getting things ready…” text
- Data idea: reads `session`, `authReady`, and onboarding completion from app state; no direct table/API in this view; no separate loading error state found
- Design: OLD UI

### 44. App error fallback
- File / navigator: `App.js`, Sentry error-boundary full-page fallback
- What it is: Recovery screen shown after an uncaught render error.
- Who sees it: all
- What's on it: error heading → recovery instructions → development-only stack/message → retry button
- Data idea: receives the error and Sentry boundary reset callback; no table/API; development builds expose stack text, production hides it
- Design: MIXED

### Main tabs

### 2. Main tabs container
- File / navigator: `src/navigation/RootNavigator.js`, Stack `MainTabs` containing the Tab navigator
- What it is: Hosts the six primary destinations and the custom glass tab bar.
- Who sees it: all
- What's on it: Home → Explore → MapTab → CommunityTab → Saved → Profile tab navigation
- Data idea: navigation state and tab props only; no direct data reads/writes or data empty/loading/error state
- Design: MIXED

### 3. Home
- File / navigator: `src/screens/HomeScreen.js`, Tab `Home`
- What it is: Main marketplace landing page with provider discovery and shortcuts.
- Who sees it: all
- What's on it: header/location/search → hero and featured categories → provider/offer/event/community sections → map and quick actions
- Data idea: app-state providers/categories/saved/location; ad-campaign RPCs; writes saved items and location; marketplace skeleton/cache and permission/API errors
- Design: MIXED (provider cards use the shared NEW glow UI; remaining Home UI retains its existing styling)

### 6. Community feed
- File / navigator: `screens/CommunityFeedScreen.tsx`, Tab `CommunityTab`
- What it is: New glow-styled community feed with a post composer and feed-card interactions.
- Who sees it: all
- What's on it: community header/actions → composer → tabs/filter controls → post cards and empty feed
- Data idea: seeded `initialPosts` and component state; composer updates local feed; no database/API read found; refresh state and empty feed are present
- Design: NEW glow UI

### 7. Saved
- File / navigator: `src/screens/SavedScreen.js`, Tab `Saved`
- What it is: Displays saved businesses and saved community posts.
- Who sees it: all
- What's on it: screen header → saved-business list → saved-post list → empty/error feedback
- Data idea: reads `saved_items`, `community_saved_posts`, `community_posts`, and author profile RPC; writes/removes saved posts and saved businesses; loading/empty/error states
- Design: MIXED (saved business cards use the shared NEW glow UI; remaining Saved UI retains its existing styling)

### 8. Profile
- File / navigator: `src/screens/ProfileScreen.js`, Tab `Profile`
- What it is: Account hub for the signed-in user and guest entry to account flows.
- Who sees it: all
- What's on it: profile identity → account/business summary → edit, saved, reviews, bookings, settings and claim actions
- Data idea: app-state profile/session/access/provider data; navigates to account routes; local expanded-section state; guest sign-in prompt and empty profile state
- Design: MIXED

### Business and discovery

### 4. Explore
- File / navigator: `src/screens/ExploreScreen.js`, Tab `Explore`
- What it is: Searchable and filterable directory of local providers.
- Who sees it: all
- What's on it: search and filters → category/city/sort controls → provider cards → empty/loading/error views
- Data idea: app-state providers/categories/reviews/location and saved IDs; writes saved items; cached marketplace loading, directory-unavailable, and no-results states
- Design: MIXED (provider cards use the shared NEW glow UI; remaining Explore UI retains its existing styling)

### 5. Map
- File / navigator: `src/screens/DiscoveryScreens.js`, Tab `MapTab` and Stack `Map` (same `MapScreen` component)
- What it is: Map and nearby-card discovery for providers with coordinates.
- Who sees it: all
- What's on it: search/filter/layer controls → map markers → selected provider card → nearby list and empty states
- Data idea: `providers`, `categories`, RPC `public_provider_coordinates`, current location and saved IDs; writes location and saved items; location permission/errors and no-coordinate/no-provider states
- Design: MIXED (selected and nearby cards use the shared NEW glow UI; map surfaces retain their existing styling)

### 9. Provider detail
- File / navigator: `src/screens/ProviderDetailScreen.js`, Stack `ProviderDetail`
- What it is: Provider profile and contact, review, quote, booking, and reporting actions.
- Who sees it: all
- What's on it: provider hero/identity → action row → about/services/hours/map/photos → review section → quote/booking actions
- Data idea: marketplace providers/categories/services/provider_hours/reviews/review_replies and coordinates; writes reviews, quote requests, bookings, provider reports and saved items; loading, missing-provider, no-review and request errors
- Design: MIXED

### 24. Categories
- File / navigator: `src/screens/MarketplaceScreens.js`, Stack `Categories`
- What it is: Category directory that opens Explore with the chosen category selected.
- Who sees it: all
- What's on it: page header → two-column category cards
- Data idea: reads app-state `categories`; navigation carries category ID; no independent loading/error or write state found; empty categories render no cards
- Design: OLD UI

### 28. Offers
- File / navigator: `src/screens/DiscoveryScreens.js`, Stack `Offers`
- What it is: Displays community promotions when the custom-ad feature is enabled.
- Who sees it: all
- What's on it: page header → offer cards or launch-period availability message
- Data idea: reads static `offers` from discovery data and feature flag; no writes/API; feature-off message is the empty/disabled state
- Design: OLD UI

### 29. Events
- File / navigator: `src/screens/DiscoveryScreens.js`, Stack `Events`
- What it is: Lists cultural, community, and business events and opens their map search.
- Who sees it: all
- What's on it: page header → event cards → external Maps action
- Data idea: reads static `events` from discovery data; opens Google Maps URL; no table/API writes or loading/error state found
- Design: OLD UI

### 31. Subscription plans
- File / navigator: `src/screens/MarketplaceScreens.js`, no Tab/Stack route found (orphan screen component)
- What it is: Describes provider subscription tiers and initiates checkout when payments are enabled.
- Who sees it: business owner
- What's on it: page header → launch-period notice → plan cards/features → choose-plan actions
- Data idea: reads session and owned providers; Edge Function `create-checkout-session`; local busy state; login/verification/checkout errors and feature-disabled status
- Design: OLD UI

### Community

### 25. Create post
- File / navigator: `src/screens/MarketplaceScreens.js`, Stack `CreatePost`
- What it is: Full-page form for a community post with optional image and provider association.
- Who sees it: signed-in
- What's on it: post type/title/body fields → provider and image selection → publish action
- Data idea: writes `community_posts` or local pending post via local database/sync queue; optional image picker/upload; local publishing state, validation errors and sync failure handling
- Design: MIXED

### 26. Community
- File / navigator: `src/screens/CommunityScreen.js`, Stack `Community`
- What it is: Legacy Mela community hub with spaces, feed, moderation and post interactions.
- Who sees it: all
- What's on it: Mela header/space tray → feed tabs and category filters → post list → composer, report, and comments overlays
- Data idea: reads/writes `community_spaces`, `community_memberships`, `community_posts`, likes, saved posts, comments, reports and blocks; uses engagement/profile RPCs and local sync; loading/retry/empty/error states
- Design: MIXED

### 27. Community profile
- File / navigator: `src/screens/CommunityProfileScreen.js`, Stack `CommunityProfile`
- What it is: Shows a community member identity and their community posts.
- Who sees it: all
- What's on it: header → member profile card → post list → pagination or empty/error feedback
- Data idea: RPC `get_community_member_profile` and `community_posts`; local page/loading/error state; retry and load-more behavior
- Design: MIXED

### Account

### 13. Location
- File / navigator: `src/screens/AccountScreens.js`, Stack `Location`
- What it is: Lets a user select or detect the marketplace location.
- Who sees it: all
- What's on it: current location → search/postcode suggestions → detected-location action → city choices
- Data idea: reads/writes app-state location and local coordinates; Edge Function `uk-address-suggestions` and device location; local suggestion/loading state and permission/network errors
- Design: MIXED

### 14. Notifications
- File / navigator: `src/screens/AccountScreens.js`, Stack `Notifications`
- What it is: Lists unread activity and can mark all notifications read.
- Who sees it: signed-in
- What's on it: activity summary/count → unread notification cards → open related community post
- Data idea: reads `notifications`; writes read state through `markAllNotificationsRead`; local clearing state; explicit empty “all caught up” state and clear failure alert
- Design: MIXED

### 15. Quote requests
- File / navigator: `src/screens/AccountScreens.js`, Stack `QuoteRequests`
- What it is: Tracks provider quote requests and any provider responses.
- Who sees it: signed-in
- What's on it: page header → delivery caveat → quote cards/status or find-a-business empty action
- Data idea: reads `quote_requests` from app account state/local fallback; links to provider detail; empty-state CTA; no separate loading/error UI found
- Design: OLD UI

### 16. Bookings
- File / navigator: `src/screens/AccountScreens.js`, Stack `Bookings`
- What it is: Separates requested/confirmed appointments into upcoming and past lists.
- Who sees it: signed-in
- What's on it: page header → Upcoming/Past tabs → booking cards/status → cancellation confirmation
- Data idea: reads `bookings`; writes cancellation; local tab/filter state; empty tab/list state and cancellation error alert
- Design: OLD UI

### 17. Reviews
- File / navigator: `src/screens/AccountScreens.js`, Stack `Reviews`
- What it is: Lets a user view and manage their provider reviews.
- Who sees it: signed-in
- What's on it: page header → review/provider cards → rating/comment form → edit/delete actions
- Data idea: reads `reviews` and providers; writes create/update/delete review operations; local draft/rating/edit state; empty list and operation error alerts
- Design: OLD UI

### 18. Edit profile
- File / navigator: `src/screens/AccountScreens.js`, Stack `EditProfile`
- What it is: Edits the account name and phone number.
- Who sees it: signed-in
- What's on it: page header → name/phone fields → account email card → save action
- Data idea: reads/writes `profiles` through app state/account repository with local profile fallback; local draft state; no explicit loading/error screen found
- Design: MIXED

### 19. Settings
- File / navigator: `src/screens/AccountScreens.js`, Stack `Settings`
- What it is: Controls communication preferences and links to privacy/help.
- Who sees it: all
- What's on it: appearance status → notification/email/marketing switches → permission recovery → Privacy and Help links
- Data idea: reads/writes local preferences and notification permission state; no database table/API found in this screen; permission-query failure is silently ignored by source
- Design: MIXED

### 20. Privacy
- File / navigator: `src/screens/PrivacyScreen.js`, Stack `Privacy`
- What it is: Provides account-data export and account deletion controls.
- Who sees it: signed-in
- What's on it: page header → data export and consent information → deletion confirmation/details → destructive action
- Data idea: exports user rows from profiles, saved items, quotes, bookings, reviews, notifications, verification/business and community tables; Edge Function `delete-account`; local busy/confirmation state and explicit operation errors
- Design: OLD UI

### 21. Help
- File / navigator: `src/screens/AccountScreens.js`, Stack `Help`
- What it is: Shows help/support information and available contact links.
- Who sees it: all
- What's on it: page header → support/information cards → contact or legal links
- Data idea: static config/legal links; no table/API writes or loading state found; link-open errors handled by external-link helper
- Design: OLD UI

### Business owner

### 22. Become a provider
- File / navigator: `src/screens/AccountScreens.js`, Stack `BecomeProvider`
- What it is: Explains provider onboarding and links into listing claim/creation.
- Who sees it: signed-in
- What's on it: provider benefits/instructions → continue/claim action
- Data idea: no data read/write in the page itself found; next navigation opens ClaimListing; no loading/error state found
- Design: MIXED

### 23. Claim listing
- File / navigator: `src/screens/ClaimListingScreen.js`, Stack `ClaimListing`
- What it is: Finds an existing business listing or creates a new owner claim and verification request.
- Who sees it: signed-in / prospective owner
- What's on it: claim/create mode → business search and category/location form → ownership details/document upload → submit/status
- Data idea: reads providers/categories; RPCs `list_claimable_providers`, `claim_imported_provider`, `submit_provider_verification`; writes providers, verification requests/documents and storage bucket `verification-documents`; loading, validation and error states
- Design: MIXED

### Modals and sheets

### 32. App dialog
- File / navigator: `src/components/AppDialog.js`, app-wide modal via `AppDialogProvider`
- What it is: Shared alert/confirmation dialog used by screens and actions.
- Who sees it: all
- What's on it: dimmed backdrop → dialog title/message → available confirm/cancel buttons
- Data idea: reads/writes in-memory dialog options and callbacks only; no table/API; visibility is state-driven, with dismiss/cancel handling
- Design: MIXED

### 33. Community post composer
- File / navigator: `src/screens/CommunityScreen.js`, modal on Stack `Community`
- What it is: Creates or edits a community post without leaving the feed.
- Who sees it: signed-in
- What's on it: title/body/category → optional image and provider association → publish/edit controls
- Data idea: writes `community_posts` and image storage, with queued local publication where applicable; local draft/publishing state; validation/upload/post errors and busy state
- Design: MIXED

### 34. Community category chooser
- File / navigator: `src/screens/CommunityScreen.js`, modal on Stack `Community`
- What it is: Filters the community feed by post category.
- Who sees it: all
- What's on it: category choices → selected-category indicator → dismiss action
- Data idea: reads/writes local `categoryFilter` state only; no table/API; closes on choice or backdrop
- Design: MIXED

### 35. Community report post
- File / navigator: `src/screens/CommunityScreen.js`, modal on Stack `Community`
- What it is: Submits a report for a community post.
- Who sees it: signed-in
- What's on it: report target/content context → report reason/details → submit/cancel
- Data idea: writes `community_post_reports`; local selected target and submit state; validation/submit errors use app alerts
- Design: MIXED

### 36. Community comments
- File / navigator: `src/screens/CommunityScreen.js`, slide-up modal on Stack `Community`
- What it is: Displays and adds comments for a selected community post.
- Who sees it: all; sign-in for writes
- What's on it: selected post context → comment list/loading/empty state → comment input and send action
- Data idea: reads/writes `community_comments`; relies on community post/account state; loading indicator, empty comments and send errors
- Design: MIXED

### 37. Feed-card comments
- File / navigator: `components/PostCard.tsx`, modal used by `CommunityFeedScreen`
- What it is: Opens the new-glow feed card’s comment composer/list surface.
- Who sees it: all; sign-in for writes
- What's on it: modal backdrop → comment content → draft input and submit controls
- Data idea: reads post/comment props and local draft/open state; persistence callback/API is not found in this component
- Design: NEW glow UI

### 38. Provider photo viewer
- File / navigator: `src/screens/ProviderDetailScreen.js`, modal on Stack `ProviderDetail`
- What it is: Enlarges a provider gallery image and supports photo navigation.
- Who sees it: all
- What's on it: full-screen selected image → previous/next controls → close action
- Data idea: reads provider gallery props and local selected-photo index only; no table/API; no image/error fallback state found
- Design: MIXED

### 39. Request a quote
- File / navigator: `src/screens/ProviderDetailScreen.js`, Gorhom bottom sheet on Stack `ProviderDetail`
- What it is: Captures a quote message and opens a WhatsApp conversation.
- Who sees it: signed-in
- What's on it: “Request a Quote” heading/instructions → message field → send action
- Data idea: writes `quote_requests` and launches WhatsApp; local message/submission state; auth/network/send errors surface via app alert
- Design: MIXED

### 40. Report provider information
- File / navigator: `src/screens/ProviderDetailScreen.js`, modal on Stack `ProviderDetail`
- What it is: Collects a report about incorrect provider information.
- Who sees it: signed-in
- What's on it: report heading → reason/details fields → submit/cancel actions
- Data idea: writes `provider_reports`; local reason/details/submit state; validation and API errors shown
- Design: MIXED

### 41. Request a booking
- File / navigator: `src/screens/ProviderDetailScreen.js`, modal on Stack `ProviderDetail`
- What it is: Requests an appointment with a provider for a selected service/date/time.
- Who sees it: signed-in
- What's on it: service/date/time fields → availability feedback → booking request action
- Data idea: reads confirmed slots via `get_confirmed_booking_slots`; writes `bookings`; local form/date-picker state; validation, availability and submit errors shown
- Design: MIXED

### Dev-only

### 30. Dev UI gallery
- File / navigator: `screens/DevUIGallery.tsx`, conditional Stack `DevUIGallery` (`__DEV__` only)
- What it is: Development showcase for glow buttons, cards, chips, and background variants.
- Who sees it: development builds
- What's on it: background selector → button variants/statuses → input and chip examples → glow-card examples
- Data idea: local input/background state only; no table/API or loading/error state
- Design: NEW glow UI

## Phase 4: verification and exceptions

- **Count check:** 44 numbered Phase 2 entries; equals the 44-item merged Phase 1 inventory.
- **Broken routes:** none found. All 25 Stack entries and six Tab entries resolve to registered components; `ResetPassword` is exported from `src/screens/AccountScreens.js`, not a missing `ResetPasswordScreen.js` file.
- **Orphan screen component:** `SubscriptionPlansScreen` is exported from `src/screens/MarketplaceScreens.js` but no Tab/Stack route or literal navigation call references it. Its containing file is not wholly orphaned because `CategoriesScreen` and `CreatePostScreen` are routed.
- **Duplicate route/component:** `MapTab` and `Map` both render the same `MapScreen` component from `src/screens/DiscoveryScreens.js`. They are two navigator names for one screen implementation.
- **Related parallel surfaces:** `CommunityTab` uses `CommunityFeedScreen.tsx`, while Stack `Community` uses `src/screens/CommunityScreen.js`; both are community feeds with different data/UI paths, not identical component reuse.
- **Visit frequency:** actual visit counts/analytics were not found in the repository. Consequently, a true highest-to-lowest ranking is not available. The OLD UI list below is ordered by navigation exposure/reachability, not asserted traffic.
- **OLD UI screens, by available navigation-exposure proxy:** Opening (#1), Email confirmation (#11), Quote requests (#15), Bookings (#16), Reviews (#17), Privacy (#20), Help (#21), Categories (#24), Offers (#28), Events (#29), Subscription plans (#31, unrouted), Font startup loading (#42), Auth bootstrap loading (#43).
- **Other route-name gaps:** none found in the literal navigation contract tests or navigator/component imports. No Expo Router `app` directory exists at the workspace root.
