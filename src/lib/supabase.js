import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Linking, Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { withAuthTimeout } from './authOperations';
import {
  completeAuthCallback,
  isSafeAppLink,
  createAuthCodeExchange,
  EMAIL_CONFIRMATION_URL,
} from './authCallback';

WebBrowser.maybeCompleteAuthSession();

const AUTH_CALLBACK_URL = 'chodhiq://auth/callback';
const RESET_LINK = 'chodhiq://auth/reset';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Expo Go can temporarily expose AsyncStorage before its native module is ready.
// Keep Supabase usable (including public marketplace reads) with an in-memory
// fallback instead of allowing auth storage initialization to fail the app load.
const memoryStorage = new Map();
const resilientStorage = {
  async getItem(key) {
    try {
      return Platform.OS === 'web'
        ? await AsyncStorage.getItem(key)
        : await SecureStore.getItemAsync(key);
    } catch {
      return memoryStorage.get(key) ?? null;
    }
  },
  async setItem(key, value) {
    memoryStorage.set(key, value);
    try {
      if (Platform.OS === 'web') await AsyncStorage.setItem(key, value);
      else
        await SecureStore.setItemAsync(key, value, {
          keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
        });
    } catch {
      /* session lasts for this app run */
    }
  },
  async removeItem(key) {
    memoryStorage.delete(key);
    try {
      if (Platform.OS === 'web') await AsyncStorage.removeItem(key);
      else await SecureStore.deleteItemAsync(key);
    } catch {
      /* already removed from fallback */
    }
  },
};

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: resilientStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    })
  : null;

const authCodeExchange = supabase ? createAuthCodeExchange(supabase.auth) : null;
supabase?.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') authCodeExchange.reset();
});

export async function getOrCreateSession() {
  if (!supabase) return null;
  const { data: existing } = await withAuthTimeout(supabase.auth.getSession());
  return existing.session || null;
}

export async function signInWithEmail(email, password) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await withAuthTimeout(
    supabase.auth.signInWithPassword({ email, password }),
  );
  if (error) throw error;
  return data.session;
}

export async function signUpWithEmail(email, password, fullName) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const emailRedirectTo =
    Platform.OS === 'web' ? makeRedirectUri({ path: 'auth/callback' }) : EMAIL_CONFIRMATION_URL;
  const { data, error } = await withAuthTimeout(
    supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName }, emailRedirectTo },
    }),
  );
  if (error) throw error;
  return data.session;
}

export async function resendEmailConfirmation(email) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await withAuthTimeout(
    supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo:
          Platform.OS === 'web'
            ? makeRedirectUri({ path: 'auth/callback' })
            : EMAIL_CONFIRMATION_URL,
      },
    }),
  );
  if (error) throw error;
}

export async function finishEmailConfirmation(params) {
  if (!supabase) throw new Error('Supabase is not configured.');
  return withAuthTimeout(completeAuthCallback(authCodeExchange, params));
}

export async function requestPasswordReset(email) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const redirectTo = Platform.OS === 'web' ? makeRedirectUri({ path: 'auth/reset' }) : RESET_LINK;
  const { error } = await withAuthTimeout(
    supabase.auth.resetPasswordForEmail(email, { redirectTo }),
  );
  if (error) throw error;
  return redirectTo;
}

export async function preparePasswordRecovery(code) {
  if (!supabase) throw new Error('Supabase is not configured.');
  if (!code) {
    const { data } = await withAuthTimeout(supabase.auth.getSession());
    if (!data.session) throw new Error('This password reset link is incomplete or has expired.');
    return data.session;
  }
  const { data, error } = await withAuthTimeout(supabase.auth.exchangeCodeForSession(code));
  if (error) throw error;
  return data.session;
}

export async function updatePassword(password) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await withAuthTimeout(supabase.auth.updateUser({ password }));
  if (error) throw error;
  await supabase.auth.signOut();
}

export async function signInWithOAuth(provider) {
  if (!supabase) throw new Error('Supabase is not configured.');
  if (provider === 'google' && Platform.OS === 'android') {
    // Do not silently fall back to browser OAuth if native account selection
    // fails or is cancelled.
    const { getNativeGoogleIdToken } = await import('./googleSignIn');
    const token = await getNativeGoogleIdToken();
    const { data, error } = await withAuthTimeout(
      supabase.auth.signInWithIdToken({ provider: 'google', token }),
    );
    if (error) throw error;
    return data.session;
  }
  // Keep the native redirect identical to the URL registered in Supabase. Expo can
  // otherwise produce a triple-slash URI that Android opens but Supabase rejects.
  const redirectTo =
    Platform.OS === 'web' ? makeRedirectUri({ path: 'auth/callback' }) : AUTH_CALLBACK_URL;
  const { data, error } = await withAuthTimeout(
    supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams:
          provider === 'google' ? { access_type: 'offline', prompt: 'select_account' } : undefined,
      },
    }),
  );
  if (error) throw error;
  if (!data?.url) throw new Error('The sign-in provider did not return an authorization URL.');
  let resolveCallback;
  const callbackPromise = new Promise((resolve) => {
    resolveCallback = resolve;
  });
  const subscription = Linking.addEventListener('url', ({ url }) => {
    if (isSafeAppLink(url) && url?.startsWith(redirectTo)) resolveCallback(url);
  });
  let callbackUrl;
  try {
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === 'success') callbackUrl = result.url;
    else if (result.type === 'cancel') throw new Error('Google sign-in was cancelled.');
    else {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl?.startsWith(redirectTo)) callbackUrl = initialUrl;
      else {
        callbackUrl = await Promise.race([
          callbackPromise,
          new Promise((resolve) => setTimeout(() => resolve(null), 5000)),
        ]);
      }
    }
  } finally {
    subscription.remove();
  }
  if (!callbackUrl)
    throw new Error('Google could not return to ChodhiQ. Please close the browser and try again.');
  if (!isSafeAppLink(callbackUrl))
    throw new Error('The sign-in link is invalid. Please try again.');
  const code = new URL(callbackUrl).searchParams.get('code');
  const callbackError = new URL(callbackUrl).searchParams.get('error_description');
  if (callbackError) throw new Error(callbackError);
  if (!code)
    throw new Error(
      `No authorization code was returned. Add this URL to Supabase Auth → URL Configuration → Redirect URLs: ${redirectTo}`,
    );
  const { data: sessionData, error: exchangeError } = await withAuthTimeout(
    authCodeExchange.exchangeCodeForSession(code),
  );
  if (exchangeError) throw exchangeError;
  return sessionData.session;
}

export async function signOutGoogleAccount() {
  if (Platform.OS !== 'android') return;
  const { signOutNativeGoogleAccount } = await import('./googleSignIn');
  await signOutNativeGoogleAccount();
}
