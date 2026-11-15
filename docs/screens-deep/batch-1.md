# Screen deep dive — Batch 1

Scope is limited to Home, Explore (Search), Map, Saved, Profile, and Community feed. Descriptions below follow the rendered app source and directly rendered component source. “not found” means the inspected source does not define the behavior.

## 1. Home

### 1. Identity

- **Screen file:** `src/screens/HomeScreen.js`
- **Rendered component files:** `src/components/HomeComponents.js` (`HomeHeader`, `HomeSearch`, `HomeCategory`, `HomeHero`, `HomeQuickActions`, `HomeSectionHeader`, `HomeBusinessCard`, `HomeFeaturedCategories`, `HomeCommunityCTA`); `src/components/MarketplaceStatusBanner.js`; `src/components/Skeleton.js` (`MarketplaceSkeleton`); `src/components/AdPlacement.js`; `src/components/DiscoveryCards.js` (`OfferCard`); `src/components/GoogleBanner.native.js` / `src/components/GoogleBanner.web.js`; `src/components/HeroBackdrop.js`; `src/components/RevealImageBackground.js`; `src/components/GlassView.js`.
- **Navigator:** Tab `Home`, through Stack `MainTabs`.
- **Route params:** not found; the component accepts `navigation` only.
- **Who can see it:** all, including guest and signed-in users; no owner-only gate in this screen.

### 2. Layout top to bottom

1. `SafeAreaView` and vertical `MotionScrollView`, with pull-to-refresh.
2. `HomeHeader`: logo, notification badge/button, avatar/profile button, selected area, current-location action, and `HomeSearch`.
3. `MarketplaceStatusBanner`, only when marketplace state is offline and not loading.
4. Horizontal row of up to three `HomeCategory` category icon buttons and a “More” category button.
5. Inset content: `HomeHero` inside `FadeInView`; `HomeQuickActions`; popular/nearby/open/top-rated `HomeSectionHeader` and horizontal provider cards or skeleton/empty state.
6. “Featured collections” `HomeSectionHeader` and horizontal `HomeFeaturedCategories`.
7. “Recently added” header and horizontal provider cards, skeleton, or empty message.
8. `AdPlacement`: `GoogleBanner` and, when custom ads are enabled and supplied, an `OfferCard`.
9. `HomeCommunityCTA`.

### 3. Every element

| Element | Label/text | Type | Handler and effect | Navigation/API | testID |
|---|---|---|---|---|---|
| Logo | “ChodhiQ” accessibility label | image | none | none | not found |
| Notifications | unread count; “Open notifications…” | button | header callback | `Notifications` | `btn-home-notifications` |
| Profile avatar | “Open profile” | button | header callback | `Profile` | `btn-home-profile` |
| Area selector | current city or “Choose your area” | button | header callback | `Location` | `btn-home-area` |
| Use current location | “Use current location” / “Finding you…” | button | `useCurrentLocation`; requests device location and updates app state | Expo Location; writes current area through app state | `btn-home-current-location` |
| Search field visual | “Search for restaurants, salons, services, shops…” | button (not input) | `HomeSearch` callback | `Explore` | `btn-home-search` |
| Category icon chips | category name; “More” | chips/buttons | updates `selectedCategoryId`, or navigates for More | More → `Categories` | `btn-category-<slug>` / `btn-more-categories` |
| Hero | campaign title or “Find what you love nearby” / “Explore your neighborhood”; “Explore now” or “Visit sponsor” | card/button | `HomeHero` callback; impression/click tracking for campaign | ordinary hero → `Explore`; sponsored destination opens HTTPS URL | not found |
| Quick action: Nearby | “Nearby” | button/card | sets `discoveryMode='nearby'` | local filtering only | not found |
| Quick action: Top rated | “Top rated” | button/card | sets `discoveryMode='topRated'` | local filtering only | not found |
| Quick action: Open now | “Open now” | button/card | sets `discoveryMode='open'` | local filtering only | not found |
| Provider section heading | dynamic title/subtitle and “See all” | button/section header | opens the directory | `Explore` | not found |
| Provider card main | provider image or category placeholder; name; rating/review count; optional distance/open/closed | card/button | opens provider | `ProviderDetail`, param `{ id }` | `btn-home-provider` |
| Save provider | heart; “Save…” / “Remove…” accessibility label | button | signed-in calls `toggleSaved`; guest navigates to auth | writes `saved_items` or local pending save | `btn-save-business` |
| Provider category label | category name | button | opens category-filtered directory | `Explore`, param `{ categoryId }` | not found |
| Featured category card | category name; optional place count | card/button | opens category-filtered directory | `Explore`, param `{ categoryId }` | `btn-category-<id>` |
| Recently added provider card | same fields/actions as provider card | card/button | same provider/save/category handlers | `ProviderDetail`, `Explore`, or `Welcome` | same component IDs |
| Ad campaign | sponsored card/Google banner | card/button | records impression/click; opens valid HTTPS campaign target | RPC; external URL | not found |
| Community CTA | “Join the community”, “Create a post” | button/card | opens community composer route with compose param | `Community`, `{ compose: true }` | `btn-home-community` |
| Pull to refresh | system refresh gesture | gesture | awaits `refreshMarketplace` | provider/catalog refresh | not found |
| Offline retry | “Retry” | button | `refreshMarketplace` | provider/catalog refresh | `btn-retry-directory` |

### 4. Inputs and forms

- No editable input is rendered here. `HomeSearch` is an accessible button that navigates to Explore.
- The location action calls `getDeviceLocation`; permission errors use `showPermissionRecovery`; other errors show “Could not get your location” with the error message. While pending, the action is disabled and labeled “Finding you…”.
- Category selection is local state: pressing the active category clears it; pressing another selects it. No form validation.

### 5. Lists and cards

- Provider card fields: image/category fallback, business name, category, optional distance, optional Open/Closed status, optional rating and review count. Compact cards may include verified/data-checked/promoted/status badges and price labels only in `ProviderCardCompact`; Home uses `HomeBusinessCard`, whose rendered fields are the former list.
- “Popular” requires rating and at least one review and sorts rating descending then review count descending; at most 12.
- Browse fallback sorts city match first, then distance, then latest publication; at most 12.
- Nearby requires coordinates and a displayed distance of at most 50 km; nearest first; at most 12.
- Open now filters opening-hour state and sorts rating descending; at most 12.
- Recently added sorts publication date descending; at most 12.
- Categories: first 3 in the horizontal quick row; first 10 in featured collections.
- When marketplace loading is active, provider sections show `MarketplaceSkeleton` (three rows/cards). A completed empty primary result shows mode-specific copy. Recently added has a separate empty message. No pagination or per-section “load more”.
- There is no global empty view for absent categories, ad campaigns, or featured category records.

### 6. Filters, sort and options

- Default `discoveryMode`: `popular`.
- Default category: none. Category selection limits the provider collections, except `recentlyAdded`, which is computed from all enriched providers.
- Modes: Nearby, Top rated, Open now; selecting each changes the current primary provider section.
- Nearby means geocoded provider within 50 km of device coordinates; with no coordinates it is empty and prompts for location. The popular mode can fall back to the broader directory if there are no nearby listings.
- No price, rating-threshold, city, or service filter control is shown on Home.

### 7. Data

