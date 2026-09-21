import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { recordError } from '../lib/telemetry';
import { brand } from '../config/brand';

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
      <View style={styles.page} accessibilityRole="alert">
        <Text style={styles.title}>{brand.name} hit an unexpected problem</Text>
        <Text style={styles.body}>
          Your account data is safe. Try reopening this screen. If the problem continues, contact
          support.
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Try loading ${brand.name} again`}
          style={styles.button}
          onPress={() => this.setState({ error: null })}
        >
          <Text style={styles.buttonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: '#F7F4EF',
  },
  title: { fontSize: 22, fontWeight: '900', color: '#17231D', textAlign: 'center' },
  body: { fontSize: 15, lineHeight: 22, color: '#526158', textAlign: 'center', marginTop: 10 },
  button: {
    marginTop: 22,
    minHeight: 48,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#246B4B',
  },
  buttonText: { color: '#FFFFFF', fontWeight: '800' },
});
