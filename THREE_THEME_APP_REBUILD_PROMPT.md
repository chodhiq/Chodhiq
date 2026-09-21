# ChodhiQ — Complete Three-Theme App UI Rebuild Prompt

## Objective

Completely rebuild the ChodhiQ mobile app UI using the attached three-design reference as the single visual direction. Apply the design consistently across every customer, community, creator, business, admin, onboarding, account and utility screen.

This is a structural and visual rebuild, not a superficial colour replacement. Remove legacy layouts, old green styling, outdated cards, inconsistent spacing and disconnected screen-specific designs. Preserve existing navigation, backend integrations and working business logic unless a change is required to support the new interface.

Do not generate or permanently choose photographic artwork during this task. Where an image is required, create a properly sized, clearly named placeholder and retain the complete layout around it. Final images will be supplied later.

## Three theme modes

Build one shared component system supporting three genuinely distinct visual modes. The screen hierarchy, features and content remain consistent, while surfaces, atmosphere and ornamental treatment change by theme.

### 1. System — Matte Black

A glossy/matte-black luxury interface inspired by the first reference.

- Main background: `#050706`
- Elevated surface: `#0D100F`
- Secondary surface: `#141715`
- Primary text: `#F7F3EA`
- Secondary text: `#A9AAA4`
- Gold accent: `#D9A52E`
- Dark gold: `#9A6B12`
- Border: `rgba(217,165,46,0.25)`
- Success/status accent: use muted violet or gold—not green
- Cards use controlled black-on-black contrast, thin gold borders and restrained shadows
- Add subtle premium ornamental line art only in hero/header areas
- Avoid large flat grey blocks and avoid bright neon effects

### 2. Light — Premium

A fresh, modern ivory-and-gold interface inspired by the middle reference.

- Main background: `#F8F1E5`
- Elevated surface: `#FFFFFF`
- Secondary surface: `#F2E8D8`
- Primary text: `#101A2D`
- Secondary text: `#687082`
- Gold accent: `#C9921D`
- Violet accent: `#7258C8`
- Coral accent: `#D95D75`
- Blue accent: `#4384BE`
- Border: `#E8DDCB`
- Use soft shadows, generous whitespace and warm ivory gradients
- Decorative skyline/leaf/mandala artwork may appear only in controlled hero areas
- Do not reintroduce emerald or green-led branding

### 3. Dark — Midnight

A deep navy luxury interface with gold accents inspired by the third reference.

- Main background: `#031426`
- Elevated surface: `#09213A`
- Secondary surface: `#071B30`
- Primary text: `#F7F3EA`
- Secondary text: `#A8B2C1`
- Gold accent: `#E1AD35`
- Violet accent: `#9B88EB`
- Blue accent: `#4E9DD8`
- Border: `#173A5D`
- Use deep layered navy surfaces rather than pure black
- Gold is reserved for selected navigation, primary actions, ratings and premium highlights
- Use subtle blue edge light and low-opacity ornamental artwork
- Do not use green for open, verified, available or success states

## Theme behaviour

- Support `system`, `light` and `dark` as the only user-selectable modes.
- `system` must resolve to the matte-black design requested here, not simply mirror the operating-system colour scheme.
- Theme selection belongs in Settings as one compact segmented control or selection sheet.
- Do not show theme preview cards on the main Profile screen.
- Persist selection locally and restore it before the first meaningful paint.
- All screens, modals, sheets, alerts, skeletons and navigation bars must consume shared semantic tokens.
- Never hard-code a legacy green colour inside a screen component.

## Shared design system

Create reusable semantic tokens for:

- `background`
- `surface`
- `surfaceElevated`
- `surfaceMuted`
- `textPrimary`
- `textSecondary`
- `textMuted`
- `primaryAction`
- `primaryActionText`
- `gold`
- `violet`
- `coral`
- `blue`
- `border`
- `divider`
- `danger`
- `statusPositive` using violet/gold instead of green
- `overlay`
- `skeleton`

Use a consistent spacing scale of 4, 8, 12, 16, 20, 24 and 32. Use rounded corners consistently:

- Small controls: 10–12px
- Inputs and compact cards: 14–16px
- Content cards: 18–22px
- Hero panels: 24–30px
- Pills: fully rounded

Typography must have clear hierarchy:

- Screen title: 26–30px, bold
- Hero headline: 28–36px, extra bold
- Section title: 17–20px, bold
- Card title: 14–16px, bold
- Body: 13–15px
- Metadata: 10–12px

Use one icon family consistently. Keep icons outlined by default and filled only for active navigation, saved state or intentional emphasis.

## Global screen structure

Every primary screen should follow this order where appropriate:

1. Safe-area header
2. Location/account/notification controls
3. Screen introduction or hero area
4. Search and filter controls
5. Primary discovery/category controls
6. High-priority content
7. Supporting content and calls to action
8. Shared bottom navigation

Use skeleton states before showing image cards. Provide polished empty, error, offline and signed-out states. All visible buttons must perform a real navigation or action.

## Image placeholder rules

Do not insert unrelated stock imagery. Create reusable placeholder references with descriptive names and exact intended ratios:

- `[IMAGE_HOME_HERO — 16:9 UK/South Indian community visual]`
- `[IMAGE_HOME_OFFER — 2.2:1 South Indian food promotion]`
- `[IMAGE_BUSINESS_CARD_{id} — 4:3 provider image]`
- `[IMAGE_PROVIDER_COVER_{id} — 16:9 business cover]`
- `[IMAGE_PROVIDER_LOGO_{id} — 1:1 business logo]`
- `[IMAGE_CREATOR_PROFILE_{id} — 4:5 creator portrait]`
- `[IMAGE_EVENT_{id} — 16:9 cultural event]`
- `[IMAGE_COMMUNITY_POST_{id} — variable, maximum 4:5]`
- `[IMAGE_ONBOARDING_{step} — 4:5 editorial illustration/photo]`
- `[IMAGE_BUSINESS_DASHBOARD_PROMO — 2:1 promotion banner]`

Render placeholders as premium neutral blocks using the active theme, an image icon and a small internal asset label. Keep all image sources in one asset catalogue so supplied files can later replace placeholders without changing screen code.

Real uploaded images must always take priority. Demo or placeholder images must never overwrite real provider or creator media.

## Home screen

Rebuild Home based directly on the reference structure:

- Top row: location selector, notifications and compact profile avatar
- Time-aware greeting and a short community discovery subtitle
- Prominent rounded search field with filter action
- Theme-specific decorative hero/header background
- Six-category horizontal/compact grid with See all
- Large special-offer carousel using `[IMAGE_HOME_OFFER]`
- Popular near you horizontal provider cards using `[IMAGE_BUSINESS_CARD_{id}]`
- Additional relevant sections: creators near you, upcoming events and UK map CTA
- Provider cards contain image, name, rating, review count, distance, open/closed label and save action
- Bottom navigation remains visible and uses gold only for the active tab

## Explore screen

- Clear Explore heading and supporting text
- Bookmark and notification controls
- Search bar with working query input and filter button
- Popular search chips
- Browse-by-category icons styled with theme accents
- Segmented content selector: Businesses, Creators & Freelancers, Events
- Sort, open now, distance and advanced-filter controls
- Result count and map-view action
- Vertical result cards with image placeholders, verified status, rating, distance, city and bookmark
- Filters and search must work together and expose a clear reset action
- Maintain the same card geometry across all three themes

## Provider details

- Full-width `[IMAGE_PROVIDER_COVER_{id}]` with back, share and save controls
- Overlapping identity card with logo, name, verified state, category, rating, distance and location
- Quick actions: Call, Directions, Website and Save
- Premium verified-business strip in gold/violet—not green
- Tabs: Overview, Menu/Services, Offers, Reviews and Photos
- About, opening hours, price range and cuisine/service facts
- Offer cards, gallery, rating distribution and individual reviews
- Sticky or clearly accessible quote/contact action
- Preserve phone, maps, URL, WhatsApp, save, report and review behaviour

## Creators & Freelancers

- Header, description, bookmarks and notifications
- Search creators, skills and services
- Categories: All, Photographers, Videographers, Designers, Developers and More
- Image-forward top-creator cards using `[IMAGE_CREATOR_PROFILE_{id}]`
- Featured professional rows
- Show verification only when backed by data
- Show availability only when backed by data
- Include profession, city, rating, reviews, languages and save action
- Add creator details route or prepare card navigation for it

## Community

Remove the old green community hero and composer styling completely.

- Premium theme-aware header with Community title and Create post action
- Short explanation of the shared community purpose
- Content filters: Discussion, Experience, Recommend and Complaint
- Region/topic chips styled as subtle gold/violet icons—not multicolour legacy circles
- Streamlined composer card with post type, text entry, optional provider mention and publish action
- Signed-out composer must clearly route to authentication
- Community feed cards include author/provider, date, type, body, optional `[IMAGE_COMMUNITY_POST_{id}]`, reply and report actions
- Business-promotion CTA must use navy/gold/violet styling
- Add loading, empty, filtered-empty, offline and publishing states

## Saved screen

- Header with saved count and optional organisation/filter control
- Segments for Businesses, Creators and Events
- Use the same cards as Explore rather than a legacy saved-only card style
- Empty state with direct Explore action
- Removing a bookmark updates immediately and persists