- Shared marketplace app state reads `categories` and provider fields loaded from Supabase `categories` (`id,name,slug,icon,color,sort_order`), `providers` (business identity, description, area, languages, experience, price, contact/website, image/portfolio, verification and rating metadata), `reviews`, `review_replies`, `services`, `provider_hours`; coordinates come from RPC `public_provider_coordinates`.
- Marketplace data is cached locally as catalog categories/providers and last-updated time. On failed/unconfigured network refresh, cached catalog is retained and `offline`/`lastUpdatedAt` drive the banner. Native local storage is provided by local database implementation; web implementation uses AsyncStorage. Home itself performs no direct table query for the marketplace.
- Ad data: RPC `list_active_ad_campaigns` with `target_city` and null category; records campaign impressions/clicks with RPC `record_ad_campaign_event` and an in-memory per-session ID. Refresh on screen effect, app foreground, and once per active minute. Campaign errors are caught and campaigns become empty.
- Local screen state: campaigns, discovery mode, selected category, locating state. Shared app state writes saved IDs, selected city/coordinates; location coordinates key is `chodhiq-location-coordinates`.
- No analytics visit-count API is called here.

### 8. States

- **Loading:** marketplace skeletons; status banner hidden while loading. Location action changes to “Finding you…”.
- **Offline/error:** offline banner indicates saved directory or no snapshot and offers Retry. Empty provider copy changes to direct the user online when `offline`. Campaign load failure is converted to no campaigns.
- **Empty:** specific copy for no reviewed, nearby, open, or category listings; recent listings explain that newly published businesses appear here.
- **Guest:** sees same directory, can navigate freely; save attempts go to Welcome.
- **Signed-in:** save writes are available; account avatar/name may be displayed.
- **Business owner:** same page behavior as any signed-in user; no owner-only element.

### 9. Permissions and device features

- Location: current-location action requests Expo Location; permission recovery UI is invoked on permission denial.
- Notifications: no permission request on this screen; notification count is app state and opens Notifications.
- Camera/photo library/share: not found.
- External links: sponsored campaign opens only if its destination starts with `https://`; fallback alert is provided by `openExternalUrl`.
- Google banner may render native/web ad placement depending on platform/feature configuration.

### 10. Animations and effects

- `FadeInView` wraps hero. `HomeHero` may rotate supplied images every five seconds only when at least two images exist, screen is focused/foreground, and reduced motion is off. Home currently supplies one static image, so slideshow dots/rotation are not active on this screen.
- `HomeHero` records an impression once for the current campaign while focused.
- Provider cards use ordinary view interactions; `FadeInDown` is used in related provider-card components, not `HomeBusinessCard`.
- `MotionScrollView`, `MotionTouchable`, `GlassView`, and the custom tab bar apply shared motion/glass treatment.
- Known visual risks: several badge/hero colors are literal hex values; the “filter” icon in `HomeSearch` is decorative inside a navigation button, not an actual filter action.

### 11. Design status per section

- **NEW glow UI:** no complete Home section uses the dedicated new community glow-card system.
- **OLD UI:** marketplace provider/catalog data and some banner/ad primitives use legacy marketplace styling.
- **MIXED:** glass header/search, dark/glass hero, palette-driven category chips, legacy marketplace content, shared motion, and home-specific cards coexist. There is no explicit per-section NEW/OLD flag in source.

### 12. Bugs, risks and TODOs spotted

- Search is a navigation button with a decorative filter icon, not a text input or direct filter.
- Campaign load/record failures are swallowed in this screen; a failed campaign fetch becomes an empty campaign list without a user-visible error.
- Campaign state refreshes on foreground and interval; the dependency includes `refreshMarketplace`, which may restart the interval if that callback identity changes.
- `HomeFeatureCards`, `HomeLocationBar`, `HomeOffer`, `HomeCreator`, `HomeEvent`, and `HomeMapCTA` are exported from the same component file but are not rendered by `HomeScreen`.
- Location and campaign URL error copy is explicit; there is no provider-section retry other than pull-to-refresh/status-banner retry.
- Several decorative controls and components have no `testID`; see the element table.

## 2. Explore (Search)

### 1. Identity

- **Screen file:** `src/screens/ExploreScreen.js`
- **Rendered component files:** `src/components/ExploreComponents.js` (`ExploreHeader`, `ExploreSearch`, `ExploreBusinessCard`, `ExploreEventCard`, `ExploreEmpty`); `src/components/MarketplaceStatusBanner.js`; `components/ui/GlowChip.tsx`; `src/components/GlassView.js`; `src/components/ScreenHeader.js` is not used by this screen.
- **Navigator:** Tab `Explore`, through Stack `MainTabs`.
- **Route params:** optional `categoryId`; an effect selects that category when the param is truthy.
- **Who can see it:** all; save behavior is auth-gated.

### 2. Layout top to bottom

1. `SafeAreaView` containing `FlatList`.
2. List header: `ExploreHeader` back button/title → `MarketplaceStatusBanner` when applicable → glass `ExploreSearch` input/filter button → horizontal category `GlowChip` row → result count and “Sort ↑” action.
3. `FlatList` result items: provider cards for its default Businesses branch; the Events branch is implemented in data/render logic but no visible tab control is rendered.
4. Empty state or provider-loading indicator.
5. Floating “Filters” button.
6. `FiltersModal`: glass bottom sheet with close/reset, sort, price, rating, service, availability/area, city, postcode suggestions, and apply button.

### 3. Every element

| Element | Label/text | Type | Handler and effect | Navigation/API | testID |
|---|---|---|---|---|---|
| Back | “Back to Home” | button | `onBack` | `Home` | not found |
| Search input | “Search businesses and services…” | input | `setQuery`; filtering uses deferred value | local provider/event filtering | not found |
| Search filter icon | “Open search filters” | button | opens modal | local state | not found |
| All chip | “All” | chip | clears selected category and service | local state | not found |
| Category chips | category name | chip | toggles selected category; resets service filter | local state | not found |
| Result count | “N result(s)” | text | none | computed locally | not found |
| Sort shortcut | “Sort ↑” | button | toggles `highestRated` | local sort state; not the modal’s `sortBy` directly | not found |
| Provider result card | image, name, category, verification badge, rating/review count or New, optional distance/tags | card/button | open provider detail | `ProviderDetail`, `{ id }` | not found |
| Save provider | bookmark, “Save…” / “Remove…” | button | `toggleSaved` if session; otherwise navigates to auth | `saved_items` or `Welcome` | `btn-save-business` |
| Event result card | title, date, organiser, city | card/button | opens Events route | `Events` | not found |
| Empty result | “No results found”, explanation, “Clear filters” | button/card | clears search/category/filter state | local state | not found |
| Floating filters | “Filters”; accessibility “Toggle highest rated results” | button | opens filters modal | local state | not found |
| Modal close | “Close filters” | button | closes modal | local state | not found |
| Modal reset | “Reset” | button | resets all filter state | local state | not found |
| Sort choices | Best match / Highest rated / Nearest first / Most reviewed | chips | sets `sortBy` | local state | not found |
| Price choices | Any / £ / ££ / £££ / ££££ | chips | sets price draft | applied at Apply | not found |
| Rating choices | Any / 4.0+ / 4.5+ / 4.8+ | chips | sets rating draft | applied at Apply | not found |
| Service choices | Any service / values derived from category-matching providers | chips | sets service draft | applied at Apply | not found |
| Availability | Any time / Open now | chips | updates `openNow` directly | local state | not found |
| Area | Any area / In my area | chips | updates `nearbyOnly` directly | local state | not found |
| City choices | Any city / UK city and provider cities | chips | sets city draft | applied at Apply | not found |
| Postcode field | “e.g. LE4 5AT” | input | `setPostcodeQuery`; Enter dismisses keyboard | address/postcode suggestion function | not found |
| Postcode suggestion | address/postcode label | button | fills postcode field and dismisses keyboard | Edge Function-backed suggestions | not found |
| Apply | “Show N result(s)” | button | copies draft price/rating/city/postcode/service into applied state and closes | local filtering | not found |
| Pull to refresh | system gesture | gesture | `refreshMarketplace` | shared marketplace query/cache | not found |

