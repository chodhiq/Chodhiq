# Place UI rebase notes

Read-only inspection of the real app under `../chodhiq` found these locations:

- **Provider detail Quote and Book buttons:** `src/screens/ProviderDetailScreen.js:897-937`. The quote button is at lines 902-912; booking at 915-933.
- **Quote sheet:** `src/screens/ProviderDetailScreen.js:990-1055` (`BottomSheetModal` using `quoteSheetRef`).
- **Booking modal:** `src/screens/ProviderDetailScreen.js:1115-1417` (`Modal` controlled by `bookingOpen`).
- **Provider selector:** `src/screens/CommunityScreen.js:360-372` derives `matchingProviders` and `providerOptions`; lines 1142-1155 render the `ProviderOption` list. This selector is for associating a community post with a provider; there is no provider picker inside the detail screen booking modal.
- **Provider row mapping and query:** `src/data/providerRepository.js:9-52` maps provider rows; lines 76-87 select marketplace columns. The current select and mapper do not include `listing_type`.

Minimal rebase on the real app branch:

1. Add `listing_type` to the provider select at `providerRepository.js:76-87` and map it to a stable app property such as `listingType` at lines 9-15.
2. Filter place rows out of `matchingProviders` or `providerOptions` in `CommunityScreen.js:360-372` so the provider selector cannot attach a place to a new community post.
3. In `ProviderDetailScreen.js`, render the sticky action bar, quote sheet, and booking modal only when `provider.listingType !== 'place'`. Also guard the button handlers as a defensive measure. Keep the database triggers as the actual write protection.

The UI change was not applied in either worktree.
