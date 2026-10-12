import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getNotificationsModule } from '../lib/notificationRuntime';
import { pushRegistrationErrorMessage } from '../lib/pushRegistrationErrors';
import { clearPushToken, registerPushToken } from '../lib/pushNotifications';
import { captureError } from '../lib/sentryUtils';
import { withTimeout } from '../lib/withTimeout';

export const PREFERENCES_KEY = '@chodhiq/communication-preferences';
const defaults = { push: true, vibration: true, email: true, marketing: false };

export function useCommunicationPreferences(userId) {
  const [preferences, setPreferencesState] = useState(defaults);
  const [ready, setReady] = useState(false);
  const [preferencesError, setPreferencesError] = useState('');
  const [preferencesSyncing, setPreferencesSyncing] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [retry, setRetry] = useState(0);
  const retryPreferencesSync = useCallback(() => setRetry((value) => value + 1), []);
  const syncQueue = useRef(Promise.resolve());

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
    let active = true;
    const sync = () => {
      // Serialize rapid toggles so an older request cannot overwrite the latest choice.
      syncQueue.current = syncQueue.current
        .catch(() => {})
        .then(async () => {
          if (!active) return;
          setPreferencesSyncing(true);
          const token = await withTimeout(
            () =>
              preferences.push
                ? registerPushToken(userId, preferences.vibration)
                : clearPushToken(userId),
            10000,
            'Notification settings sync timed out.',
            'PUSH_TIMEOUT',
          );
          if (active) {
            setPermissionDenied(false);
            setPreferencesError(
              preferences.push && !token && Platform.OS !== 'web'
                ? 'Saved on this device. Push notifications are not registered; check notification permissions in Settings.'
                : '',
            );
            setPreferencesSyncing(false);
          }
        })
        .catch((error) => {
          if (active) {
            setPermissionDenied(error?.code === 'PUSH_PERMISSION_DENIED');
            setPreferencesError(pushRegistrationErrorMessage(error));
            captureError(error, { operation: 'syncCommunicationPreferences' });
          }
        })
        .finally(() => {
          if (active) setPreferencesSyncing(false);
        });
    };
    sync();
    const native = preferences.push && Platform.OS !== 'web' ? getNotificationsModule() : null;
    const tokenListener = native?.addPushTokenListener(() => sync());
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    return () => {
      active = false;
      listener.remove();
      tokenListener?.remove();
    };
  }, [preferences.push, preferences.vibration, ready, userId, retry]);

  return {
    preferences,
    setPreferences,
    clearPreferences,
    preferencesReady: ready,
    preferencesError,
    preferencesSyncing,
    permissionDenied,
    retryPreferencesSync,
  };
}
