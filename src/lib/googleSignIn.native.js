import { GoogleSignin } from '@react-native-google-signin/google-signin';

// OAuth client IDs are public identifiers and must match the Firebase Android project.
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

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  await GoogleSignin.signOut();
  const response = await GoogleSignin.signIn();
  if (response.type === 'cancelled') throw new Error('Google sign-in was cancelled.');
  if (!response.data?.idToken) {
    throw new Error('Google did not return an identity token. Please try again.');
  }
  return response.data.idToken;
}

export async function signOutNativeGoogleAccount() {
  await GoogleSignin.signOut();
}
