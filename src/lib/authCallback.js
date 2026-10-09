export const EMAIL_CONFIRMATION_URL =
  'https://chodhiq-business-dashboard.chodhiq.workers.dev/auth/confirm';

// Browser OAuth and navigation can receive the same link at the same time.
// Exchange its single-use code once, and discard the result on sign-out.
export function createAuthCodeExchange(auth) {
  let currentCode;
  let currentWork;
  return {
    reset() {
      currentCode = undefined;
      currentWork = undefined;
    },
    exchangeCodeForSession(code) {
      if (currentCode === code && currentWork) return currentWork;
      currentCode = code;
      const work = Promise.resolve().then(() => auth.exchangeCodeForSession(code));
      currentWork = work;
      work.then(
        (result) => {
          if (result.error && currentWork === work) this.reset();
        },
        () => {
          if (currentWork === work) this.reset();
        },
      );
      return work;
    },
  };
}

// A confirmation received on another device cannot exchange the original
// device's PKCE verifier. Email/password sign-in remains available in that case.
export async function completeAuthCallback(auth, params = {}) {
  if (params.error || params.error_description) {
    throw new Error(
      'This confirmation link is invalid or has expired. Request a new confirmation email.',
    );
  }
  if (params.confirmed === '1') return null;
  if (!params.code || typeof params.code !== 'string') {
    throw new Error(
      'This sign-in link is incomplete. Return to ChodhiQ and sign in, or request a new confirmation email.',
    );
  }
  const { data, error } = await auth.exchangeCodeForSession(params.code);
  if (error) {
    throw new Error(
      'This link could not sign you in on this device. If you confirmed your email, sign in with your email and password. Otherwise, request a new confirmation email.',
    );
  }
  if (!data?.session)
    throw new Error('Sign-in did not complete. Please sign in with your email and password.');
  return data.session;
}

// Reject malformed encodings before third-party navigation/query decoders run.
export function isSafeAppLink(url) {
  if (typeof url !== 'string' || url.length > 8192) return false;
  try {
    decodeURI(url);
    return true;
  } catch {
    return false;
  }
}
