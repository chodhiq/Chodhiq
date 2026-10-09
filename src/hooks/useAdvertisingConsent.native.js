import { useCallback, useEffect, useState } from 'react';
import Constants from 'expo-constants';
import { features } from '../config/features';

const isExpoGo = Constants.appOwnership === 'expo';

function getAdsConsent() {
  if (isExpoGo || !features.googleAds) return null;
  return require('react-native-google-mobile-ads').AdsConsent;
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
      const previous = await AdsConsent.getConsentInfo().catch(() => null);
      setAllowed(Boolean(previous?.canRequestAds));
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
      setError(consentError?.message || 'Google privacy choices are temporarily unavailable.');
    }
  }, []);

  return { allowed, loaded, error, manageChoices, refresh };
}
