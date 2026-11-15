# Place listings release notes

## Apply order

1. Export CSV backups of `public.providers`, `public.quote_requests`, and `public.bookings` before changing production.
2. Apply `supabase/migrations/20261111090000_add_place_listing_support.sql` in the Supabase SQL editor. Check the app before continuing.
3. Apply `supabase/migrations/20261111091000_block_quotes_and_bookings_for_places.sql` in the Supabase SQL editor. Check quote and booking requests against a normal provider.

Do not use `supabase db push` or `supabase db reset` for this release. The migration history may not represent the live database.

## Read-only verification after migration 1

Confirm the two columns exist, have the expected defaults, and are not nullable:

```sql
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'providers'
  and column_name in ('is_listed', 'listing_type')
order by column_name;
```

Confirm the one intended provider policy now has the filter:

```sql
select policyname, roles, cmd, qual
from pg_policies
where schemaname = 'public'
  and tablename = 'providers'
  and policyname = 'Public reads providers';
```

As an anon client (for example, from the app using its anon key), this query should return no rows for unpublished places:

```sql
select id, business_name
from public.providers
where listing_type = 'place'
  and is_listed = false;
```

The SQL editor may execute as a privileged role and bypass RLS; use an anon client for this visibility check.

## Read-only verification after migration 2

Confirm the two rejection triggers exist:

```sql
select event_object_table, trigger_name, event_manipulation, action_timing
from information_schema.triggers
where trigger_schema = 'public'
  and trigger_name in (
    'reject_place_quote_request_trigger',
    'reject_place_booking_trigger'
  )
order by event_object_table, trigger_name, event_manipulation;
```

The functions read `quote_requests.provider_id` and `bookings.provider_id`. Then use the manual checks below; do not insert test rows into production place data.

## Manual checks

- Existing provider rows remain visible in the app.
- A signed-in non-admin cannot insert a place, publish a place, or change `listing_type`.
- A quote request against a place is rejected.
- A booking request against a place is rejected.
- A place with `is_listed = false` is invisible to an anon client.
- Quote and booking requests against a normal provider still work.

## Not included in this release

- The FSA importer.
- A decision on consent policy.
- Reapplying the place UI changes on the real app branch.
- A claim flow for places.

## Risks and operational notes

- The production `admin_permission_guard` policy is `FOR ALL`, but its permissive/restrictive mode has not been verified. If it is permissive, PostgreSQL may OR its condition with the public SELECT policy for authenticated users, which could expose unpublished places to signed-in non-owners. Do not assume the authenticated visibility test passes until that policy mode is checked; the migration intentionally does not change it.
- Owners can change `is_listed` on their own normal provider under the existing `Owners update their provider` policy. That lets an owner hide or relist their own normal provider. The place publication trigger prevents owner publication of place rows. Product acceptance of owner-controlled normal provider visibility should be confirmed.
- The migrations change production RLS and add triggers while real beta users are active. Keep the provider/quote/booking CSV exports available for recovery and check the app between migrations.
- The rollback refuses to proceed if any provider has `listing_type = 'place'`; place rows must be handled before running it.
