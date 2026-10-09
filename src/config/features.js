const enabled = (value, fallback = false) =>
  value == null || String(value).trim() === ''
    ? fallback
    : String(value).trim().toLowerCase() === 'true';

export const features = Object.freeze({
  payments: enabled(process.env.EXPO_PUBLIC_ENABLE_PAYMENTS, false),
  customAds: enabled(process.env.EXPO_PUBLIC_ENABLE_CUSTOM_ADS, true),
  googleAds: enabled(process.env.EXPO_PUBLIC_ENABLE_GOOGLE_ADS, false),
});

export const googleAdsConfig = Object.freeze({
  androidBannerUnitId: process.env.EXPO_PUBLIC_GOOGLE_ADS_ANDROID_BANNER_ID || '',
  iosBannerUnitId: process.env.EXPO_PUBLIC_GOOGLE_ADS_IOS_BANNER_ID || '',
});
