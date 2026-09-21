// @ts-check
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';
import { getNotificationsModule } from './notificationRuntime';
import { brand } from '../config/brand';

/** @param {string} userId */
export async function registerPushToken(userId) {
  if (!supabase || !userId || Platform.OS === 'web') return null;
  const Notifications = getNotificationsModule();
  if (!Notifications) return null;
  if (Platform.OS === 'android')
    await Notifications.setNotificationChannelAsync('default', {
      name: `${brand.name} updates`,
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  const current = await Notifications.getPermissionsAsync();
  const permission =
    current.status === 'granted' ? current : await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') return null;
  const projectId =
    Constants.easConfig?.projectId ||
    Constants.expoConfig?.extra?.eas?.projectId ||
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (!projectId) {
    console.warn('Push registration skipped: EAS project ID is not configured.');
    return null;
  }
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const { error } = await supabase
    .from('profiles')
    .update({ expo_push_token: token, push_token_updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
  return token;
}

/** @param {string} userId */
export async function clearPushToken(userId) {
  if (!supabase || !userId) return;
  const { error } = await supabase
    .from('profiles')
    .update({ expo_push_token: null, push_token_updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}
