// @ts-check
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';
import { getNotificationsModule } from './notificationRuntime';
import { brand } from '../config/brand';

/** @param {string} code @param {string} message */
function pushError(code, message) {
  return Object.assign(new Error(message), { code });
}
/** @template T @param {PromiseLike<T>} promise @returns {Promise<T>} */
async function registrationDeadline(promise) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(pushError('PUSH_TIMEOUT', 'Push registration timed out')),
          20000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/** @param {string} userId @param {boolean} vibration */
export async function registerPushToken(userId, vibration = true) {
  if (!supabase || !userId || Platform.OS === 'web') return null;
  const Notifications = getNotificationsModule();
  if (!Notifications)
    throw pushError('PUSH_NATIVE_UNAVAILABLE', 'Native notifications unavailable');
  if (Platform.OS === 'android') {
    // Android channel vibration cannot be changed after creation; use distinct channels.
    for (const enabled of [true, false]) {
      await Notifications.setNotificationChannelAsync(
        enabled ? 'updates-vibrate-v1' : 'updates-no-vibration-v1',
        {
          name: `${brand.name} updates${enabled ? '' : ' without vibration'}`,
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
          enableVibrate: enabled,
          ...(enabled ? { vibrationPattern: [0, 250] } : {}),
        },
      );
    }
  }
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
  if (!permission.granted) {
    await clearPushToken(userId);
    throw pushError('PUSH_PERMISSION_DENIED', 'Notification permission denied');
  }
  const projectId =
    Constants.easConfig?.projectId ||
    Constants.expoConfig?.extra?.eas?.projectId ||
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (!projectId) {
    throw pushError('PUSH_PROJECT_MISSING', 'Expo project missing');
  }
  let token;
  try {
    token = (await registrationDeadline(Notifications.getExpoPushTokenAsync({ projectId }))).data;
  } catch (/** @type {any} */ error) {
    if (/firebase|default firebaseapp|fcm|sender.?id/i.test(String(error?.message || '')))
      throw pushError('PUSH_CLIENT_CONFIG_MISSING', 'Android push client configuration missing');
    throw error;
  }
  const { data, error } = await registrationDeadline(
    supabase
      .from('profiles')
      .update({
        expo_push_token: token,
        push_vibration_enabled: vibration,
        push_channel_id: vibration ? 'updates-vibrate-v1' : 'updates-no-vibration-v1',
        push_token_updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('id')
      .maybeSingle(),
  );
  if (error) throw error;
  if (!data) throw pushError('PUSH_PROFILE_MISSING', 'Profile update matched no account');
  return token;
}

/** @param {string} userId */
export async function clearPushToken(userId) {
  if (!supabase || !userId) return;
  const { error } = await registrationDeadline(
    supabase
      .from('profiles')
      .update({ expo_push_token: null, push_token_updated_at: new Date().toISOString() })
      .eq('id', userId),
  );
  if (error) throw error;
}
