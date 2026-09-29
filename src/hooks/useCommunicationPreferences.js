import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearPushToken, registerPushToken } from '../lib/pushNotifications';

export const PREFERENCES_KEY = '@chodhiq/communication-preferences';
const defaults = { push: true, email: true, marketing: false };

export function useCommunicationPreferences(userId) {
  const [preferences, setPreferencesState] = useState(defaults);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(PREFERENCES_KEY)
      .then((stored) => {
        if (stored) setPreferencesState((current) => ({ ...current, ...JSON.parse(stored) }));
      })
      .catch((error) => console.warn('Could not load communication preferences.', error.message))
      .finally(() => setReady(true));
  }, []);

  const setPreferences = useCallback((nextValue) => {
    setPreferencesState((current) => {
      const next = typeof nextValue === 'function' ? nextValue(current) : nextValue;
      AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(next)).catch((error) =>
        console.warn('Could not save communication preferences.', error.message),
      );
      return next;
    });
  }, []);

  const clearPreferences = useCallback(async () => {
    setPreferencesState(defaults);
    await AsyncStorage.removeItem(PREFERENCES_KEY);
  }, []);

  useEffect(() => {
    if (!ready || !userId) return undefined;
    const sync = preferences.push ? registerPushToken : clearPushToken;
    sync(userId).catch((error) => console.warn('Push preference sync failed.', error.message));
    return undefined;
  }, [preferences.push, ready, userId]);

  return { preferences, setPreferences, clearPreferences, preferencesReady: ready };
}
