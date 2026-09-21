const base = require('./app.base.json').expo;
const brandName = process.env.EXPO_PUBLIC_BRAND_NAME || base.name;
const googleAdsEnabled = process.env.EXPO_PUBLIC_ENABLE_GOOGLE_ADS === 'true';
const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || '';
const productionBuild =
  process.env.EAS_BUILD === 'true' && process.env.EAS_BUILD_PROFILE === 'production';
const googleTestPublisher = '3940256099942544';
const requiredAdIds = [
  ['GOOGLE_MOBILE_ADS_ANDROID_APP_ID', process.env.GOOGLE_MOBILE_ADS_ANDROID_APP_ID],
  ['GOOGLE_MOBILE_ADS_IOS_APP_ID', process.env.GOOGLE_MOBILE_ADS_IOS_APP_ID],
  [
    'EXPO_PUBLIC_GOOGLE_ADS_ANDROID_BANNER_ID',
    process.env.EXPO_PUBLIC_GOOGLE_ADS_ANDROID_BANNER_ID,
  ],
  ['EXPO_PUBLIC_GOOGLE_ADS_IOS_BANNER_ID', process.env.EXPO_PUBLIC_GOOGLE_ADS_IOS_BANNER_ID],
];
const requiredProductionValues = [
  ['EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL],
  ['EXPO_PUBLIC_SUPABASE_ANON_KEY', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY],
  ['EXPO_PUBLIC_EAS_PROJECT_ID', process.env.EXPO_PUBLIC_EAS_PROJECT_ID],
  ['EXPO_PUBLIC_SENTRY_DSN', process.env.EXPO_PUBLIC_SENTRY_DSN],
  ['EXPO_PUBLIC_RELEASE_COMMIT', process.env.EXPO_PUBLIC_RELEASE_COMMIT],
];

if (productionBuild) {
  const missing = requiredProductionValues.filter(([, value]) => !value).map(([name]) => name);
  if (missing.length) throw new Error(`Production builds require: ${missing.join(', ')}`);
  if (process.env.EXPO_PUBLIC_DEMO_MODE === 'true') {
    throw new Error('Production builds cannot enable EXPO_PUBLIC_DEMO_MODE.');
  }
}

if (productionBuild && googleAdsEnabled) {
  const invalid = requiredAdIds
    .filter(([, value]) => !value || value.includes(googleTestPublisher))
    .map(([name]) => name);
  if (invalid.length) {
    throw new Error(`Ad-enabled production builds require genuine IDs: ${invalid.join(', ')}`);
  }
}
const googleMobileAdsPlugin = [
  'react-native-google-mobile-ads',
  {
    androidAppId:
      process.env.GOOGLE_MOBILE_ADS_ANDROID_APP_ID || 'ca-app-pub-3940256099942544~3347511713',
    iosAppId: process.env.GOOGLE_MOBILE_ADS_IOS_APP_ID || 'ca-app-pub-3940256099942544~1458002511',
    delayAppMeasurementInit: true,
  },
];

const plugins = base.plugins.map((plugin) => {
  if (!Array.isArray(plugin)) return plugin;

  const [name, options = {}] = plugin;
  if (name === 'expo-location') {
    return [
      name,
      {
        ...options,
        locationWhenInUsePermission: `${brandName} uses your location to show nearby businesses and services.`,
      },
    ];
  }
  if (name === 'expo-image-picker') {
    return [
      name,
      {
        ...options,
        photosPermission: `${brandName} uses your photos when you choose images for your profile, reviews, or community posts.`,
        cameraPermission: `${brandName} uses your camera when you choose to take a photo for your profile, reviews, or community posts.`,
      },
    ];
  }
  return plugin;
});

module.exports = {
  ...base,
  owner: process.env.EXPO_OWNER || 'chodhiq26',
  name: brandName,
  slug: process.env.EXPO_APP_SLUG || base.slug,
  scheme: process.env.EXPO_APP_SCHEME || base.scheme,
  ios: {
    ...base.ios,
    bundleIdentifier: process.env.EXPO_IOS_BUNDLE_ID || base.ios.bundleIdentifier,
  },
  android: {
    ...base.android,
    package: process.env.EXPO_ANDROID_PACKAGE || base.android.package,
    config: {
      ...base.android?.config,
      ...(googleMapsApiKey ? { googleMaps: { apiKey: googleMapsApiKey } } : {}),
    },
  },
  plugins: [...plugins, 'expo-secure-store', '@sentry/react-native', googleMobileAdsPlugin],
  extra: {
    ...base.extra,
    eas: { projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID },
    googleMapsEnabled: Boolean(googleMapsApiKey),
    releaseCommit: process.env.EXPO_PUBLIC_RELEASE_COMMIT || 'development',
  },
};
