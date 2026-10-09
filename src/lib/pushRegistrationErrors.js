export function pushRegistrationErrorMessage(error) {
  const code = error?.code;
  if (code === 'PUSH_NATIVE_UNAVAILABLE')
    return 'Push notifications require an installed ChodhiQ build.';
  if (code === 'PUSH_PERMISSION_DENIED')
    return 'Phone notifications are disabled. Enable them in your phone settings.';
  if (code === 'PUSH_PROJECT_MISSING' || code === 'PUSH_CLIENT_CONFIG_MISSING')
    return 'This build is missing Android push configuration. Install the next configured beta build.';
  if (code === 'PUSH_PROFILE_MISSING')
    return 'Your account profile is not ready for notifications. Sign in again and retry.';
  if (code === 'PUSH_TIMEOUT')
    return 'Notification registration timed out. Check your connection and tap Retry.';
  return 'Saved on this device. Notification sync failed; check your connection and tap Retry.';
}
