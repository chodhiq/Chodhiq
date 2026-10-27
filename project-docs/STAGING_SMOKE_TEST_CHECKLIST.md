# ChodhiQ beta smoke-test checklist

Email confirmation is intentionally off for the beta. Google sign-in is the main customer path. Use disposable staging accounts and never execute this checklist against Production.

## Customer

- [ ] Sign up with email/password; confirm the session is immediate while email confirmation is disabled.
- [ ] Sign in with Google and verify profile creation/session persistence.
- [ ] Browse and save a provider; exercise location denied and manual-area paths.
- [ ] Request a booking with a test provider; verify pending state.
- [ ] Attempt the same confirmed slot from a second customer; verify conflict is rejected.
- [ ] Cancel an eligible booking; verify provider/customer views update.
- [ ] Leave a review after the supported completed booking flow.
- [ ] Receive push notification in foreground, background, and killed states; check opt-out.
- [ ] Export account data, then delete a disposable account in-app and verify related data/files are removed.

## Provider

- [ ] Sign in as a provider; verify only owned provider data is visible.
- [ ] View customer booking request; confirm it and verify the time disappears from availability.
- [ ] Attempt to confirm a competing booking for the same slot; verify conflict error.
- [ ] Cancel/decline and verify availability returns where supported.
- [ ] Update profile/services and receive booking notification.
- [ ] Verify provider account deletion behavior and ownership of any retained records.

## Admin

- [ ] Sign in as an authorized admin; verify unauthorized accounts are denied.
- [ ] Inspect reports and perform a test moderation decision with an audit record.
- [ ] Verify admin actions and notification delivery in staging.

## Email-dependent flows currently limited

- Password reset and resend-confirmation depend on email delivery. With confirmation off, signup confirmation is unnecessary; password reset may be unreliable because custom SMTP is deferred. Test Google sign-in as the primary beta route.
- Re-test when confirmation is restored: signup confirmation, resend, expired/used link, callback redirect on Android and web, cross-device confirmation, password reset, and email-change confirmation.
