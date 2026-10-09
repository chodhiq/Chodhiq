import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text from '../components/AppText';
import { PressableScale } from '../components/Motion';
import { useAppState } from '../context/AppStateContext';
import { useChodhiQTheme } from '../context/ThemeContext';
import { authErrorMessage } from '../lib/authOperations';
import useLiveCallback from '../hooks/useLiveCallback';

export default function EmailConfirmationScreen({ navigation, route }) {
  const { authenticate } = useAppState();
  const completeConfirmation = useLiveCallback(authenticate);
  const { palette } = useChodhiQTheme();
  const [message, setMessage] = useState('Completing your sign-in…');
  const [busy, setBusy] = useState(true);
  const code = route.params?.code;
  const confirmed = route.params?.confirmed;
  const error = route.params?.error;
  const errorDescription = route.params?.error_description;

  useEffect(() => {
    let active = true;
    setBusy(true);
    completeConfirmation('callback', {
      code,
      confirmed,
      error,
      error_description: errorDescription,
    })
      .then((session) => {
        if (!active) return;
        if (session) navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
        else
          setMessage('Your email is confirmed. Sign in with your email and password to continue.');
      })
      .catch((failure) => {
        if (active) setMessage(authErrorMessage(failure));
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [code, confirmed, error, errorDescription, navigation, completeConfirmation]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 20 }}>
        <Text style={{ color: palette.text, fontSize: 24, fontWeight: '700' }}>ChodhiQ</Text>
        {busy ? (
          <ActivityIndicator accessibilityLabel="Completing sign-in" color={palette.primary} />
        ) : null}
        <Text
          accessibilityRole="alert"
          style={{ color: palette.text, fontSize: 16, lineHeight: 24 }}
        >
          {message}
        </Text>
        {!busy ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Go to sign in"
            onPress={() => navigation.replace('Welcome', { initialMode: 'signin' })}
            style={{ backgroundColor: palette.primary, padding: 16, borderRadius: 12 }}
          >
            <Text style={{ color: palette.onPrimary, textAlign: 'center', fontWeight: '700' }}>
              Go to sign in
            </Text>
          </PressableScale>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
