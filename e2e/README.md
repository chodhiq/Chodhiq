# Maestro end-to-end tests

The YAML flows in this directory exercise the customer Expo app (`com.chodhiq.app`).
Install the [Maestro CLI](https://maestro.mobile.dev/getting-started/installing-maestro)
and build/install the app on the target emulator or simulator before running them.
Android runs require an Android emulator or device; iOS simulator runs require macOS
and Xcode.

## Run

Connect one target device and run:

```powershell
npm run e2e
```

Pass Maestro options through npm to select a device and provide the isolated test
account. The account must be confirmed and usable in the configured Supabase test
project. Do not put credentials in a flow or commit them.

```powershell
npm run e2e -- --device <device-id> --env MAESTRO_EMAIL=<test-email> --env MAESTRO_PASSWORD=<test-password> --env MAESTRO_NAME=<test-name> --env MAESTRO_PROVIDER_QUERY=<search-term> --env MAESTRO_PROVIDER_NAME=<provider-name> --env MAESTRO_CATEGORY_ID=<category-id> --env MAESTRO_SERVICE_NAME=<service-name> --env MAESTRO_POST_TEXT=<unique-post-text> --env MAESTRO_COMMENT_TEXT=<comment-text>
```

`03-account-lifecycle.yaml` signs up `MAESTRO_EMAIL`; use a new address for each
full run of that flow and configure the isolated Supabase test project to auto-confirm
test email addresses. The remaining authenticated flows sign in with that account.
Set `MAESTRO_SERVICE_NAME` to a bookable service on the chosen provider.

The test project needs a published provider in the selected category, with a valid
WhatsApp/phone contact, map coordinates near the simulator's current location, and
an available `09:00` booking time for tomorrow. Use a disposable account and isolated
backend; the delete-account flow deliberately stops at the confirmation dialog.
The forgot-password action currently shows an inline confirmation rather than
navigating to a separate screen, so the lifecycle flow verifies that confirmation.

Run the iOS-compatible flows on a simulator with:

```powershell
npm run e2e -- --device <ios-simulator-id> --exclude-tags android-only --env MAESTRO_EMAIL=<test-email> --env MAESTRO_PASSWORD=<test-password>
```

`offline-network` and `android-back-navigation` are Android-only because Maestro's
airplane-mode control and Android hardware-back key are not available on iOS.
The profile image-picker dismissal is included in the Android back-navigation flow.
Restore network connectivity if an interrupted Android run leaves airplane mode on.

Maestro records failed-step screenshots in its test-run artifacts. Keep those
artifacts with the run output when investigating a failure. The flows use only
test IDs and visible/accessibility labels; the required IDs are added to existing
controls without changing app behavior.
