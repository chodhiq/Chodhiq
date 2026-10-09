export function validPublicLegalUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !['localhost', 'example.com', 'example.org', 'example.net'].includes(url.hostname) &&
      !url.hostname.endsWith('.test')
    );
  } catch {
    return false;
  }
}

const termsUrl = process.env.EXPO_PUBLIC_TERMS_URL || '';
const privacyUrl = process.env.EXPO_PUBLIC_PRIVACY_URL || '';
const deletionUrl = process.env.EXPO_PUBLIC_DELETE_ACCOUNT_URL || '';

export const legalLinks = Object.freeze({
  terms: validPublicLegalUrl(termsUrl) ? termsUrl : '',
  privacy: validPublicLegalUrl(privacyUrl) ? privacyUrl : '',
  deletion: validPublicLegalUrl(deletionUrl) ? deletionUrl : '',
});

export const publishedLegalLinksReady = Boolean(
  legalLinks.terms && legalLinks.privacy && legalLinks.deletion,
);