### 4. Inputs and forms

- **Search:** plain text input, placeholder “Search businesses and services…”. No `keyboardType`, max length, or custom validation is specified. The deferred query is matched against provider search fields; event search checks title, organiser, and city.
- **Postcode:** input, `autoCapitalize="characters"`, `returnKeyType="done"`, placeholder `e.g. LE4 5AT`; submit dismisses keyboard. No format validation is shown in this modal. Suggestions begin after two non-space characters, debounce 250 ms, combine address and postcode suggestions, cap at eight; choosing one fills the postcode value/label.
- **Filters:** no form-level validation. Apply trims postcode text. Price stores `price.length` for the provider numeric price range; rating converts the selected suffix to a numeric minimum.
- **Error text:** there is no inline postcode lookup error. The hook suppresses ordinary lookup failures into no suggestions; abort errors are not displayed. Empty results show “Try changing your search, category or filters.”

### 5. Lists and cards

- Provider card shows provider image/fallback, business name, verified badge or “Data checked”, category, rating/review count or “New”, optional distance, and provider-derived tags. Main-card press opens ProviderDetail; bookmark toggles saved.
- Event card shows image, title, date, organiser, city; press navigates to `Events`.
- Providers are filtered by text, selected category, service, applied price, minimum rating, city/postcode, open status, and “In my area”; then sorted per selected sort mode. There is no pagination/load-more control; FlatList virtualizes results.
- During marketplace loading the Business data list is replaced with `[]` and the empty component shows an activity indicator plus “Finding providers near you?”.
- Empty results use `ExploreEmpty`; the special “Directory unavailable” branch is inside `renderItem` but is unreachable because `renderResult` selects the Businesses card first whenever `activeTab === 'Businesses'`, while the special branch also requires that same condition. The general marketplace banner and empty state remain.
- Events are locally filtered from `discoveryData.events` by text; there is no event pagination.

### 6. Filters, sort and options

- Defaults: `activeTab='Businesses'` (but no visible control changes it); no category, no open-now, no nearby-only; `sortBy='Best match'`; price/rating/city/service drafts `Any`/`Any`/`Any city`/`Any service`; empty postcode.
- Category row: “All” and every loaded category. Tapping the active category clears it; changing category clears service selection.
- Sort: Best match (preserves current provider ordering), Highest rated (rating then review count descending), Nearest first (missing distance sorts last), Most reviewed (review count descending). “Sort ↑” separately toggles the boolean highest-rated override.
- Price: Any and one-to-four pound signs; rating: Any, 4.0+, 4.5+, 4.8+.
- Service: Any service plus sorted distinct service names matching providers in selected category.
- Availability and area: Any time/Open now; Any area/In my area. Source updates those states immediately rather than storing separate modal drafts.
- City: Any city plus unique sorted values from `ukCities` and provider base cities.
- Postcode suggestions: address suggestions followed by distinct postcode suggestions, maximum 8.
- Reset returns all filters/search/sort to defaults.

### 7. Data

- Reads shared marketplace state: category IDs/names, provider fields (name/category, image, rating/count, price, location/service areas, services, hours, verification, searchable descriptive fields, coordinates), saved IDs, current area/coordinates, offline/loading/last-updated state.
- Provider/catalog source is Supabase `categories`, `providers`, `reviews`, `review_replies`, `services`, `provider_hours`, RPC `public_provider_coordinates`; cache and offline fallback are described in the Home section above. Explore itself does not query those sources directly.
- Event list reads static `events` from `src/data/discoveryData.js`.
- Postcode suggestions call Edge Function `uk-address-suggestions` through `suggestUkAddresses` and local `suggestUkPostcodes` helper; receives labels/postcode/town/coordinates where available. Request is abortable/debounced.
- Writes saved business via app state (`saved_items` online; local saved store and pending sync offline).
- All filters, query, modal visibility and selected tab are ephemeral component state; no search-history storage is written.

### 8. States

- **Loading:** FlatList empty component displays spinner and “Finding providers near you?” for businesses. Pull-to-refresh and status banner retry shared refresh.
- **Empty:** “No results found” and Clear filters; event empty results use the same empty component.
- **Error/offline:** shared directory status banner; there is no separate retry/error result card if a marketplace fetch fails with no rows. Postcode lookup error becomes no suggestions.
- **Guest:** results are visible; save action navigates to Welcome.
- **Signed-in:** save action toggles saved state.
- **Business owner:** same as any signed-in visitor; no owner-only filter/results.

### 9. Permissions and device features

- Location permission is not requested by Explore. “In my area” compares provider area names with app-state `location`; Nearest first uses coordinates if present.
- Notifications/photo/camera/share: not found on this screen.
- Keyboard listeners support postcode modal scrolling/dismissal.

### 10. Animations and effects

- `ExploreBusinessCard` and `ExploreEventCard` use Reanimated `FadeInDown` only at full effects level, delayed by index and capped at index 8.
- `MotionModal` controls modal animation preference; `GlassView` and `GlowChip` provide glass/glow surfaces.
- Keyboard appearance scrolls filter content to the end; suggestion tap dismisses keyboard.
- Known visual issue: result header “Sort ↑” is an unlabeled visual shortcut whose accessibility label is not set; modal has a separate explicit sorting UI.

### 11. Design status per section

- **NEW glow UI:** `GlowChip` controls and `GlowButton` in filter sheet.
- **OLD UI:** result-card structure and general marketplace list presentation.
- **MIXED:** glass search field/sheet, palette-driven modern chip/filter surfaces, older provider/event card layout and shared legacy typography. No source-level design status flag exists.

### 12. Bugs, risks and TODOs spotted

- `activeTab` initializes to Businesses and is read by filtering/rendering, but no control calls `setActiveTab`; the Events result branch is unreachable from this screen. `SegmentedTabs` is not imported/rendered here.
- The “Directory unavailable” `renderResult` branch is logically unreachable: the earlier Businesses branch catches every Businesses item, and the special branch also requires `activeTab === 'Businesses'`. The general empty state appears instead.
- “Sort ↑” toggles `highestRated` without synchronizing `sortBy`; opening/applying the modal can overwrite or leave different sort indicators/behavior.
- `openNow` and `nearbyOnly` change result filtering before Apply; price/rating/city/postcode/service wait for Apply. Reset is comprehensive.
- `appliedPrice` uses `price.length`; correctness relies on provider `priceRange` being the same numeric scale.
- Search input, result cards, and several controls lack `testID`.
- `ExploreHeader` always labels back “Back to Home”; source callback navigates Home even when Explore was reached through another route.

## 3. Map

### 1. Identity

