import React from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { features, googleAdsConfig } from '../config/features';
import { useAdvertisingConsent } from '../hooks/useAdvertisingConsent';

export default function GoogleBanner() {
  const { allowed, loaded } = useAdvertisingConsent();
  // Expo Go does not bundle react-native-google-mobile-ads. Load it only in a
  // development or production build that contains the native module.
  if (Constants.appOwnership === 'expo' || !features.googleAds || !loaded || !allowed) return null;
  const { BannerAd, BannerAdSize, TestIds } = require('react-native-google-mobile-ads');
  const configuredId = Platform.select({
    android: googleAdsConfig.androidBannerUnitId,
    ios: googleAdsConfig.iosBannerUnitId,
  });
  const unitId = __DEV__ ? TestIds.ADAPTIVE_BANNER : configuredId;
  if (!unitId) return null;
  return (
    <BannerAd
      unitId={unitId}
      size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
      requestOptions={{ requestNonPersonalizedAdsOnly: true }}
    />
  );
}
