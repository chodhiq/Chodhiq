import { GoogleSignin } from '@react-native-google-signin/google-signin';

// OAuth client IDs are public identifiers. This web client ID is also configured
// in Production Supabase Auth and is used only as the audience for Google's ID token.
const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  '1070319512646-u438pverfgaanh0sahul7nmqjt2aih16.apps.googleusercontent.com';

let configured = false;

export async function getNativeGoogleIdToken() {
  if (!configured) {
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