- **Screen file:** `src/screens/DiscoveryScreens.js`, `MapScreen`.
- **Rendered component files:** `src/components/ChodhiQMap.native.js` (uses `src/components/OpenStreetMap.native.js` when Google maps are disabled), `src/components/ChodhiQMap.web.js` (iframe/OpenStreetMap), `src/lib/openStreetMap.js`, `src/components/GlassView.js`, and local `MapFilterChip`, `MapSelectedCard`, `MapNearbyCard` in `DiscoveryScreens.js`.
- **Navigator:** Tab `MapTab` and Stack `Map`; both render the same component.
- **Route params:** no business params are read; only `route.name` is read to hide the back button on `MapTab`.
- **Who can see it:** all; saving is auth-gated.

### 2. Layout top to bottom

1. Full-screen `SafeAreaView`; map viewport with top safe-area offset.
2. `ChodhiQMap` map surface and provider markers/cluster markers.
3. Overlay top brand header with notification button.
4. Glass search control: conditional back button, search input, clear-search button, filters toggle.
5. Horizontal category cards.
6. Conditional city filter panel with Everywhere/city chips and reset.
7. Floating result count and current-location button.
8. Side map-type and current-location controls.
9. Bottom overlay: selected business card plus nearby carousel; otherwise a location/results empty-state card.

### 3. Every element

| Element | Label/text | Type | Handler and effect | Navigation/API | testID |
|---|---|---|---|---|---|
| Map surface | provider markers; cluster count; native user-location indicator where native Google Map is enabled | map | marker selects provider; coincident marker cluster zooms and selects | native map / OSM WebView or web iframe | not found |
| Brand | “ChodhiQ” | text | none | none | not found |
| Notifications | bell; unread dot | button | navigates to activity | `Notifications` | `btn-map-notifications` |
| Back | “Go back” | button | `navigation.goBack()`; shown off MapTab | navigator | `btn-map-back` |
| Map search | “Search restaurants, salons, services…” | input | updates deferred search query | local provider filtering | not found |
| Clear search | “Clear map search” | button | clears query | local state | `btn-map-filters` (source ID is assigned to this clear button) |
| Filter toggle | “Show map filters” | button | toggles city panel | local state | `btn-map-layer` |
| Category cards | All and category names | cards/chips | toggles one active category | local filtering | not found |
| Reset map filters | “Reset” / “Reset all map filters” | button | clears search, city and category | local state | not found |
| City chips | Everywhere and unique provider base cities | chips | selects/clears city | local filtering | not found |
| Result badge | “N result(s) in this area” | status text | none | map viewport and filter state | not found |
| Current location (floating) | “Use current location” / “Locating…” | button | obtains device coordinates; centers viewport and clears city | Expo Location and app state | `btn-map-current-location` |
| Map type | “Switch to satellite map” / “Switch to standard map” | button | toggles `standard` / `satellite` | map renderer | not found |
| Current location (side) | “Go to current location” | button | same location handler | Expo Location | not found |
| Selected business main area | image/fallback, name, category, rating/count, distance, address, open/closed | card/button | opens provider detail | `ProviderDetail`, `{ id }` | `btn-map-provider` |
| Save selected business | “Save…” / “Remove…” | button | toggles saved if signed in; else Welcome | saved-items repository / `Welcome` | `btn-map-save` |
| Directions | “Directions to <provider>” | button | opens coordinate/place-ID/search URL; reports if unavailable | external Google Maps URL | `btn-map-directions` |
| Nearby card | image/fallback, name, distance or city, optional rating | card/button | selects provider | local selected provider | not found |
| Empty-state Search link | “Browse businesses in Search” | button | navigates to Explore | `Explore` | not found |
| Empty-state clear | “Clear filters” | button | clears search/city/category | local state | not found |

### 4. Inputs and forms

- Search is an `AppTextInput`, placeholder “Search restaurants, salons, services…”, `returnKeyType="search"`. No validation, max length, or keyboard type is specified.
- Search is deferred through `useDeferredValue`, then passed to provider search matching.
- City selection and categories are not a form; reset clears all three.
- Current-location action has a `locating` guard and disables both current-location buttons while pending. Permission denial calls `showPermissionRecovery`; other failures show “Could not get your location”.
- Directions with no usable coordinate/place/search URL show “Directions unavailable”.

### 5. Lists and cards

- Markers only include providers with valid finite latitude/longitude within geographic bounds. Native Google marker groups are keyed by rounded-to-three-decimal coordinate pair; cluster tap zooms to ~0.045 deltas and selects one provider.
- Selected business card fields: image or store placeholder, business name, category, rating/review count if present, distance when user coordinates exist, address when present, opening status when hours can be evaluated; save/directions buttons.
- Nearby carousel includes all coordinate-bearing providers from filtered providers, max 12, sorted by distance when current coordinates exist; otherwise first 12 in source order. Each card shows image/name and distance or city, optional rating.
- `visibleProviders` uses map viewport coordinates to count/map-filter displayed markers. `selected` is changed to the first visible provider if current selection leaves viewport.
- Empty cards distinguish: map providers exist but none in current map area; provider rows have no usable map coordinates; no provider results after filters. Each has a Search or clear-filter action.
- There is no pagination.

### 6. Filters, sort and options

- Defaults: no selected provider/category/city/query/viewport, city filter closed, locating false, map type `standard`.
- Categories: All plus each loaded category; only one selected; selecting active category clears it.
- Cities: Everywhere plus sorted unique `baseCity` values. A provider matches selected city when city or `serviceAreas` includes it, case-insensitive.
- Search uses `matchesProviderSearch`; category uses `providerMatchesCategory`.
- Map type toggles Standard/Satellite.
- Nearby carousel ordering is nearest-first when user coordinates exist; capped at 12.

### 7. Data

- Reads app-state provider fields: id, name/category, base city/service areas, coordinates, image, rating/review count, hours, address/map identifiers; categories; saved IDs/session; current location and coordinates; unread notifications count.
- Provider/catalog tables and cache are shared with Home and Explore: `providers`, `categories`, `reviews`, `review_replies`, `services`, `provider_hours`, RPC `public_provider_coordinates`.
- Writes current location/city through shared app state and key `chodhiq-location-coordinates`; writes provider save via shared `saved_items`/local pending sync.
- No direct table query or RPC in Map screen. OSM source opens externally supplied tile/render code; Maps URL is derived from coordinates, Google Place ID, or provider search URL.
- Local state contains selected provider, active category/city, query, modal/panel visibility, viewport, location busy state, and map type.

### 8. States

- **Loading:** no dedicated marketplace loading spinner in this screen. If providers are absent, it falls into “No providers found”.
- **Empty:** no providers; no coordinates; filtered providers outside map viewport, each with distinct message.
- **Map error:** native OpenStreetMap fallback can show “Some map tiles could not load” or “Map connection interrupted” and retry; Google native map has no in-screen error fallback in this component. Web map iframe has no visible error handler in `ChodhiQMap.web.js`.
- **Guest:** can search/view/directions; save navigates to Welcome.
- **Signed-in:** can save; same map otherwise.
- **Business owner:** no owner-specific behavior.

### 9. Permissions and device features

- Current location uses Expo Location and shared permission recovery.
- Native Google map sets `showsUserLocation`; map code does not invoke a permission request itself. Whether permission has been granted is handled elsewhere/not found in this component.
- Notifications opens existing notification screen; this screen does not request notification permission.
- Directions and map search use external maps URLs; external open failure copy is provided.
- No camera/photo/share features.

### 10. Animations and effects

- Google native map fits coordinate markers after layout/data changes and animates to selected current coordinates. Cluster tap animates zoom; region changes update visible count/selection.
- OpenStreetMap renderer receives providers/location/map type and reports selection/region through bridge. Web renderer uses sandboxed iframe and `postMessage`.
- Glass overlays on search, palette-based selected/category cards. No dedicated component animation on map cards.
- Known platform difference: map fallback is WebView on native when Google Maps is disabled; web always uses iframe. Error presentation differs between these modes.

