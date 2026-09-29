import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { recordError } from '../lib/telemetry';
import { brand } from '../config/brand';
import Text from './AppText';
import { useChodhiQTheme } from '../context/ThemeContext';

export default class AppErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    recordError(error, { area: 'react-render', operation: info?.componentStack, fatal: true });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <ThemedErrorFallback brandName={brand.name} onRetry={() => this.setState({ error: null })} />
    );
  }
}

function ThemedErrorFallback({ brandName, onRetry }) {
  const { palette } = useChodhiQTheme();
  return (
    <View style={[styles.page, { backgroundColor: palette.background }]} accessibilityRole="alert">
      <Text style={[styles.title, { color: palette.text }]}>
        {brandName} hit an unexpected problem
      </Text>
      <Text style={[styles.body, { color: palette.text2 }]}>
        Try reopening this screen. If the problem continues, contact support.
      </Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Try loading ${brandName} again`}
        style={[styles.button, { backgroundColor: palette.primary }]}
        onPress={onRetry}
      >
        <Text style={styles.buttonText}>Try again</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  title: { fontSize: 22, fontWeight: '900', textAlign: 'center' },
  body: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 10 },
  button: {
    marginTop: 22,
    minHeight: 48,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#FFFFFF', fontWeight: '800' },
});
