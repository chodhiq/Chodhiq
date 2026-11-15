# Booking-hours migration review

## Verdict: SAFE WITH CHANGES

The migration does allow valid future requests for providers with no
`provider_hours` rows, checks configured schedules against UK-local date/time,
and preserves status-only booking updates. It is not ready for an unconditional
production sign-off: DST gap/fold requests are not disambiguated, the new pgTAP
file omits several required cases, no matching rollback file exists, and the
identified live APK's source is not fully proven because its build included
uncommitted changes.

No database command was run. No file other than this review was created or
modified.

## 1. Rejection rules and raised errors

The new function replaces `public.validate_booking_request_datetime()`:

| Rule | Evidence | SQLSTATE and message |
|---|---|---|
| Date or time is null | Migration lines 13-16 | `23514` — `Choose both a booking date and time` |
| Requested date is before the current UK date, or same date with requested time at or before the current UK time | Lines 9, 17-21 | `23514` — `Choose a future date and time` |
| Provider has one or more hours rows, but no open row covers the requested weekday/time | Lines 23-31 and 33-67 | `PZH01` — `BOOKING_OUTSIDE_OPENING_HOURS` |

The opening-hours error is mapped to the inline text `Choose a time within the
business’s opening hours.` by the current worktree's
[bookingRepository.js](../src/data/bookingRepository.js#L57) and is retained by
[ProviderDetailScreen.js](../src/screens/ProviderDetailScreen.js#L83). That
mapping is not present at the reviewed Git build commit; see section 6.

## 2. Providers with no hours

**Allowed**, provided the date and time are non-null and future under the
existing UK-time rule. `has_opening_hours` is set from `exists(...)` at lines
23-27. If false, the function returns `new` at lines 29-31 before checking
schedule coverage. Thus a future `03:00` request is not rejected by this
database check when the provider has zero rows. The client late-night
confirmation remains a client behavior; this migration does not add a late
night rejection.

## 3. Closed days, outside times, and timezones

- **Closed day:** a row with `is_closed = true` cannot match because line 37
  requires `coalesce(hours.is_closed, false) = false`. If hours exist but none
  covers the requested day, the request is rejected at lines 64-67.
- **Before opening / at or after closing:** for a same-day schedule with
  `open_time < close_time`, opening is inclusive (`>=`) and closing is
  exclusive (`<`), lines 46-49. Thus the exact opening time is allowed and the
  exact closing time is rejected.
- **Overnight schedule:** the function accepts the late part of an overnight
  row on its configured day (lines 51-53) and the early part on the following
  weekday (lines 56-60).
- **Timezone:** `clock_timestamp() at time zone 'Europe/London'` establishes
  the current date/time in London at line 9. `bookings.requested_date` is
  `date`, `requested_time` is `time` without a timezone (schema migration
  `20260805192639_create_chodhiq_marketplace_schema.sql`, lines 119-120), and
  `provider_hours.open_time` / `close_time` are also `time` without a
  timezone (same schema migration, lines 62-68). The requested values are
  therefore interpreted as UK wall-clock values; the database cannot infer or
  convert a timezone supplied by a non-UK client.
- **Clock changes:** current time is converted using the IANA `Europe/London`
  zone, so the current UK offset follows seasonal clock changes. The requested
  date/time is never converted to an instant or validated against DST gaps/folds.
  A nonexistent spring-forward wall time can match configured hours and pass;
  a repeated fall-back wall time is treated as one wall-clock value and may be
  rejected by the date/time future comparison even when a second occurrence
  would be physically future. DST-transition booking times are not reliably
  disambiguated.

## 4. Trigger scope and booking updates

The new file replaces the trigger function but does **not** create or alter the
trigger. The preceding migration
`20261008150000_validate_booking_request_datetime.sql`, lines 25-28, creates
`validate_booking_request_datetime_trigger` as `BEFORE INSERT OR UPDATE OF
requested_date, requested_time`. With that trigger installed:

- Every insert is checked.
- An update statement that targets `requested_date` or `requested_time` is
  checked, even if it supplies the same values.
- A status-only confirmation or cancellation does not fire this trigger.
  Existing booking notification logic also uses a status-only update trigger
  (`20260815120000_bookings_quote_responses_and_consent.sql`, lines 50-56).

Provider booking updates are allowed by the existing RLS policy, and the
existing column grant allows `status`, `provider_message`, and `responded_at`
updates (`20260815120000_bookings_quote_responses_and_consent.sql`, lines
24-26). Those do not invoke the date/time trigger. The function itself has no
provider-owner/admin bypass: if a privileged update changes or targets
`requested_date` / `requested_time`, it must also pass this validation.

## 5. Execution role and other guards

This is a row trigger function, not a standalone RPC. It declares `returns
trigger` and has no `SECURITY DEFINER` clause (migration lines 3-7), so it runs
as the invoking database role (SECURITY INVOKER, the PostgreSQL default).
`REVOKE ALL ... FROM public, anon, authenticated` is at line 73; trigger
invocation is still performed by PostgreSQL as part of the table write.

The query of `public.provider_hours` is schema-qualified. Existing RLS has a
public-read policy (`20260805192639_create_chodhiq_marketplace_schema.sql`,
line 190), so the trigger can see provider hours under the normal policy.
If that policy or table grants change, an invoker trigger could see no rows and
mistakenly take the no-hours path; this assumption should be preserved or the
function should use a carefully secured definer arrangement.

The new function does not modify provider or verification triggers. Booking
actor-field protection is a separate `BEFORE UPDATE` trigger
(`20260817120000_secure_claims_bookings_and_push_consent.sql`, lines 114-136);
service/provider matching is another trigger, with its own SECURITY DEFINER
function (lines 137-150). These remain independent. Trigger ordering on
updates that target several protected columns should be included in DB tests.

## 6. Booking request from the identified live-build Git commit

The Android build record identifies Git commit
`f506df9496aef3b9948182b26ba64ee44af912dd`; it also states that the EAS build
included uncommitted workspace changes
([ANDROID_APK_BUILD_2026-10-12.md](../project-docs/ANDROID_APK_BUILD_2026-10-12.md#L46)).
Consequently, `git show` proves the source at that commit, not the exact source
packaged in the live APK.

At that commit, `ProviderDetailScreen.js` passes `providerId`, optional
`serviceId`, `requestedDate: bookingDate`, `requestedTime: bookingTime`, and
`notes` to `addBooking` (lines 236-245). `AppStateContext.js` forwards the
booking to `createBooking(session.user.id, booking)` (line 226), and
`bookingRepository.js` inserts `requested_date` and `requested_time` as
date/time strings without a timezone (lines 27-43).

At that Git commit, the client validates canonical date/time and rejects
past/current requests using UK-local date/time (`bookingValidation.js`, lines
9-40), but does not check provider hours. The screen displays the caught
`error.message` directly (ProviderDetailScreen.js, lines 253-254), and the
repository has no `PZH01` mapping. Therefore:

- For a provider with any `provider_hours` row, a future request on a closed or
  uncovered day, before opening, at/after closing, or outside the overnight
  interval would newly be rejected by the database with
  `BOOKING_OUTSIDE_OPENING_HOURS`; that raw message would be shown by the
  Git-commit client.
- A future request for a provider with no rows, including a late-night time,
  would pass this database trigger. That Git-commit UI does not prompt for the
  later late-night confirmation rule.
- Missing date/time and past/current requests are already rejected by the
  preserved server rules, in addition to the client validation.
- Exact packaged behavior remains unverified because the build record says
  uncommitted workspace changes were included and does not provide a complete
  per-file source hash manifest here.

## 7. Additivity, idempotency, and rollback

`CREATE OR REPLACE FUNCTION` and `REVOKE ALL` are repeatable, so applying this
file twice is idempotent **when the earlier trigger already exists**. The file
does not create that trigger; a clean migration history must first apply
`20261008150000_validate_booking_request_datetime.sql`. Applied alone to a
database without that trigger, it changes no booking enforcement.

No matching
`supabase/rollback/20261107120000_rollback.sql` exists. The rollback directory
contains only `20261106100000_rollback.sql`, which is for a different
migration. The request allowed creating only this review document, so no
rollback file was created. Suggested rollback SQL, to put in the matching
rollback file before production deployment:

```sql
begin;

create or replace function public.validate_booking_request_datetime()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  london_now timestamp without time zone := clock_timestamp() at time zone 'Europe/London';
begin
  if new.requested_date is null or new.requested_time is null then
    raise exception using errcode = '23514',
      message = 'Choose both a booking date and time';
  end if;
  if new.requested_date < london_now::date
     or (new.requested_date = london_now::date and new.requested_time <= london_now::time) then
    raise exception using errcode = '23514',
      message = 'Choose a future date and time';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_booking_request_datetime() from public, anon, authenticated;

commit;
```

This restores the function body from the previous migration while leaving its
pre-existing trigger attached.

## 8. pgTAP test coverage

The test declares `plan(4)` at line 3 and contains four assertions:

| Test assertion | Lines | Covered rule |
|---|---:|---|
| `lives_ok`: future request at 10:00 for a 10:00-17:00 provider | 29-38 | Inside hours accepted |
| `throws_ok`: request at 19:00 for that provider | 39-50 | Outside hours rejected with `PZH01` and stable message |
| `lives_ok`: 03:00 request for provider with no rows | 51-60 | No hours rows accepted |
| `throws_ok`: yesterday's request for provider without hours | 61-72 | Past date rejected with `23514` |

Missing tests:

- A provider with an explicit `is_closed = true` row/day.
- A provider owner update to booking status/provider message and an admin
  status update, proving permitted updates are not blocked.
- A past time on the current UK date (the existing test is a past date).
- Exact opening boundary accepted and exact closing boundary rejected.
- Overnight interval and next-day coverage.
- DST spring gap and autumn repeated-hour behavior, once policy for those
  ambiguous/nonexistent wall times is defined.
- Timezone-labelled/non-UK client input semantics.
- Regression assertion that status-only confirmation/cancellation does not
  invoke the date/time validator.
