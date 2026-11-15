import { Alert, Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

export async function openExternalUrl(
  url,
  { title = 'Could not open link', fallbackMessage = 'Try again or open the link manually.' } = {},
) {
  try {
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
      return true;
    }

    if (/^https?:\/\//i.test(url)) {
      await WebBrowser.openBrowserAsync(url);
      return true;
    }

    throw new Error('No app is available to open this link.');
  } catch (error) {
    console.warn('Unable to open external link.', error);
    Alert.alert(title, fallbackMessage);
    return false;
  }
}
