import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

export const ADVERTISING_CONSENT_KEY = '@chodhiq/advertising-consent';

export function useAdvertisingConsent() {
  const [allowed, setAllowedState] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ADVERTISING_CONSENT_KEY)
      .then((value) => setAllowedState(value === 'granted'))
      .finally(() => setLoaded(true));
  }, []);

  const setAllowed = useCallback(async (next) => {
    await AsyncStorage.setItem(ADVERTISING_CONSENT_KEY, next ? 'granted' : 'denied');
    setAllowedState(next);
  }, []);

  return { allowed, loaded, setAllowed };
}
