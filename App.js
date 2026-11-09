import { AppDialogProvider } from './src/components/AppDialog';
import 'react-native-gesture-handler';
import { Poppins_400Regular } from '@expo-google-fonts/poppins/400Regular';
import { Poppins_600SemiBold } from '@expo-google-fonts/poppins/600SemiBold';
import React from 'react';
import { ActivityIndicator, ScrollView, View, Image } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import AppProviders from './src/components/AppProviders';
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
import ErrorDiagnostics, { getDiagnosticComponentStack } from './src/components/ErrorDiagnostics';
import { captureError } from './src/lib/sentryUtils';
import AmbientBackground from './components/ui/AmbientBackground';
import { BackgroundVariantProvider, useBackgroundVariant } from './components/ui/Screen';
import { theme } from './theme';
import GlowButton from './components/ui/GlowButton';
import ButtonToastHost from './src/components/ButtonToastHost';

const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN || '';
if (!sentryDsn && !__DEV__) {
  console.warn('Sentry is not configured; crash and button-error reporting is disabled.');
}

// Initialize Sentry for error tracking
Sentry.init({
  dsn: sentryDsn,
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
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, componentStack, resetError }) => (
        <ErrorFallback error={error} componentStack={componentStack} resetError={resetError} />
      )}
    >
      <AppRuntime />
    </Sentry.ErrorBoundary>
  );
}

function AppRuntime() {
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
          backgroundColor: '#080A09',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
        }}
      >
        <Image
          source={require('./assets/chodhiq-logo-white.png')}
          style={{ width: 180, height: 64 }}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color="#20C767" />
      </View>
    );
  return (
    <AppProviders>
      <ThemedApp />
    </AppProviders>
  );
}

export default Sentry.wrap(AppContent);

function ErrorFallback({ error, componentStack, resetError }) {
  return (
    <SafeAreaProvider>
      <ChodhiQThemeProvider>
        <ErrorFallbackContent
          error={error}
          componentStack={componentStack}
          resetError={resetError}
        />
      </ChodhiQThemeProvider>
    </SafeAreaProvider>
  );
}

function ErrorFallbackContent({ error, componentStack, resetError }) {
  const { palette } = useChodhiQTheme();
  React.useEffect(() => {
    if (process.env.EXPO_PUBLIC_DIAGNOSTICS !== 'true' || !error) return;
    captureError(error, {
      operation: 'app_error_fallback',
      componentStack: getDiagnosticComponentStack(componentStack),
    });
  }, [componentStack, error]);
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
      {process.env.EXPO_PUBLIC_DIAGNOSTICS === 'true' ? (
        <ScrollView
          style={{ maxHeight: 180, width: '100%', marginBottom: 20 }}
          contentContainerStyle={{ alignItems: 'center' }}
        >
          <ErrorDiagnostics
            error={error}
            componentStack={componentStack}
            style={{ fontSize: 12, textAlign: 'center', color: palette.text2 }}
          />
        </ScrollView>
      ) : null}
      <GlowButton
        testID="btn-error-retry"
        label="Try again"
        variant="primary"
        onPress={resetError}
      />
    </GestureHandlerRootView>
  );
}

function ThemedApp() {
  const { isDark, palette } = useChodhiQTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={palette.background} />
      <BackgroundVariantProvider>
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
          <RootAmbientBackground />
          <AppDialogProvider>
            <RootNavigator />
            <ButtonToastHost />
          </AppDialogProvider>
        </View>
      </BackgroundVariantProvider>
    </>
  );
}

function RootAmbientBackground() {
  const variant = useBackgroundVariant();
  return <AmbientBackground variant={variant} />;
}
