import { useCallback, useEffect, useState } from 'react';
import { features } from '../config/features';
import {
  isGoogleAdsNativeModuleError,
  loadGoogleMobileAds,
  warnGoogleAdsUnavailable,
} from '../lib/googleAdsRuntime';

function getAdsConsent() {
  if (!features.googleAds) return null;
  try {
    return loadGoogleMobileAds()?.AdsConsent ?? null;
  } catch (error) {
    warnGoogleAdsUnavailable(error);
    return null;
  }
}

export function useAdvertisingConsent() {
  const [allowed, setAllowed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setError('');
    const AdsConsent = getAdsConsent();
    if (!AdsConsent) {
      setAllowed(false);
      setLoaded(true);
      return;
    }
    try {
      const consentInfo = await AdsConsent.gatherConsent();
      setAllowed(Boolean(consentInfo.canRequestAds));
    } catch (consentError) {
      try {
        const previous = await AdsConsent.getConsentInfo();
        setAllowed(Boolean(previous?.canRequestAds));
      } catch (infoError) {
        if (isGoogleAdsNativeModuleError(infoError)) warnGoogleAdsUnavailable(infoError);
        setAllowed(false);
      }
      if (isGoogleAdsNativeModuleError(consentError)) warnGoogleAdsUnavailable(consentError);
      setError(consentError?.message || 'Google privacy choices are temporarily unavailable.');
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const manageChoices = useCallback(async () => {
    setError('');
    const AdsConsent = getAdsConsent();
    if (!AdsConsent) return;
    try {
      const consentInfo = await AdsConsent.showPrivacyOptionsForm();
      setAllowed(Boolean(consentInfo.canRequestAds));
    } catch (consentError) {
      if (isGoogleAdsNativeModuleError(consentError)) warnGoogleAdsUnavailable(consentError);
      setError(consentError?.message || 'Google privacy choices are temporarily unavailable.');
    }
  }, []);

  return { allowed, loaded, error, manageChoices, refresh };
}
