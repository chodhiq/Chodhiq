# Backend crash investigation: Profile tab and provider reports

## Result

No live Supabase project or production service was contacted. The mocked response matrix did **not** reproduce an app-wide crash from ordinary nullable rows, orphaned booking/review providers, unknown enum strings, RLS-empty reads, report `42501`/401/`23505` responses, or a rejected report promise.

The one failing current-tree scenario deliberately places an `Error` object in `preferencesError`, then expands Profile's “Account & preferences” section. React reports:

```text
Error: Objects are not valid as a React child (found: [object Error]).
    at throwOnInvalidObjectTypeImpl (react-reconciler.development.js:3882:13)
    at throwOnInvalidObjectType (react-reconciler.development.js:3896:11)
    at reconcileChildFibersImpl (react-reconciler.development.js:4837:11)
    at ... reconcileChildren
    at ... beginWork
    at ... renderRootSync
    at AppText (src/components/AppText.js:16:35)
    at ... GlowCard (components/GlowCard.tsx:30:3)
    at ... ProfileScreen (src/screens/ProfileScreen.js:440:25)
```

The child expression is [ProfileScreen.js](../src/screens/ProfileScreen.js#L253-L255). The test injects the `Error` in [backend-matrix.test.tsx](../__tests__/repro/backend-matrix.test.tsx#L341), and the failing test is at line 471. The Profile boundary catches this render exception in the current tree; the test fails because React logged the error, not because this test showed the app-wide fallback. The production hook currently converts push-registration failures to user-facing strings in [useCommunicationPreferences.js](../src/hooks/useCommunicationPreferences.js#L80-L92), so this synthetic case does not establish that a real backend response supplies an `Error` object.

The same raw-`Error` scenario fails at `f506df9`. The baseline matrix run was **11 passed, 1 failed**, with the same React child error. Thus this is a pre-existing unsafe rendering path, not evidence that the recent glow/backend changes introduced the reported crashes. The requested hash is dated **2026-10-12**, not Nov 5; `ef70e4a` is a separate Nov 5 parentless snapshot. The comparison below is against the specifically requested `f506df9`.

### Test commands and results

Current worktree (Jest config otherwise only matches `__tests__/buttons`):

```powershell
npx jest --runInBand --roots __tests__/repro --testMatch "**/backend-matrix.test.tsx"
```

Result: **1 failed, 11 passed**. Failure: synthetic `Error` in `preferencesError` while Profile preferences are expanded. The report-sheet success test passed; report repository tests handled `42501`, expired authentication, duplicate response, and rejected network response without React rendering errors.

Baseline `f506df9` was tested in a detached worktree with the same backend fixtures and scenarios. Its older navigation labels, report-form selectors, and report fallback semantics required baseline-only test-harness adaptations. Result: **1 failed, 11 passed**. The report-sheet submit test passed after adapting to the baseline form; the one failure was again the deliberately injected raw `Error`. The baseline's report repository queues returned `42501`, expired-auth, and duplicate errors locally instead of rejecting them.

## 1. Calls on Profile startup/focus

Profile itself does not issue Supabase calls on focus. Mounting the app/provider and loading signed-in account state starts the calls below; a later foreground/reconnect can refresh notifications or the marketplace. The principal orchestration is in [AppStateContext.js](../src/context/AppStateContext.js#L173-L224).

| Trigger | Supabase surface and selected data | Mapping / state / failure behavior |
|---|---|---|
| App startup | `auth.getSession()` through `getOrCreateSession`; no table select. | Session/user ID gates account loading. Auth/session errors reach the startup catch; `authReady` is set in `finally`. See [supabase.js](../src/lib/supabase.js#L81-L85). |
| Startup button availability | `app_config.select('config_value').eq('config_key', 'button_kill_switches').maybeSingle()`. | Reads `config_value.disabled_buttons`, accepting only a non-array object; errors are caught and warned. No profile data is changed. See [remoteButtonConfig.js](../src/lib/remoteButtonConfig.js#L9-L32). |
| Marketplace refresh | `categories`: `id,name,slug,icon,color,sort_order`; `providers`: `id,business_name,description,base_city,base_postcode,service_areas,languages_spoken,years_experience,price_range,phone,whatsapp,website,google_place_id,cover_image_url,portfolio_urls,is_verified,data_verification_status,data_verified_at,avg_rating,review_count,created_at,categories(name,slug)`; `reviews`: `id,provider_id,user_id,rating,comment,created_at`; `review_replies`: `review_id,body`; `services`: `id,provider_id,name,description,starting_price,is_featured`; `provider_hours`: `provider_id,day_of_week,open_time,close_time,is_closed`. | Categories/providers are normalized; reviews are mapped and joined to replies in memory; services/hours are grouped by provider. If a required query fails or times out, the repository returns cached marketplace data and review/refresh error strings. See [providerRepository.js](../src/data/providerRepository.js#L64-L172). |
| Marketplace coordinates | RPC `public_provider_coordinates()`; result is indexed by `id` and merged into provider rows before mapping. | RPC failure is warned and markers are omitted; it does not fail marketplace data. The RPC is a public read, not a provider update. |
| Signed-in account load | `notifications.select('id,user_id,title,body,read_at,created_at,type,entity_type,entity_id')`, unread only, newest first, limit 100. `quote_requests.select('id,provider_id,message,status,response_message,responded_at,created_at')`. `profiles.select('full_name,phone,city,avatar_url,created_at')` by user ID, `maybeSingle()`. `saved_items.select('provider_id')` by user ID. See [accountRepository.js](../src/data/accountRepository.js#L21-L108). | Notifications and quotes default to `[]`; profile data falls back to local account/profile if missing or the profile query itself errors. An error from notifications, quotes, saved items, or bookings rejects the aggregate `loadAccount`; startup catches/logs it and skips applying the remote account result. |
| Bookings inside account load | `bookings.select('id,user_id,provider_id,service_id,requested_date,requested_time,status,notes,provider_message,created_at,providers(business_name),services(name)')`, filtered by user and ordered newest first. | `mapBooking` normalizes relation object/array/null shapes. Missing provider/service relations become `"Provider"` / `"General appointment"`; null time/notes/message/status get safe defaults. Unknown string statuses remain strings. See [bookingRepository.js](../src/data/bookingRepository.js#L19-L33) and [bookingMapper.js](../src/data/bookingMapper.js#L20-L41). |
| Saved-item import | Conditional `saved_items.upsert([{user_id,provider_id}, ...], {onConflict:'user_id,provider_id', ignoreDuplicates:true})` when legacy local saves have not been imported. | Import errors are captured/warned; local IDs remain in the merged saved state and can retry later. Duplicate conflicts are explicitly ignored. |
| Access context | `providers.select('id,business_name,is_verified,verification_status').eq('owner_id', user.id)`. | Returns `ownedProviders: data || []` and admin claim from auth metadata. This is a read; a query error is caught by the AppState startup/reload catch. See [accountRepository.js](../src/data/accountRepository.js#L195-L206). |
| Notification hook | Repeats the same unread-notification select as the account query. Also subscribes to Realtime changes on `public.notifications` filtered by user ID; refreshes on foreground and every 60 seconds. | `formatNotification` maps dates only when non-null, stores unknown `type` strings, and preserves title/body. Hook refresh promise rejections are explicitly swallowed. See [useNotificationState.js](../src/features/notifications/useNotificationState.js#L10-L47). |
| Push-preference synchronization | On native platforms after local preferences load: Expo permission/token APIs, then `profiles.update({expo_push_token,push_vibration_enabled,push_channel_id,push_token_updated_at}).eq('id', userId).select('id').maybeSingle()`. If push is disabled it updates `profiles` with `expo_push_token:null,push_token_updated_at`. | Supabase errors are thrown by the push helper, then converted to a string by `pushRegistrationErrorMessage`; a retry hint is set. Web/no native notification module returns without a Supabase call. See [pushNotifications.js](../src/lib/pushNotifications.js#L25-L103) and [useCommunicationPreferences.js](../src/hooks/useCommunicationPreferences.js#L47-L99). |
| Pending offline writes | `flushPendingOperations()` may write only eligible queued operations: `quote_requests.insert`; `saved_items.upsert/delete`; `profiles.upsert`; `provider_reports.insert`; `reviews.insert(...).select('id').single()`; community tables and `publish_queued_community_post` RPC if those operation types are queued. | No provider/verification write is introduced by this generic retry. Returned errors are stored as pending, auth-required, or failed according to `syncPolicy`; the Profile effect catches a rejected flush. See [syncRepository.js](../src/data/syncRepository.js#L18-L74) and [syncPolicy.js](../src/data/syncPolicy.js#L1-L54). |

`loadAccount` also uses local database reads and merges pending/local data. Profile avatar URI and preferred-area coordinates are read from AsyncStorage; there is no avatar storage upload, location geocoding, or Supabase location lookup on Profile focus. Choosing an avatar saves its URI locally; `updateProfile` sends only `id,full_name,phone,city` to `profiles`. Choosing a location is a separate user action and also updates `profiles`, with errors warned after local state is updated. See [AppStateContext.js](../src/context/AppStateContext.js#L486-L546) and [accountSync.js](../src/data/accountSync.js#L1-L8).

The standalone location picker uses Expo location/geocoding; provider postcode geocoding and `set_provider_coordinates` are not part of Profile focus. No `functions.invoke` or Supabase Storage call runs on these Profile mount/focus paths. Account deletion's `delete-account` function is a separate explicit action.

## 2. Provider report submit

`ProviderDetailScreen.submitReport` passes the provider ID, the fixed reason `incorrect_information`, and trimmed details to `reportProvider`. The AppState wrapper requires a signed-in session and calls `runAuthResumableWrite`; `createProviderReport` validates the report and inserts:

```js
{ reporter_id: userId, provider_id: providerId, reason, details }
```

`reporter_id` **is included** and is the signed-in user ID. The insert policy requires `auth.uid() = reporter_id` in [20260806071808_mvp_phase1.sql](../supabase/migrations/20260806071808_mvp_phase1.sql#L3-L18). The table supplies its ID, status, and timestamp defaults.

Current outcome handling:

- Insert success returns `{status:'sent'}`. AppState emits a toast; the screen closes the sheet, clears details, and shows “Report submitted”.
- Retryable returned Supabase errors are queued locally and saved as a local report; result is `{status:'pending'}`. The screen closes/clears and shows the pending/offline alert.
- Auth-required errors are saved as auth-resumable drafts, trigger the sign-in prompt, and are rethrown. The screen catch leaves the sheet/details in place and alerts with the error message.
- Permanent returned errors, including `42501` and `23505`, are rethrown and shown in the screen's “Could not submit report” alert. They are not written into React state.
- A rejected promise (e.g. network timeout) is not converted into a returned result by `createProviderReport`; it bubbles through the wrapper and is caught by the screen, which alerts and leaves the form open.

See [accountRepository.js](../src/data/accountRepository.js#L313-L330), [AppStateContext.js](../src/context/AppStateContext.js#L644-L660), and [ProviderDetailScreen.js](../src/screens/ProviderDetailScreen.js#L385-L405). The report submit path does not write `providers` or `verification_requests`.

## 3. Provider/verification guards and other write paths

The migration [20261106100000_protect_verification_and_provider_fields.sql](../supabase/migrations/20261106100000_protect_verification_and_provider_fields.sql#L1-L104) protects:

- `verification_requests`: non-reviewers cannot change status/reviewer/decision metadata or ownership columns on update (`42501`). Inserts are normalized to `draft`/`pending` and reviewer metadata is cleared.
- `providers`: non-admin updates cannot change identity, claim/verification/reputation/publication/import/promotion trust fields (`42501`); ordinary business-detail fields are not in that protected list.

No Profile focus, account load, push sync, or report submit directly writes either protected table. The other relevant flows are separate claim/business actions in [claimRepository.js](../src/data/claimRepository.js#L1-L154):

- Claim lookup reads `providers.base_postcode`, then calls `claim_imported_provider` RPC.
- Provider creation directly inserts allowed business fields into `providers`, then may geocode and call `set_provider_coordinates`.
- Verification draft creation reads and may insert a `verification_requests` row with `status:'draft'`; document upload uses Storage plus `verification_documents`; submission calls `submit_provider_verification` RPC.
- `set_provider_coordinates` is an RPC used only after claim/provider creation. A failure is caught by those flows and returned as a location-warning string; it does not update the Profile UI.
- Profile name/phone/location updates target `profiles` only.

## 4. Backend values and rendering risks

| Value | Mapping/use | Result for expected backend nulls or unknown strings |
|---|---|---|
| Profile row | `mapProfile` chooses name/location fallbacks, empty phone/email, local-or-remote avatar, and formatted member year. Profile guards the profile object and the initials name, but renders name/email/memberSince directly in `Text`; avatar URI is passed to `Image`. Location is stored in profile state but is not rendered in the Profile card. | Nulls map safely; null avatar shows initials. Unexpected object-valued `full_name`, `email`, or `memberSince` could be an invalid child, and a malformed avatar URI could make Image fail, but the database columns are text/date and no fixture reproduced either. |
| `preferencesError` | Rendered directly as the hint child at [ProfileScreen.js](../src/screens/ProfileScreen.js#L253-L255). | A raw `Error`/object throws “Objects are not valid as a React child.” The actual push hook currently maps errors to strings. The matrix's injected Error is synthetic; the Profile boundary catches it in the current tree. |
| Saved IDs / reviews / bookings | Profile checks each array with `Array.isArray`; counts lengths. Booking count filters only `pending`/`confirmed`. | Null/non-array state becomes an empty list. Zero is passed as a number prop to `Stat`, not used as a truthy conditional child. |
| Owner access | Profile checks `access?.ownedProviders` with `Array.isArray`; an empty list shows the “Join as a provider” card. | Null/empty RLS result is safe. Provider names/verification status are not rendered by the Profile card. |
| Quote requests | `formatQuote` resolves provider by stringified ID or uses `"Provider"`; unknown string status is capitalized and displayed; created date defaults to `"Today"` and response values to empty/null. | Missing provider and null dates are safe. A truthy non-string status could fail at `.slice`; database status is text. Quote screen maps its array and displays provider/message/status. |
| Notifications | `formatNotification` guards null date to empty string; unknown types fall through to the generic Bell icon. Title/body are forwarded to `Text`; `read_at` becomes a boolean. | Expected null optional fields and unknown type strings are safe. A non-string object in title/body would be unsafe; not represented by the schema fixture. |
| Bookings | `mapBooking` handles provider/service relation object, array, or null; fallback names and empty time/notes/message; null status defaults to `pending`. Booking screen renders provider/service/status strings and uses `formatBookingDateTime`. | Missing provider becomes `"Provider"`; null/invalid date/time formats as `''`; unknown string status is displayed but is not treated as upcoming/cancellable. `requestedDate` is not normalized, but the formatter guards invalid/null values. |
| Reviews | `mapReview` converts null comment to `''`, null date to `"Recently"`, and null reply to null. The marketplace review list retains `providerId`; provider relation is not dereferenced by the mapper. | An orphan review does not break Profile (only count) or `ReviewCard`; an unavailable provider detail cannot render a provider-associated review, but no crash occurred. |
| Provider directory | `mapProvider` uses relation fallbacks, null-safe numeric conversions, and empty arrays for service areas/languages/portfolio. | Null optional provider fields are mapped safely. Required-query failures fall back to local marketplace cache. |

`quoteRequests` is present in AppState but is not rendered by `ProfileScreen`; `QuoteRequestsScreen` maps the array and renders provider name, message, response, date, and status. Notifications are similarly rendered in `NotificationsScreen`; unknown types use a generic Bell icon, while title/body/time are direct `Text` children. Bookings are rendered in `BookingsScreen`; reviews are filtered by `providerId` and rendered by `ReviewCard`. The Profile screen itself only shows counts for these collections.

The matrix uses proper row arrays and realistic nulls. A Supabase `data` value that is a non-array object instead of the documented row array could still break unguarded `.map` calls in repository mappers; that malformed transport shape was not returned by Supabase or reproduced by the fixtures.

## 5. Failure-mode disposition

| Failure/input | Current behavior on these paths |
|---|---|
| RLS returns an empty row set | Account lists become empty arrays; profile `maybeSingle()` becomes null and falls back to local/default profile. UI displays zero/empty states, not a render exception. |
| 401 / expired token | Account query errors reject `loadAccount`; startup catches/logs and continues to `authReady` without applying that remote account result. Marketplace falls back to cache. Notification refresh catches. Push registration maps the error to a retry string. Report write is saved as an auth-resumable draft and the screen alerts that sign-in is required. |
| `42501` | Marketplace query failure falls back to cache (coordinate RPC failure only warns). Account query failure is caught at startup. Push profile update becomes a retry string. Report insert is classified permanent, rethrown, and shown in an alert. A claim-coordinate RPC failure is converted to a location warning in its separate flow. |
| `23505` duplicate | Saved-item import ignores duplicates; booking/review repositories map their known duplicate conditions to user messages; report insert is classified permanent and shown in its alert. No report-screen render error was reproduced. |
| Network timeout / rejected promise | Marketplace has an 8-second abort and cached fallback. Push sync has a timeout and error-to-string mapping. Notification refresh catches. Report query rejection reaches the report screen catch/alert. A rejected queued flush is caught by the marketplace/AppState caller. |
| Null optional columns | Mappers described above supply empty/default values; booking formatter and date helpers return an empty string on null/invalid values. |
| Missing selected column/schema mismatch | PostgREST returns an error, not a partial row. Marketplace returns cache plus error text; profile-query-only failure uses local profile; other `loadAccount` query failures are caught at startup. Report insert schema errors are classified; a permanent 4xx is shown by the report alert. |
| Rejected promise inside an effect | Startup IIFE ends with `.catch(...).finally(...)`; marketplace effect catches refresh errors; notification refresh/subscription/AppState handlers catch; preference sync chain catches and maps the error; remote button refresh catches. No uncaught rejected effect was found on the two requested paths. |

## 6. Ranked hypotheses (not a confirmed production cause)

1. **Shared glow/Reanimated work or animation lifecycle issue — strongest timing fit, unproven.** Both symptoms begin after rendering/interacting with new glow surfaces, while the backend matrix's normal rows and returned-error cases pass. `GlowCard` uses repeating Reanimated work and `GlowButton` has a success-state reset timer at 1.2 seconds; the report submit button opts into action feedback. Jest uses the Reanimated mock and cannot validate the affected native/worklet execution. This also fits the Profile error boundary not catching an error originating outside the Profile screen render. Against: no device/native stack was provided, and the test matrix did not reproduce a worklet failure. **Smallest proposal:** on an affected build, disable the glow/action-feedback animation on only the Profile card and report submit control, then retry; if the crash stops, isolate/fix the failing animation before restoring effects. No database or RLS change is indicated by current evidence.

2. **An exception outside the Profile screen boundary during focus/state propagation.** The boundary wraps the Profile screen component, not the custom tab bar or AppState provider. A tab-bar, parent/provider, or asynchronous native callback exception would reach the app-level boundary. The stated “card begins to draw, then crash” timing is consistent with a post-focus commit or animation. Against: startup/account/notification/preferences rejections are caught, and the mocked navigator scenarios did not crash.

3. **Raw non-string data rendered as a React child.** The exact `Error`-as-child path is confirmed by the synthetic test at `ProfileScreen.js:255`; malformed profile fields could also bypass their intended string schema. Against: the production preference hook returns a string for every current push error, the backend fixtures passed, and the same raw-error weakness exists at `f506df9`. The current Profile boundary catches this synthetic render exception, unlike the reported app-wide fallback, so this is not a confirmed explanation.

The report path's known error handling does not support a backend permission error as the direct crash cause: it includes `reporter_id`, handles returned `42501`/401/`23505`, catches rejected promises at the screen, and changes no provider/verification state. A device Sentry/RedBox stack from the two actual crashes is needed to distinguish the leading UI hypotheses.
