import Constants from 'expo-constants';

export const isExpoGo =
  Constants.executionEnvironment === 'storeClient' || Constants.appOwnership === 'expo';

export function getNotificationsModule() {
  if (isExpoGo) return null;
  return require('expo-notifications');
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
