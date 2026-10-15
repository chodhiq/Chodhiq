import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Use the Web OAuth client from the same Google Cloud project as the Android client.
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

let configured = false;

export async function getNativeGoogleIdToken() {
  if (!configured) {
    if (!GOOGLE_WEB_CLIENT_ID) {
      throw new Error(
        'Google sign-in is not configured for this app build. EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is missing.',
      );
    }
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
    });
    configured = true;
  }

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // Clear Google's saved app account so each sign-in asks the user to choose.
    await GoogleSignin.signOut();
    const response = await GoogleSignin.signIn();
    if (response.type === 'cancelled') throw new Error('Google sign-in was cancelled.');
    if (!response.data?.idToken) {
      throw new Error('Google did not return an identity token. Please try again.');
    }
    return response.data.idToken;
  } catch (error) {
    if (error?.code === 'SIGN_IN_CANCELLED') {
      throw new Error('Google sign-in was cancelled.');
    }
    if (['DEVELOPER_ERROR', '10'].includes(String(error?.code))) {
      throw new Error(
        'Google sign-in setup is incomplete for this Android build. In Google Cloud, add an Android OAuth client for com.chodhiq.app using this APK signing SHA-1, and set the matching Web OAuth client ID in EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID before rebuilding.',
      );
    }
    if (error?.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
      throw new Error('Update Google Play services on this device, then try again.');
    }
    throw error;
  }
}

export async function signOutNativeGoogleAccount() {
  await GoogleSignin.signOut();
}
