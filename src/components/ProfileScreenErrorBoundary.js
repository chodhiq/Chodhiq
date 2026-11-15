import React, { Component } from 'react';
import { View } from 'react-native';
import { captureError } from '../lib/sentryUtils';
import Text from './AppText';
import { useChodhiQTheme } from '../context/ThemeContext';
import GlowButton from '../../components/ui/GlowButton';
import ErrorDiagnostics, { getDiagnosticComponentStack } from './ErrorDiagnostics';

export default class ProfileScreenErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    const componentStack = getDiagnosticComponentStack(errorInfo.componentStack);
    captureError(error, {
      operation: 'profile_screen_render',
      componentStack,
    });
    this.setState({ componentStack });
    console.error('[Profile screen error]', error, errorInfo.componentStack);
  }

  resetError = () => this.setState({ error: null });

  goToHome = () => this.props.navigation.navigate('Home');

  render() {
    if (this.state.error) {
      return (
        <ProfileScreenErrorFallback
          error={this.state.error}
          componentStack={this.state.componentStack}
          onRetry={this.resetError}
          onGoToHome={this.goToHome}
        />
      );
    }

    return this.props.children;
  }
}

function ProfileScreenErrorFallback({ error, componentStack, onRetry, onGoToHome }) {
  const { palette } = useChodhiQTheme();

  return (
    <View
      accessibilityRole="alert"
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        padding: 24,
        backgroundColor: 'transparent',
      }}
    >
      <Text style={{ color: palette.text, fontSize: 18, fontWeight: '700', textAlign: 'center' }}>
        Profile couldn’t load
      </Text>
      <Text style={{ color: palette.text2, fontSize: 14, textAlign: 'center' }}>
        Try again, or return to Home.
      </Text>
      <ErrorDiagnostics
        error={error}
        componentStack={componentStack}
        style={{ color: palette.text2, fontSize: 12 }}
      />
      <GlowButton
        testID="btn-profile-error-retry"
        label="Try again"
        variant="primary"
        onPress={onRetry}
      />
      <GlowButton
        testID="btn-profile-error-home"
        label="Go to Home"
        variant="secondary"
        onPress={onGoToHome}
      />
    </View>
  );
}
