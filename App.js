import { AppDialogProvider } from './src/components/AppDialog';
import 'react-native-gesture-handler';
import useReducedMotion from './src/hooks/useMotionPreferences';
import { Poppins_400Regular } from '@expo-google-fonts/poppins/400Regular';
import { Poppins_600SemiBold } from '@expo-google-fonts/poppins/600SemiBold';
import React from 'react';
import { ActivityIndicator, Button, View, Image } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { AppStateProvider } from './src/context/AppStateContext';
import { ChodhiQThemeProvider, useChodhiQTheme } from './src/context/ThemeContext';
import { configureNotificationHandler } from './src/lib/notificationRuntime';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Inter_800ExtraBold } from '@expo-google-fonts/inter/800ExtraBold';
import { useFonts } from '@expo-google-fonts/inter/useFonts';
import { redactSentryEvent } from './src/lib/sentryUtils';
import Text from './src/components/AppText';

// Initialize Sentry for error tracking
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
  environment: process.env.EXPO_PUBLIC_APP_ENV || (__DEV__ ? 'development' : 'production'),
  release: process.env.EXPO_PUBLIC_RELEASE_COMMIT || undefined,
  tracesSampleRate: 0.1, // 10% of transactions in production
  enableAutoPerformanceMonitoring: true,
  attachStacktrace: true,
  beforeBreadcrumb(breadcrumb) {
    return redactSentryEvent(breadcrumb);
  },
  beforeSend(event, hint) {
    // Don't send events in development unless explicitly needed
    if (__DEV__) {
      console.log('[Sentry Dev]', event.message || hint.originalException?.message);
      return null;
    }
    event.user = undefined;
    return redactSentryEvent(event, hint);
  },
});

configureNotificationHandler();

function AppContent() {
  useReducedMotion();
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Poppins_400Regular,
    Poppins_600SemiBold,
  });
  const [fontWaitExpired, setFontWaitExpired] = React.useState(false);
  React.useEffect(() => {
    const timer = setTimeout(() => setFontWaitExpired(true), 2500);
    return () => clearTimeout(timer);
  }, []);
  if (!fontsLoaded && !fontError && !fontWaitExpired)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#F8FAF7',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
        }}
      >
        <Image
          source={require('./assets/chodhiq-full-logo-transparent.png')}
          style={{ width: 180, height: 64 }}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color="#16805D" />
      </View>
    );
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => <ErrorFallback error={error} resetError={resetError} />}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <BottomSheetModalProvider>
            <ChodhiQThemeProvider>
              <ThemedApp />
            </ChodhiQThemeProvider>
          </BottomSheetModalProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </Sentry.ErrorBoundary>
  );
}

export default Sentry.wrap(AppContent);

function ErrorFallback({ resetError }) {
  return (
    <SafeAreaProvider>
      <ChodhiQThemeProvider>
        <ErrorFallbackContent resetError={resetError} />
      </ChodhiQThemeProvider>
    </SafeAreaProvider>
  );
}

function ErrorFallbackContent({ resetError }) {
  const { palette } = useChodhiQTheme();
  return (
    <GestureHandlerRootView
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: palette.background,
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: palette.text }}>
        Oops, something went wrong!
      </Text>
      <Text style={{ fontSize: 14, marginBottom: 20, textAlign: 'center', color: palette.text2 }}>
        Try reopening this screen. If the problem continues, contact support.
      </Text>
      <Button title="Try again" onPress={resetError} color={palette.primary} />
    </GestureHandlerRootView>
  );
}

function ThemedApp() {
  const { isDark, palette } = useChodhiQTheme();
  return (
    <AppStateProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={palette.background} />
      <AppDialogProvider>
        <RootNavigator />
      </AppDialogProvider>
    </AppStateProvider>
  );
}
