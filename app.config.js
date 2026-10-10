const {
  androidPushConfigPath,
  validateAndroidGoogleOAuthConfig,
} = require('./scripts/android-push-config.cjs');
const base = require('./app.base.json').expo;
const googleServicesFile = androidPushConfigPath();
const brandName = process.env.EXPO_PUBLIC_BRAND_NAME || base.name;
const googleAdsEnabled = process.env.EXPO_PUBLIC_ENABLE_GOOGLE_ADS === 'true';
const googleMapsEnabled = process.env.EXPO_PUBLIC_ENABLE_GOOGLE_MAPS === 'true';
const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || '';
const easProjectId =
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID || '599ec186-c5e2-4228-b7f4-17ea866c409b';
const productionBuild =
  process.env.EAS_BUILD === 'true' &&
  (process.env.EAS_BUILD_PROFILE === 'beta' ||
    process.env.EAS_BUILD_PROFILE === 'production' ||
    process.env.EAS_BUILD_PROFILE === 'production-apk');
const internalBetaBuild =
  process.env.EAS_BUILD === 'true' && process.env.EAS_BUILD_PROFILE === 'beta-apk';
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
  ['EXPO_PUBLIC_RELEASE_COMMIT', process.env.EXPO_PUBLIC_RELEASE_COMMIT],
  ['EXPO_PUBLIC_TERMS_URL', process.env.EXPO_PUBLIC_TERMS_URL],
  ['EXPO_PUBLIC_PRIVACY_URL', process.env.EXPO_PUBLIC_PRIVACY_URL],
  ['EXPO_PUBLIC_DELETE_ACCOUNT_URL', process.env.EXPO_PUBLIC_DELETE_ACCOUNT_URL],
];
const validLegalUrl = (value) => {
  try {
    const url = new URL(value);
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
};
const sentryConfigured = [
  process.env.EXPO_PUBLIC_SENTRY_DSN,
  process.env.SENTRY_ORG,
  process.env.SENTRY_PROJECT,
  process.env.SENTRY_AUTH_TOKEN,
].every(Boolean);

if (googleMapsEnabled && !googleMapsApiKey) {
  throw new Error('Google Maps cannot be enabled without GOOGLE_MAPS_API_KEY.');
}

if (productionBuild || internalBetaBuild) {
  // Direct-install beta testing uses the live backend, but unpublished legal
  // drafts must not be presented as approved policies. Store profiles continue
  // to require all three published legal URLs.
  const requiredValues = internalBetaBuild
    ? requiredProductionValues.filter(
        ([name]) =>
          ![
            'EXPO_PUBLIC_TERMS_URL',
            'EXPO_PUBLIC_PRIVACY_URL',
            'EXPO_PUBLIC_DELETE_ACCOUNT_URL',
          ].includes(name),
      )
    : requiredProductionValues;
  const missing = requiredValues.filter(([, value]) => !value).map(([name]) => name);
  const buildLabel = internalBetaBuild ? 'Internal beta' : 'Production';
  if (missing.length) throw new Error(`${buildLabel} builds require: ${missing.join(', ')}`);
  const invalidLegal = (productionBuild ? requiredProductionValues : [])
    .filter(
      ([name, value]) =>
        name.endsWith('_URL') && name !== 'EXPO_PUBLIC_SUPABASE_URL' && !validLegalUrl(value),
    )
    .map(([name]) => name);
  if (invalidLegal.length) {
    throw new Error(
      `Production builds require published HTTPS legal pages: ${invalidLegal.join(', ')}`,
    );
  }
  if (process.env.EXPO_PUBLIC_SUPABASE_URL !== 'https://gfjhvsajwjrrlylgrkhf.supabase.co') {
    throw new Error('Production builds must target ChodhiQ Production Supabase.');
  }
  if (process.env.EXPO_PUBLIC_DEMO_MODE === 'true') {
    throw new Error('Production builds cannot enable EXPO_PUBLIC_DEMO_MODE.');
  }
}

if (
  (productionBuild || internalBetaBuild) &&
  process.env.EAS_BUILD_PLATFORM !== 'ios' &&
  !googleServicesFile
) {
  throw new Error(
    'Android beta/release push setup is incomplete. Configure the GOOGLE_SERVICES_JSON file variable in EAS and FCM v1 credentials before building.',
  );
}

if (
  (productionBuild || internalBetaBuild) &&
  process.env.EAS_BUILD_PLATFORM !== 'ios' &&
  googleServicesFile
) {
  validateAndroidGoogleOAuthConfig(
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_SHA1,
  );
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
  ...(easProjectId
    ? {
        updates: { url: `https://u.expo.dev/${easProjectId}` },
        runtimeVersion: { policy: 'appVersion' },
      }
    : {}),
  ios: {
    ...base.ios,
    bundleIdentifier: process.env.EXPO_IOS_BUNDLE_ID || base.ios.bundleIdentifier,
  },
  android: {
    ...base.android,
    ...(googleServicesFile ? { googleServicesFile } : {}),
    package: process.env.EXPO_ANDROID_PACKAGE || base.android.package,
    config: {
      ...base.android?.config,
      ...(googleMapsEnabled ? { googleMaps: { apiKey: googleMapsApiKey } } : {}),
    },
  },
  plugins: [
    ...plugins,
    '@react-native-community/datetimepicker',
    'expo-secure-store',
    '@react-native-google-signin/google-signin',
    ...(sentryConfigured
      ? [
          [
            '@sentry/react-native',
            {
              organization: process.env.SENTRY_ORG,
              project: process.env.SENTRY_PROJECT,
              url: process.env.SENTRY_URL || 'https://sentry.io/',
            },
          ],
        ]
      : []),
    // The native Mobile Ads package registers an Android ContentProvider even
    // when ad delivery is disabled. Keep a valid (test) app ID in the manifest
    // so Android can start; feature flags still prevent ads from being shown.
    googleMobileAdsPlugin,
  ],
  extra: {
    ...base.extra,
    eas: { projectId: easProjectId },
    googleMapsEnabled,
    releaseCommit: process.env.EXPO_PUBLIC_RELEASE_COMMIT || 'development',
  },
};
