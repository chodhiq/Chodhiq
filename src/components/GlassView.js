import React from 'react';
import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, View } from 'react-native';
import { defaultThemeContext, useChodhiQTheme } from '../context/ThemeContext';

export default function GlassView({
  intensity = 40,
  active = false,
  androidBlurEnabled = true,
  style,
  children,
  ...props
}) {
  const context = useChodhiQTheme() || defaultThemeContext;
  const isDark = context.isDark ?? true;
  const palette = context.palette || defaultThemeContext.palette;
  const tint = isDark ? 'rgba(20,26,23,0.64)' : 'rgba(255,255,255,0.62)';
  const fallback = isDark ? 'rgba(13,17,15,0.96)' : 'rgba(255,255,255,0.94)';

  return (
    <View
      {...props}
      style={[
        styles.container,
        {
          borderColor: active
            ? palette.primary
            : isDark
              ? 'rgba(224,255,236,0.1)'
              : 'rgba(16,24,23,0.1)',
        },
        style,
      ]}
    >
      {(Platform.OS !== 'android' || androidBlurEnabled) && (
        <BlurView
          pointerEvents="none"
          intensity={intensity}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: Platform.OS === 'web' ? fallback : tint },
        ]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden', borderWidth: 1 },
});