## Profile screen

Remove the old theme-preview card row entirely.

- Premium profile identity panel with avatar, name, email and member-since metadata
- Edit-profile action
- Compact saved, reviews and quotes statistics
- Account menu: Edit profile, Notifications, Location and Settings
- Community/business menu: Reviews, Quote requests, List your business and Business dashboard when applicable
- Use consistent list rows with theme-aware icons and dividers
- Theme selection appears only inside Settings
- Keep logout visually separated as a danger action

## Settings and account utility screens

Apply the complete design system to:

- Edit Profile
- Notifications
- Location selection
- Settings
- Help and Support
- Quote Requests
- Reviews
- Authentication and Welcome

Each screen must use the current theme background, premium header, shared cards, inputs, switches, empty states and buttons. No secondary screen may retain white-only styling in dark modes or old green accents.

## Events and offers

- Events screen: featured event, date filters, city filters and event cards using `[IMAGE_EVENT_{id}]`
- Offer screen: featured offer carousel, category filters and provider-linked offer cards
- Clearly label sponsored/promoted content without pretending it is organic
- Dates, validity and provider association must be data-driven

## Map screen

- Theme-aware map container and controls
- Search area, distance filter and category filter
- Provider markers using gold/violet/blue—not green
- Bottom provider preview uses the same business-card data and image placeholder rules
- Map/list toggle and location permission states must work

## Business onboarding and dashboard

Rebuild all provider-facing areas with the same premium identity:

- List your business
- Verification/application state
- Subscription plans
- Business profile editor
- Promotions/post creation
- Leads/quote requests
- Reviews and analytics
- Media manager
- Billing/subscription status

Dashboard structure:

1. Business identity and verification status
2. Performance summary cards
3. Leads and quote requests
4. Listing completeness
5. Promotions and offers
6. Reviews
7. Media placeholders using `[IMAGE_BUSINESS_DASHBOARD_PROMO]`
8. Subscription and billing

Use premium navy surfaces, gold highlights and violet data accents. Never use an unrelated admin template or green analytics palette.

## Admin screens

Apply the same shared system to all admin routes:

- Dashboard overview
- Provider applications
- Verification review
- Reported listings/posts
- User and provider management
- Promotions/subscriptions
- Categories and content moderation

Use dense but readable cards and tables, consistent status pills and violet/gold charts. Destructive actions use coral/red. Approval must not use green; use gold/violet with explicit text labels.

## Navigation

- Customer bottom navigation: Home, Explore, Community, Saved and Profile
- Active item: gold icon, gold label and subtle theme-aware glow/background
- Inactive items: muted theme text
- Do not retain orange/copper or green legacy active states
- Nested screens use a shared back header
- Business/admin areas use an appropriate tab, drawer or responsive sidebar built from the same tokens

## Functional and engineering requirements

- React Native/Expo implementation must remain responsive across common phone sizes
- Use safe-area insets correctly
- Avoid fixed heights that truncate translated or dynamic content
- Search, filters, tabs, bookmarks, navigation, theme selection, forms and external actions must remain functional
- Keep Supabase/backend contracts intact
- Never replace real backend records with fabricated data
- Put demo records behind `EXPO_PUBLIC_DEMO_MODE`
- Show verification, availability, ratings and open status only when backed by data or clearly marked demo fixtures
- Centralise theme, spacing, typography, radii, shadows and asset references
- Remove unused legacy components and palette constants after migration
- Run a global source search for green/emerald legacy tokens and remove all visual occurrences
- The word “Green” inside a legitimate street address must not be altered

## Required completion checks

Before declaring completion:

1. Audit every registered navigation route.
2. Confirm all screens render in System Matte Black, Light Premium and Dark Midnight.
3. Confirm the Profile screen contains no theme-preview cards.
4. Confirm no visual green or emerald palette values remain.
5. Confirm placeholder image areas have names and stable aspect ratios.
6. Confirm real uploaded images override placeholders.
7. Confirm bottom navigation is consistent on all main tabs.
8. Confirm modals, sheets, loading, empty, error and offline states are themed.
9. Confirm business and admin screens use the same design language.
10. Run lint/type checks and a complete Expo production export.
11. Report changed files, incomplete backend-dependent features and every remaining placeholder asset name.

## Final visual standard

The finished app must feel like one coherent premium South Indian UK community marketplace. It must not look like separate mockups pasted onto legacy screens. The three themes should share the same trustworthy structure while providing distinct matte-black, premium-light and midnight-navy atmospheres. Gold creates continuity; violet supplies modern depth; photography is inserted later through the named placeholder system.
