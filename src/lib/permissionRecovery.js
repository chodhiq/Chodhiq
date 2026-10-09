import { Linking, Platform } from 'react-native';
import { AppAlert as Alert } from '../components/AppDialog';

export function openPermissionSettings() {
  if (Platform.OS === 'web') return;
  Linking.openSettings().catch(() =>
    Alert.alert('Settings unavailable', 'Open ChodhiQ permissions in your device settings.'),
  );
}

export function showPermissionRecovery(title, message) {
  Alert.alert(title, `${message} You can continue without it.`, [
    { text: 'Continue' },
    ...(Platform.OS === 'web' ? [] : [{ text: 'Open settings', onPress: openPermissionSettings }]),
  ]);
}
