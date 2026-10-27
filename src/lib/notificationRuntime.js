import Constants from 'expo-constants';

export const isExpoGo =
  Constants.executionEnvironment === 'storeClient' || Constants.appOwnership === 'expo';

export function getNotificationsModule() {
  if (isExpoGo || typeof require !== 'function') return null;

  try {
    const Notifications = require('expo-notifications');
    if (!Notifications || typeof Notifications.setNotificationHandler !== 'function') return null;
    return Notifications;
  } catch (error) {
    if (__DEV__) {
      console.warn('Native notifications unavailable in this runtime:', error?.message || error);
    }
    return null;
  }
}

export function configureNotificationHandler() {
  const Notifications = getNotificationsModule();
  if (!Notifications) return false;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  return true;
}