### 11. Design status per section

- **NEW glow UI:** no dedicated new glow cards; shared glass controls use current glow palette.
- **OLD UI:** map-specific business and nearby card layout, map controls, category row and custom empty cards.
- **MIXED:** platform map widgets, glass search, shared palette, legacy map-card presentation and in-file overlays.

### 12. Bugs, risks and TODOs spotted

- `layersVisible` state is declared but never read; map type control uses `mapType`, while the filter toggle uses `filtersVisible`.
- Filter toggle testID says `btn-map-layer` although it opens city filters; search clear button testID says `btn-map-filters`. IDs are swapped/misleading.
- Filter button accessibility label says “Show map filters” even when the panel is open; expanded state is present.
- Side map-type button does not specify a testID; many category/city controls have none.
- List shows nearest 12 coordinate providers globally, not only providers inside the current viewport; result badge reports viewport count. This distinction is visible in source.
- With no providers, Map has no explicit retry/refresh control.
- Selected card can display the initially selected provider when viewport updates, but no selected-provider marker is passed to the web iframe renderer in the current `ChodhiQMap.web.js` prop signature.

## 4. Saved

### 1. Identity

- **Screen file:** `src/screens/SavedScreen.js`
- **Rendered component files:** `src/components/ProviderCard.js` (`ProviderCardRow`); `src/components/community/PostCard.js` (legacy `CommunityPostCard`, including internal helpers and image modal); `src/components/GlassView.js` indirectly through post/card presentation; `src/components/Motion.js` (`MotionTouchable`, `FadeInView`); `src/data/communityImages.js`.
- **Navigator:** Tab `Saved`, through Stack `MainTabs`.
- **Route params:** not found.
- **Who can see it:** all; community post loading requires a signed-in session. Business saves are read from app state.

### 2. Layout top to bottom

1. `SafeAreaView`.
2. Header: “Saved” and “Your saved businesses and posts”.
3. Horizontal tab row: Businesses, Events, Offers, Posts.
4. `FlatList`: saved provider rows or saved community post cards; for Events/Offers the list is always empty.
5. Empty/loading/error view.

### 3. Every element

| Element | Label/text | Type | Handler and effect | Navigation/API | testID |
|---|---|---|---|---|---|
| Businesses tab | “Businesses” | tab/button | sets `tab='businesses'` | local state | not found |
| Events tab | “Events” | tab/button | sets `tab='events'` | local state; list data is always `[]` | not found |
| Offers tab | “Offers” | tab/button | sets `tab='offers'` | local state; list data is always `[]` | not found |
| Posts tab | “Posts” | tab/button | sets `tab='posts'`; focus effect loads saved posts | Supabase | not found |
| Provider card body | image, name, category, city/service areas, verification/data-check, rating/count or New, price label | card/button | opens provider detail | `ProviderDetail`, `{ id }` | not found |
| Provider save/heart | save state | button | `toggleSaved` removes saved provider | `saved_items` / local fallback | not found |
| Community author | author initial/name | button | navigates to author profile | `CommunityProfile`, `{ authorId }` | `btn-comment-post` and `btn-bookmark-post` in card source (labels incorrectly identify profile action) |
| Community options | “Post options” | button/menu | available callbacks include author navigation only on this screen | native Alert | `btn-share-post` |
| Community image | post image or “Photo unavailable” | image/button | opens full-image modal when image exists | image asset/signed URL | not found |
| Community comment | “Comments, N” | button | navigates to CommunityTab with post id | `CommunityTab`, `{ postId }` | not found |
| Community save | “Remove saved post” | button | deletes saved-post row and removes card locally | Supabase `community_saved_posts` | not found |
| Community share | “Share post” | button | invokes system share sheet; failure alert | React Native Share | not found |
| Retry | “Tap to retry” | button | reruns `loadSavedPosts` | Supabase reads | not found |

### 4. Inputs and forms

- No text input or form is rendered on Saved.
- Community comment button navigates to another screen; no comment form here.
- No local validation.

### 5. Lists and cards

- Businesses are `providers.filter(provider.id in savedIds)`. Row displays provider name, category, base city, up to two service areas when more than one exists, verification/data-check, rating/count or New, and optional £ price scale. Press opens provider; heart removes save.
- Saved posts are queried in saved-date descending order, then fetched from published community posts and re-sorted to match the saved-ID order. Fields include author display name, post body/type, image, region/location, created date, optional provider relation (name/verification), and derived variant/engagement values.
- Saved post card actions: options (author only on this screen), author profile, provider detail if provider relation exists, comments → CommunityTab, remove bookmark, share, full image modal. Like callback is a no-op on this screen.
- Posts are loaded when Posts tab is focused; no pagination.
- Empty state: businesses says “Nothing saved yet…”; other non-post tabs say “Saved <tab> will appear here as you bookmark them.” Posts show spinner, a retryable sign-in/network error, or generic empty state.

### 6. Filters, sort and options

- Default tab `businesses`.
- Tabs: Businesses, Events, Offers, Posts.
- Business order follows the shared `providers` source order after filtering by saved IDs; no local sort.
- Posts order follows `community_saved_posts.created_at` descending, preserved after the post fetch.
- No other filters or sorting.

### 7. Data

- Business saves read `savedIds` and providers from app state. `saved_items` is backed by online Supabase or local account cache/pending sync through app state.
- Saved-post loading queries:
  - `community_saved_posts`: `post_id,created_at`, filtered `user_id`, ordered `created_at` descending.
  - `community_posts`: post identity/author/provider/type/body/image/offer expiry/region/location/creation and joined provider `id,business_name,is_verified,categories(name,slug)`; filtered to IDs and `status='published'`.
  - RPC `get_community_member_profile(target_author)` for author `display_name`.
  - `resolveCommunityImages` resolves stored image references, using Supabase Storage signed URLs when configured.
- Removing a saved post deletes by post ID and user ID; failure preserves item and shows retryable text. Per-post removal lock avoids duplicate requests.
- Local state: active tab, saved posts, loading/error; no persistence key is directly read/written in this screen.

### 8. States

- **Loading:** only the Posts tab has an activity indicator, while its query is pending.
- **Empty:** saved businesses empty text; events/offers always empty because no rows are supplied; posts empty text if no loading/error.
- **Error:** no Supabase/session yields “Sign in to view saved community posts.” Network/read error yields “Saved posts could not load. Check your connection and retry.” Removal error yields retry text.
- **Guest:** business list uses current app state (usually empty); posts show sign-in error; provider save handler is not explicitly guest-gated in this file and depends on `toggleSaved` rejecting.
- **Signed-in:** both saved provider list and Posts tab work.
- **Business owner:** no owner-specific behavior.

### 9. Permissions and device features

- Share uses React Native `Share.share`; error logs a warning and shows alert.
- Photo display does not request permission; images are shown from resolved URLs.
- No location, camera, or notification permission request.

### 10. Animations and effects

- Saved post cards are wrapped in `FadeInView` with delay capped at 320 ms.
- Provider rows use `FadeInDown` at full effects level.
- Community post card can animate post-offer progress, upvote changes, image viewer and row/card interactions; offer timer runs only while navigation screen is focused/foreground.
- Known visual issue: new community post card and legacy community card share different visual systems.

