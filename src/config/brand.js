export const brand = Object.freeze({
  name: process.env.EXPO_PUBLIC_BRAND_NAME || 'ChodhiQ',
  shortName: process.env.EXPO_PUBLIC_BRAND_SHORT_NAME || 'ChodhiQ',
  supportEmail: process.env.EXPO_PUBLIC_SUPPORT_EMAIL || 'support@chodhiq.app',
  privacyEmail: process.env.EXPO_PUBLIC_PRIVACY_EMAIL || 'privacy@chodhiq.app',
  businessEmail: process.env.EXPO_PUBLIC_BUSINESS_EMAIL || 'business@chodhiq.app',
});

export const brandMark = brand.shortName.trim().charAt(0).toUpperCase() || 'S';
