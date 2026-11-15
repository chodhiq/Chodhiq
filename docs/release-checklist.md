# ChodhiQ release checklist

Run this checklist on a real Android device and a real iPhone for every release.
Use a staging account and staging provider data, and record the OS version, app
build, device model, result, and any Sentry event ID for each failure. Start from
a fresh install for permission tests; reset permissions between the allow and
deny passes.

## Top 20 button smoke tests

| #   | Screen / button                          | Expected result                                                      |
| --- | ---------------------------------------- | -------------------------------------------------------------------- |
| 1   | Onboarding — Continue                    | Opens the app without a crash.                                       |
| 2   | Onboarding — Skip                        | Goes to Home.                                                        |
| 3   | Home — category                          | Opens results for that category.                                     |
| 4   | Home — Search                            | Opens search and returns matching businesses.                        |
| 5   | Search results — business card           | Opens the correct business profile.                                  |
| 6   | Business profile — Save                  | Saves the business or shows the sign-in prompt for a guest.          |
| 7   | Business profile — Request a Quote       | Opens quote request; submit validates and confirms.                  |
| 8   | Business profile — Request booking       | Opens booking; submit confirms an available slot.                    |
| 9   | Bookings — Cancel                        | Requests confirmation and cancels only after confirmation.           |
| 10  | Community — Create post                  | Opens the composer.                                                  |
| 11  | Community composer — Post                | Shows uploading, success, and the new post at the top.               |
| 12  | Community post — Like                    | Toggles the like state and count.                                    |
| 13  | Community post — Bookmark                | Toggles the saved state.                                             |
| 14  | Community post — Comment                 | Opens comments; submit displays the new comment.                     |
| 15  | Map — Go to current location             | Requests location access and centers the map when allowed.           |
| 16  | Map — Directions                         | Opens the system map app or reports that directions are unavailable. |
| 17  | Profile — Change picture                 | Opens the photo picker and updates the avatar after selection.       |
| 18  | Profile — Settings / notification switch | Persists the selected setting and reflects it on reopening.          |
| 19  | Privacy — Export my data                 | Starts the export and gives a success or actionable error message.   |
| 20  | Account — Sign out                       | Signs out and returns to the guest/onboarding state.                 |

For each button, tap once and rapidly tap again while its action is in flight.
Confirm there is one action, the loading state ends, errors show a friendly
message and a working **Retry** button, and the app remains responsive.
Also force-close/reopen after a successful booking and after changing a setting
to verify persisted state.

## Permission prompts (both platforms)

For each permission, perform the flow twice: first select **Allow**, reset the
permission, and repeat selecting **Deny**. Verify that denial leaves the app
usable and offers a clear way to continue or open system settings. If the OS
does not show a prompt (for example, a system photo picker grants only selected
items), verify the equivalent restricted-access behavior.

- **Location:** Map → Go to current location. Allow should center on the device;
  deny should keep manual map search usable and explain how to enable location.
- **Notifications:** Profile → notification settings / enable notifications.
  Allow should register for notifications; deny should preserve in-app use and
  show how to change the permission in system settings.
- **Photos:** Profile → Change picture, and Community → attach an image. Allow
  should permit choosing an image; deny/restricted access should not block the
  rest of either flow.
- **Camera:** Profile → Change picture or Community → attach image → Take photo.
  Allow should capture and preview a photo; deny should keep the photo-library
  option available and explain how to enable camera access.

## Reporting, offline, and navigation

- Cause a safe, deliberate test failure in staging (for example, submit an
  invalid test form). Verify the error toast and error button state, and confirm
  the Sentry event contains the button and screen breadcrumb without user data.
- Trigger a controlled render failure in a non-production test build. Verify
  the global error fallback is readable and **Try again** resets it.
- Disable network access, try Search, Save, and Post, then restore it. Verify a
  friendly error, retry behavior, and no stuck spinner or crash.
- On Android, use the hardware Back button on each modal, sheet, and composer.
  On iOS, use the corresponding close/back controls. Verify the app does not
  exit unexpectedly or leave an invisible overlay.
- Verify links, login/logout, account deletion cancellation, and support
  escalation before submitting either store build.

## Remote button kill switch

Apply the Supabase migration
`supabase/migrations/20261103120000_button_kill_switch_config.sql` before
releasing a build that uses the switch. Manage the `button_kill_switches` row
from the Supabase SQL editor or an authorized administrative channel; the app
clients are read-only. To disable a button by its `testID`:

```sql
update public.app_config
set config_value = jsonb_set(
  config_value,
  '{disabled_buttons}',
  coalesce(config_value->'disabled_buttons', '{}'::jsonb) ||
    '{"btn-post":{"disabled":true,"message":"Posting is temporarily unavailable."}}'::jsonb,
  true
),
updated_at = now()
where config_key = 'button_kill_switches';
```

Set that button's entry to `false` (or remove it from `disabled_buttons`) to
restore it. The app refreshes the config at startup and on the first button
press after its 60-second cache expires. Config read failures are logged and
fail open so an outage in config delivery does not disable the entire app.

## Before release

- [ ] Complete the 20-button and permission matrices above on Android and iOS.
- [ ] Configure `EXPO_PUBLIC_SENTRY_DSN` in the EAS preview/production
      environments. Configure `SENTRY_ORG`, `SENTRY_PROJECT`,
      `SENTRY_AUTH_TOKEN`, and `EXPO_PUBLIC_RELEASE_COMMIT` for release/source-map
      attribution; keep the auth token secret and out of source control.
- [ ] Review Sentry issues, release health, and staging alert routing.
- [ ] Verify the production Supabase project and required config migrations.
- [ ] Confirm the remote kill switch can disable and re-enable a staging button.
- [ ] Run type checks, lint, CI tests, Expo Doctor, and the preview EAS build.
- [ ] Record known failures, device/OS versions, build IDs, and release approval.