### 11. Design status per section

- **NEW glow UI:** none; Saved does not use the new `components/PostCard.tsx`.
- **OLD UI:** header/tabs, marketplace provider rows, empty states and community Mela post card.
- **MIXED:** old Saved screen with shared motion, palette-aware cards, and community feed actions.

### 12. Bugs, risks and TODOs spotted

- Events and Offers tabs are visible but have no corresponding list data or saved-event/saved-offer API in this screen.
- Like callback passed to community card is a no-op; card still renders an upvote control, but it does not persist or change state.
- Signed-out `loadSavedPosts` sets an error but does not force the Posts tab or show a sign-in CTA/navigation action.
- `Promise.all` author lookup catches individual failures and shows “Community member”; no retry is offered for only failed author names.
- In `src/components/community/PostCard.js`, avatar/name testIDs are assigned `btn-comment-post`/`btn-bookmark-post` even though their accessibility labels and handlers navigate to author profile.
- Some community card menu choices (report/edit/block) are absent because callbacks are not passed.

## 5. Profile

### 1. Identity

- **Screen file:** `src/screens/ProfileScreen.js`
- **Rendered component files:** `src/screens/AccountScreens.js` (`accountMenu` definitions); `components/ui/GlowSurfaces.tsx` (`GlowProfileCard`); `components/ui/GlowButton.tsx`; `components/ui/AsyncGlowButton.tsx`; `src/components/GlassView.js`; `src/components/Motion.js` (`MotionScrollView`, `MotionTouchable`, `FadeInView`, `PressableScale`); `@gorhom/bottom-sheet` for logout confirmation; Expo Image Picker.
- **Navigator:** Tab `Profile`, through Stack `MainTabs`.
- **Route params:** not found.
- **Who can see it:** all. Guest sees sign-in prompt; signed-in users see the account sections. Provider upsell appears only when there are no owned providers.

### 2. Layout top to bottom

**Guest branch**
1. Safe area and centered `View`.
2. Sign-in icon/title/explanation.
3. Appearance summary card.
4. Sign-in/create-account `GlowButton`.

**Signed-in branch**
1. Safe area and vertical motion scroll.
2. `GlowProfileCard`: avatar/change-picture control, name/email/member-since, edit-profile icon action.
3. Stats row: saved, reviews, bookings.
4. “Account & preferences” collapsible `ProfileGroup`: vibration switch, sync status/retry, permission settings action, account `MenuCard`.
5. If `access.ownedProviders.length===0`, “Grow your business” collapsible group with provider benefits and Claim Listing button.
6. “Community & business” collapsible group with reviews, quote requests, bookings, and claim listing excluded from this menu.
7. Log out button.
8. `BottomSheetModal` logout confirmation with Stay signed in / Log out.

### 3. Every element

| Element | Label/text | Type | Handler and effect | Navigation/API | testID |
|---|---|---|---|---|---|
| Guest sign-in CTA | “Sign in or create account” | button | navigate to auth | `Welcome` | not found |
| Profile avatar | image or generated initials; “Change profile picture” | button | requests library access, opens picker, saves URI | Expo Image Picker; `saveProfile` | `btn-change-profile-picture` |
| Identity | name, email, member-since | text | none | profile state | not found |
| Edit icon | shield/pencil icon; no visible text | button | opens edit profile | `EditProfile` | not found |
| Saved stat | count and “Saved” | button | opens Saved | `Saved` | `btn-profile-saved` |
| Reviews stat | count and “Reviews” | button | opens Reviews | `Reviews` | `btn-profile-reviews` |
| Bookings stat | count and “Bookings” | button | opens Bookings | `Bookings` | `btn-profile-bookings` |
| Account group header | “Account & preferences” and hint | button/accordion | toggles account group | local expanded state | not found |
| Vibration | “Notification vibration” | switch | updates preference | preference store/sync API | `switch-notification-vibration` |
| Preference retry | “Couldn’t sync. Retry” / “Syncing…” | button | `retryPreferencesSync` | preference sync | not found |
| Device settings action | “Open phone notification settings” | button | opens OS settings | linking/platform settings | not found |
| Account menu rows | Edit profile, Notifications, Location, Settings | card/buttons | navigate to row route | corresponding Stack route | generated `btn-profile-<route>` |
| Grow business group header | title/hint | button/accordion | toggles group | local expanded state | not found |
| Benefits | verification, offers/updates, enquiries | informational rows | none | none | not found |
| Join provider | “Join as a provider” | button | opens claim flow | `ClaimListing` | `btn-claim-listing` |
| Community & business group header | title/hint | button/accordion | toggles group | local expanded state | not found |
| Community menu rows | My reviews, Quote requests, My bookings | card/buttons | navigate to routes | `Reviews`, `QuoteRequests`, `Bookings` | generated `btn-profile-<route>` |
| Log out | “Log out” | button | presents sheet | local sheet | `btn-open-logout` |
| Stay signed in | “Stay signed in” | button | dismisses sheet | local sheet | `btn-cancel-logout` |
| Confirm logout | “Log out” | button | dismisses sheet, signs out, navigates auth | sign-out API; `Welcome` | `btn-confirm-logout` |

### 4. Inputs and forms

- No text input on Profile; name/phone editing is a separate `EditProfile` route.
- Avatar picker uses image-library permission, image-only selection, square crop, quality `0.82`. Denied permission returns without a visible message. Picker cancellation does nothing.
- Vibration switch is a boolean preference. No local validation.
- Logout uses a confirmation bottom sheet.

### 5. Lists and cards

- Stats show current saved ID count, review count, and booking count.
- Account menu rows come from `accountMenu`: Edit profile, Notifications, Location, Settings.
- Community menu filters rows with `group='community'` excluding ClaimListing: My reviews, Quote requests, My bookings.
- Provider upsell appears only for users without owned providers and includes explanation/benefits, claim CTA and ownership-proof note. Owned-provider-specific card content is not found.
- Menu order is defined in `src/screens/AccountScreens.js`; no sorting/filtering or pagination.

### 6. Filters, sort and options

- Guest/signed-in branch selected by presence of `session`.
- Guest sees appearance summary and sign-in CTA only.
- Signed-in groups initially collapsed (`expandedSection=null`); clicking toggles one group ID (`account`, `provider`, `community`).
- “Grow your business” omitted when any owned provider exists.
- No list filters or sort.
- Logout options are Stay signed in / Log out.

### 7. Data

- Reads app-state `profile` (`name,email,phone,location,avatarUri,memberSince` as mapped), session, saved IDs, reviews, quote requests, bookings, owned providers, preferences/error/sync state, and notification permission-denied state.
- `saveProfile` validates and updates `profiles` via app-state/account repository; avatar URI also uses AsyncStorage key `chodhiq-profile-avatar`.
- App profile/account load reads remote `profiles`, `saved_items`, `reviews`, `quote_requests`, `bookings`, `notifications` and local equivalents as applicable; Profile itself does not issue those queries.
- Vibration preference state is shared preference store and may sync remotely; this screen exposes syncing/error/retry labels.
- Logout delegates to shared sign-out state and navigates to Welcome.
- Local component state: expanded section and bottom-sheet ref.

### 8. States

