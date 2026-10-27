# Staging migration and booking verification

Run from the repository root in a normal terminal with the Supabase CLI installed and linked to the **staging** project. Check the linked project reference before any push. Do not run against Production.

```powershell
supabase link --project-ref <STAGING_PROJECT_REF>
supabase migration list
supabase db push
supabase migration list
```

Confirm these local migrations appear as applied after the push:

- `20261011120000_community_actor_names_in_notifications.sql` — preserves actor identity in community notification content.
- `20261014120000_guard_confirmed_booking_slots.sql` — prevents two confirmed bookings for the same provider/date/time with trigger and partial unique index.
- `20261014130000_complete_comment_identity_booking_availability.sql` — exposes privacy-limited community member profiles and confirmed booking times.

The app calls `get_confirmed_booking_slots` with `target_provider` (UUID) and `target_date` (date). The SQL returns rows shaped as `{ requested_time: time without time zone }`; the repository maps those to `HH:MM` strings.

## SQL checks

Run in the staging SQL editor after migration. Replace placeholders with IDs from disposable staging fixtures. The function can be called as an authenticated user or anon; it returns only confirmed times.

```sql
select *
from public.get_confirmed_booking_slots('<STAGING_PROVIDER_UUID>'::uuid, '<YYYY-MM-DD>'::date);
```

Check the conflict guard within a transaction using two disposable bookings that share a provider/date/time. The first insert should succeed; the second should fail with SQLSTATE `23P01` and message `This time is already booked. Choose a different date or time.` Roll back the first fixture afterward. Supply valid fixture user/provider IDs and any required columns for the deployed schema.

```sql
begin;
insert into public.bookings (user_id, provider_id, requested_date, requested_time, status)
values ('<STAGING_USER_UUID>'::uuid, '<STAGING_PROVIDER_UUID>'::uuid, '<YYYY-MM-DD>'::date, '<HH:MM>'::time, 'confirmed');

-- Run separately after the first insert. Expected to be rejected by the guard:
insert into public.bookings (user_id, provider_id, requested_date, requested_time, status)
values ('<SECOND_STAGING_USER_UUID>'::uuid, '<STAGING_PROVIDER_UUID>'::uuid, '<YYYY-MM-DD>'::date, '<HH:MM>'::time, 'confirmed');

rollback;
```

If the second statement errors, issue `rollback;` in the SQL editor to clear the fixture transaction. If schema-required fields differ, inspect `\d public.bookings` or the table definition and add only required test values.

Then follow [the staging smoke-test checklist](../project-docs/STAGING_SMOKE_TEST_CHECKLIST.md) for customer, provider and admin flows.
