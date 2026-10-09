export async function withAuthTimeout(work, timeoutMs = 15000) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve(work),
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('The request timed out. Check your connection and try again.')),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export function authErrorMessage(
  error,
  fallback = 'Authentication is temporarily unavailable. Please try again.',
) {
  const raw = typeof error?.message === 'string' ? error.message.trim() : '';
  const comparable = `${raw} ${error?.code || ''} ${error?.status || ''}`.toLowerCase();

  if (/invalid login credentials|invalid_credentials/.test(comparable))
    return 'The email address or password is incorrect.';
  if (/email not confirmed|email_not_confirmed/.test(comparable))
    return 'Confirm your email address before signing in.';
  if (/too many requests|rate.?limit|over_email_send_rate_limit/.test(comparable))
    return 'Too many attempts. Please wait a few minutes and try again.';
  if (/expired|invalid.*(reset|link|token)|otp_expired/.test(comparable))
    return 'This secure link has expired. Request a new email and use the latest link.';
  if (/timed out|network request failed|failed to fetch|offline/.test(comparable))
    return 'Check your internet connection and try again.';

  // Supabase transport failures can contain a serialized response with headers,
  // cookies and internal request metadata. Never surface that payload in the UI.
  const unsafe =
    !raw ||
    raw.length > 240 ||
    raw.startsWith('{') ||
    /(?:set-cookie|__cf_bm|cf-ray|sb-request-id|bodyblob|headers|unexpected_failure)/i.test(raw);
  return unsafe ? fallback : raw;
}