- **Guest:** sign-in-required screen; no account stats/menu.
- **Signed-in:** profile, stats, collapsible preferences/community groups and logout.
- **Owner:** provider upsell hidden when owned provider list is nonempty; no separate owner dashboard CTA/content shown.
- **Loading:** no Profile-specific loading skeleton/spinner. Shared bootstrap can delay navigator before this screen is available.
- **Empty:** blank email/member-since fallback; initials fallback to “S”; zero counts display normally. No explicit empty card for missing profile.
- **Error:** preference syncing/error text plus retry; avatar picker permission denial is silent. Sign-out/profile errors are not caught in Profile source; async button behavior depends on shared `AsyncGlowButton`.

### 9. Permissions and device features

- Photos: requests media-library permission; no camera capture.
- Notifications: reads `permissionDenied`; action opens phone settings on non-web only.
- Share/location/external link: not found.

### 10. Animations and effects

- Profile cards/groups/stats/menu have staggered `FadeInView`; `MotionScrollView`, `MotionTouchable` and `PressableScale` provide touch/scroll motion.
- Logout is a Gorhom bottom sheet with backdrop, glass background and pan-down close.
- New glow-profile surfaces/buttons and legacy theme constants coexist.

### 11. Design status per section

- **NEW glow UI:** profile card surfaces, `GlowButton`, `AsyncGlowButton`, menu and group cards use the newer glow primitives.
- **OLD UI:** menu content and profile/account hierarchy are legacy account screen structures.
- **MIXED:** profile layout mixes glow surfaces, glass background, older theme `colors` and hard-coded text/icon styling. Design generation is not encoded per block.

### 12. Bugs, risks and TODOs spotted

- Avatar permission denial silently exits. Picker/save errors are not caught here.
- `confirmLogout` dismisses first, then awaits sign-out, then navigates; this component has no local error feedback for sign-out rejection.
- In the signed-in profile avatar, `profile.name` is assumed to exist for initials except optional chaining on the split; missing/null profile shape safety is partial.
- Edit icon button has no explicit accessibility label/testID; it only exposes an icon.
- Notification settings action uses a label but no testID.
- `accountMenu` includes “Claim listing / Create new” in community group, but Profile excludes it there; the separate provider upsell CTA is only visible with no owned provider.
- No owner-specific screen state besides hiding the provider acquisition group.

## 6. Community feed

### 1. Identity

- **Screen file:** `screens/CommunityFeedScreen.tsx`
- **Rendered component files:** `components/ui/Screen.tsx`; `components/ui/PressableScale.tsx`; `components/composer/PostComposer.tsx`; `components/composer/useComposerFlow.ts`; `components/composer/PostButton.tsx`; `components/composer/PostSuccess.tsx`; `components/ui/GlowIconButton.tsx`; `components/ui/GlowButton.tsx`; `components/PostCard.tsx`; `components/Avatar.tsx`; `components/PulseDot.tsx`; `components/CategoryChip.tsx`; `components/GlowCard.tsx`; `components/TabPills.tsx`; `src/context/AppStateContext.js`.
- **Navigator:** Tab `CommunityTab`, through Stack `MainTabs`.
- **Route params:** component prop type only declares `navigation.navigate(route)`; no `route` prop is accepted/read.
- **Who can see it:** all. Posting/liking/bookmarking/commenting is gated by sign-in callback; sharing and post options are not gated.

### 2. Layout top to bottom

1. `Screen` safe area (top/left/right) and `KeyboardAvoidingView`.
2. Animated FlatList header:
   - Community logo/icon, title and subtitle; category filter action.
   - `PostComposer` card: multiline post input, optional attachment preview, photo/GIF/emoji tools, Post button; success animation.
   - `TabPills`: Latest / For you / Nearby.
   - Information row: `PulseDot`, visible conversation count, static “General”, filter/sort options button.
3. `Animated.FlatList` of `PostCard` components, separated by 16-pixel `PostSeparator`; pull-to-refresh.
4. Per-card full-screen comment modal.

### 3. Every element

| Element | Label/text | Type | Handler and effect | Navigation/API | testID |
|---|---|---|---|---|---|
| Feed heading | “Community feed”; “Stories from people around you” | text | none | none | not found |
| Category filter | current category; default “All categories” | button | opens native Alert choices; filters local post array | local state | not found |
| Composer text | “Share something with your community…” | multiline input | updates local text | no remote API | not found |
| Attachment preview | selected local image | image | none | device URI only | not found |
| Remove attachment | “Remove attachment” | button | clears image URI | local state | not found |
| Add image | “Add image” | button | requests photo permission, opens image picker | Expo Image Picker | not found |
| Add GIF | “Add GIF” | button | opens same image-only library picker; quality changes | Expo Image Picker; actual GIF-specific picker not found | not found |
| Add emoji | “Add emoji” | button | native Alert offers 😀, ❤️, 🙌, 🎉, 🙏 and appends choice | local state | not found |
| Post | “Post” / “Posting” | button | `useComposerFlow.submit`; auth alert for guest | mock local submission only | `btn-post` |
| Composer status | “Couldn’t post. Tap to retry.” | status text | state auto-resets; user can press Post again | local state | not found |
| Feed tabs | Latest / For you / Nearby | tabs/chips | `TabPills` changes its own uncontrolled visual selection | no feed callback supplied | not found |
| Filter/sort | “Feed filters” | button | native Alert offers Latest / Most liked / Cancel | local sort state | not found |
| Pull-to-refresh | native gesture | gesture | resets list to original hard-coded posts after 500 ms | local state only | not found |
| Post avatar | initial and optional online indicator | image/status | none | hard-coded post data | not found |
| Post author/time | username; “Just now” or relative text | text | none | local post fields | not found |
| More options | “More post options” | button | alert: bookmark/unbookmark, share, cancel | local state/system Share | not found |
| Post body/category | body text and category chip | text/chip | none | local post fields | not found |
| Like | “Like/Unlike post, N likes” | button | toggles local liked/count, haptic and bounce; guest invokes sign-in alert | in-memory only | `btn-post-like` |
| Comments | “View comments, N comments” / “Comments (N)” | button | opens modal | in-memory post comment list | `btn-post-comment` |
| Bookmark | “Bookmark post” / “Remove bookmark” | button | toggles local bookmark; guest invokes sign-in alert | in-memory only | `btn-post-bookmark` |
| Share | “Share post” | button | opens system share sheet | React Native Share | not found |
| Comment field | “Write your comment…” | multiline input, max 500 | updates draft | in-memory only | not found |
| Close comments | “Cancel” | button | closes modal | local state | `btn-post-comment-close` |
| Submit comment | “Comment” | button | adds trimmed draft to local comment list/count; guest asks to sign in | in-memory only | `btn-post-comment-submit` |

### 4. Inputs and forms

- **Post body:** multiline native `TextInput`, placeholder “Share something with your community…”. No `maxLength`, keyboard type, or content validation is supplied by the rendered TextInput. Submit trims whitespace and returns without posting if empty. Post button is disabled for blank/whitespace text.
- **Attachment:** optional image from photo library. Permission denial shows “Allow photo library access to choose an attachment.” Picker/open errors log a warning and show “The attachment could not be opened. Please try again.” Cancel leaves attachment unset. GIF button still uses `mediaTypes: ['images']`; GIF support is not found.
- **Emoji:** selection appends the chosen emoji; no validation.
- **Comment:** multiline TextInput, max length 500, placeholder “Write your comment…”. Submit disabled for blank text; handler trims and ignores blank. No error message or remote persistence.
- **Composer submit error:** “Couldn’t post. Tap to retry.” Flow catches/logs submission errors and resets after 1.8 s. The current mock submit resolves after 1.8 s and does not produce an error itself.

### 5. Lists and cards

