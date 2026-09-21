import 'react-native-gesture-handler';
import React from 'react';
import { Text, Button } from 'react-native';
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

Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.style = [{ fontFamily: 'Inter_400Regular' }, Text.defaultProps.style];

// Initialize Sentry for error tracking
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
  environment: __DEV__ ? 'development' : 'production',
  tracesSampleRate: 0.1, // 10% of transactions in production
  enableAutoPerformanceMonitoring: true,
  attachStacktrace: true,
  beforeSend(event, hint) {
    // Don't send events in development unless explicitly needed
    if (__DEV__) {
      console.log('[Sentry Dev]', event.message || hint.originalException?.message);
      return null;
    }
    event.user = undefined;
    return event;
  },
});

configureNotificationHandler();

function AppContent() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });
  if (!fontsLoaded) return null;
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
      <GestureHandlerRootView
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}
      >
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
          Oops, something went wrong!
        </Text>
        <Text style={{ fontSize: 14, marginBottom: 20, textAlign: 'center' }}>
          Your account data is safe. Try reopening this screen. If the problem continues, contact
          support.
        </Text>
        <Button title="Try again" onPress={resetError} />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

function ThemedApp() {
  const { isDark, palette } = useChodhiQTheme();
  return (
    <AppStateProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={palette.background} />
      <RootNavigator />
    </AppStateProvider>
  );
}
