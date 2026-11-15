import React, { Component } from 'react';
import { Platform } from 'react-native';
import { features, googleAdsConfig } from '../config/features';
import { useAdvertisingConsent } from '../hooks/useAdvertisingConsent';
import { loadGoogleMobileAds, warnGoogleAdsUnavailable } from '../lib/googleAdsRuntime';

export default function GoogleBanner() {
  const { allowed, loaded } = useAdvertisingConsent();
  if (!features.googleAds || !loaded || !allowed) return null;
  const banner = getBannerConfig();
  if (!banner) return null;
  const { BannerAd, BannerAdSize, unitId } = banner;
  return (
    <GoogleBannerBoundary>
      <BannerAd
        unitId={unitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      />
    </GoogleBannerBoundary>
  );
}

function getBannerConfig() {
  try {
    const adsModule = loadGoogleMobileAds();
    if (!adsModule) return null;
    const { BannerAd, BannerAdSize, TestIds } = adsModule;
    if (!BannerAd || !BannerAdSize || !TestIds) {
      warnGoogleAdsUnavailable(new Error('Google Mobile Ads banner components are unavailable.'));
      return null;
    }
    const configuredId = Platform.select({
      android: googleAdsConfig.androidBannerUnitId,
      ios: googleAdsConfig.iosBannerUnitId,
    });
    const unitId = __DEV__ ? TestIds.ADAPTIVE_BANNER : configuredId;
    if (!unitId) return null;
    return { BannerAd, BannerAdSize, unitId };
  } catch (error) {
    warnGoogleAdsUnavailable(error);
    return null;
  }
}

class GoogleBannerBoundary extends Component {
  state = { unavailable: false };

  static getDerivedStateFromError() {
    return { unavailable: true };
  }

  componentDidCatch(error) {
    warnGoogleAdsUnavailable(error);
  }

  render() {
    return this.state.unavailable ? null : this.props.children;
  }
}
