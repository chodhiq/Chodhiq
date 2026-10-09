export type ConfirmationLink =
  | { kind: 'token'; tokenHash: string }
  | { kind: 'confirmed'; appUrl: string }
  | { kind: 'invalid' };

export function readConfirmationLink(url: string): ConfirmationLink {
  const parsed = new URL(url);
  const params = parsed.searchParams;
  const fragment = new URLSearchParams(parsed.hash.slice(1));
  if (
    params.has('error') ||
    params.has('error_description') ||
    fragment.has('error') ||
    fragment.has('error_description')
  )
    return { kind: 'invalid' };
  const tokenHash = params.get('token_hash');
  if (tokenHash && params.get('type') === 'email') return { kind: 'token', tokenHash };
  // Supabase has already verified the email before issuing a PKCE code. The
  // native app holds its verifier; this browser must not try to exchange it.
  const code = params.get('code');
  if (code)
    return {
      kind: 'confirmed',
      appUrl: `chodhiq://auth/callback?code=${encodeURIComponent(code)}`,
    };
  return { kind: 'invalid' };
}

export const confirmedAppUrl = 'chodhiq://auth/callback?confirmed=1';

export function confirmationErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error && 'code' in error ? error.code : '';
  if (code === 'otp_expired' || code === 'validation_failed')
    return 'This link has expired or has already been used. Try signing in to ChodhiQ. If your email still needs confirmation, request a new email from the sign-in screen.';
  return 'Confirmation could not complete. Check your connection and try again. You can also return to ChodhiQ and request a new confirmation email.';
}
