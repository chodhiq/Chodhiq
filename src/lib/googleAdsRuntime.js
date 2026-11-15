import Constants from 'expo-constants';

let warnedUnavailable = false;

export function warnGoogleAdsUnavailable(error) {
  if (warnedUnavailable) return;
  warnedUnavailable = true;
  console.warn('Google Mobile Ads is unavailable in this runtime; ads are disabled.', error);
}

export function isGoogleAdsNativeModuleError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return (
    message.includes('rnogooglemobileads') ||
    message.includes('rngooglemobileads') ||
    message.includes('native module') ||
    message.includes('not registered') ||
    message.includes('native view manager')
  );
}

export function loadGoogleMobileAds() {
  if (Constants.appOwnership === 'expo') {
    warnGoogleAdsUnavailable();
    return null;
  }
  try {
    return require('react-native-google-mobile-ads');
  } catch (error) {
    warnGoogleAdsUnavailable(error);
    return null;
  }
}