- Initial feed is exactly three hard-coded posts:
  - Kevin, “12 days ago”, “Checking”, Discussion, 3 likes, 1 comment “Thanks for sharing this!”, online.
  - Kevin, “12 days ago”, “Hi”, Discussion, 2 likes, 1 comment “Hi Kevin!”, online.
  - DOM_SHOW, “20 days ago”, “New Church”, Discussion, 0 likes/comments, offline.
- New posts are added at index 0 with username Kevin, category Discussion, zero likes/comments, online true, and optional locally picked URI.
- `PostCard` displays avatar initial/online dot, username, time, body, optional image, category chip, like/comment/bookmark/share controls; full variant duplicates Like/Comment/Share actions below.
- Filter categories are “All categories” plus distinct categories present in current in-memory list. Sort options are Latest (preserves insertion order) and Most liked (descending by local likes).
- Refresh replaces all posts with the original fixture list; it does not fetch remote posts.
- No pagination. `FlatList` viewability tracks currently visible IDs; refresh-empty list state has no explicit empty message, though static fixtures normally prevent it.

### 6. Filters, sort and options

- Category default: “All categories”; category options derived from current posts.
- Feed tab visual default: Latest; For you and Nearby are available in `TabPills`, but `CommunityFeedScreen` passes no `value`/`onChange`, so selection is component-local and does not alter posts.
- Sort default: insertion order/Latest. Alert choices: Latest, Most liked, Cancel.
- “General” feed label is hard-coded; no space selection is provided.
- Post more menu: Bookmark/Remove bookmark, Share, Cancel.
- Emoji choices: 😀, ❤️, 🙌, 🎉, 🙏.

### 7. Data

- **No Supabase table, RPC, Edge Function, or local persistence key is read/written by this screen or its composer.** `initialPosts` are literal fixtures.
- Composer `submitMockPost` waits 1.8 seconds and returns a fabricated local `Post`; it does not upload content or attachment. `handlePosted` adds it to component state.
- Likes, bookmarks, comment counts/comments and drafts are local component state only. Refresh replaces the feed with the original fixtures (removing newly added posts); it does not explicitly reset per-card state for fixture IDs that remain unchanged.
- Shared AppState is used only for `session` to gate write-like interactions.
- No offline queue or remote caching for this screen.

### 8. States

- **Loading:** no initial loading state or network fetch. On pull refresh, refreshing indicator runs 500 ms and posts reset to fixture list.
- **Empty:** no dedicated empty-feed component; `FlatList` can render empty only if list state becomes empty, which current handlers do not do.
- **Error:** mock submit hook catches errors/logs, displays transient “Couldn’t post…”; mock callback itself has no failure path. Share has a console warning and platform Alert.
- **Guest:** sees fixtures; attempting post/like/bookmark/comment displays “Sign in required” alert with Cancel/Sign in. Sign in navigates `Welcome`.
- **Signed-in:** composer and interactions proceed, but still remain local-only.
- **Business owner:** no owner-specific behavior.

### 9. Permissions and device features

- Photos: requests media-library permission; no camera. Both image/GIF buttons select images.
- Haptics: light impact on composer press and post card interactions; upvote helper uses selection haptic on legacy post card only (not the new `PostCard` behavior).
- Share: React Native Share sheet; failure warning/alert.
- Location and notifications: not found.

### 10. Animations and effects

- `Screen` registers default ambient background variant while focused; safe area edges top/left/right.
- `Animated.FlatList` uses `LinearTransition.duration(320)`. New post scrolls to top after 50 ms, is highlighted for 1.4 seconds, then clears marker.
- `PostCard`: delayed `FadeInDown`, press-in/out scale, new-post landing spring, glow flash; uses `GlowCard`, `Avatar`, online `PulseDot`.
- `PostComposer`: button haptic, animated success border/glow and `PostSuccess` burst; error border pulse/shake; hides/fades controls during success; success flow waits 1.4 seconds before adding feed post.
- `TabPills`: animated selected indicator, active glow and sweep; Android-only BlurView halo; reduced-effects setting disables or simplifies animation.
- Responsive compact layout for width <420 or font scale >1.25; keyboard avoiding and keyboard dismiss mode differ by iOS/other.
- Known visual issue: live-looking tab names/copy coexist with demo-only behavior; card/feed text uses fixed green-black theme tokens.

### 11. Design status per section

- **NEW glow UI:** all main feed UI is built with `components/` glow system: `Screen`, `PostComposer`, `TabPills`, `PostCard`, `GlowCard`, `Avatar`, `PulseDot`, and `PressableScale`.
- **OLD UI:** native `Alert` category/sort/auth and share/permission dialogs are system UI; no legacy Mela feed component is rendered here.
- **MIXED:** modern glow surface plus system-native alerts/pickers/share sheet.

### 12. Bugs, risks and TODOs spotted

- Critical product mismatch: the visible feed and composer are hard-coded/local mock data, not connected to community persistence/sync or remote `community_posts`.
- “Latest / For you / Nearby” tabs do not filter/sort or navigate because `TabPills` is mounted without a callback/value; their visual state is isolated.
- “General” count label is fixed even when selected category changes; `TabPills` selection does not change it.
- GIF affordance uses image-only picker; no GIF-specific capability is present.
- “Post options” bookmark changes local bookmark state; no persistence, and it is separate from the card’s bookmark button.
- New post submit shows success after the delayed mock operation; no network upload/failure behavior is exercised.
- No post max length or content-level validation is exposed; composer can hold an arbitrarily long body.
- Comment modal list is not wrapped in a scroll view; long lists may exceed available vertical space. Modal has a max-length input, but no submit error/confirmation state.
- `onViewableItemsChanged` uses 10% visibility and is stored in a ref; no view analytics are sent.
- Category and sort alerts use native Alert APIs rather than custom styled dialogs; platform rendering differs.

## Cross-screen findings

- **Shared marketplace data:** Home, Explore, and Map read provider/category/location state from `useMarketplaceState` and `AppStateContext`; the repository uses Supabase `providers`, `categories`, `reviews`, `review_replies`, `services`, `provider_hours`, `public_provider_coordinates`, plus cached catalog snapshots.
- **Shared saved-provider behavior:** Home, Explore, Map, and Saved use `savedIds`/`toggleSaved`; Profile summarizes the same IDs. Online writes use `saved_items`; offline writes can be queued/local.
- **Shared navigation components:** Root tabs use `GlassTabBar`; Home and Explore navigate to the same ProviderDetail and Category/Explore routes; Map aliases exist as `MapTab` and Stack `Map`.
- **Shared visual systems:** legacy `src/components` marketplace cards/glass and newer root `components` glow community UI coexist. Saved uses the legacy Mela `src/components/community/PostCard.js`; CommunityTab uses the separate newer `components/PostCard.tsx`.
- **Duplicated provider-card presentation:** Home’s `HomeBusinessCard`, Explore’s `ExploreBusinessCard`, Saved’s `ProviderCardRow`, and Map’s `MapSelectedCard`/`MapNearbyCard` each render provider details independently; fields/badges/actions vary.
- **Different community implementations:** Main tab Community feed is a local demo (`screens/CommunityFeedScreen.tsx`); Stack Community is the separate Mela/Supabase surface (`src/screens/CommunityScreen.js`). This batch covers only the tab feed.
- **Activity/analytics:** Home records ad campaign exposure/clicks; Map/Explore/Saved/Profile/community feed do not record page-view counts in the inspected source.
