import React, { createContext, useContext, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { radius, spacing } from '../theme/theme';
import { useChodhiQTheme } from '../context/ThemeContext';
import { useIsFocused } from '@react-navigation/native';
import { useMotionPreferences } from '../hooks/useMotionPreferences';

const SkeletonOpacity = createContext(null);

function Bone({ style }) {
  const { palette } = useChodhiQTheme();
  const opacity = useContext(SkeletonOpacity);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity?.value ?? 0.7 }));
  return (
    <Animated.View
      style={[styles.bone, { backgroundColor: palette.primarySoft }, style, animatedStyle]}
    />
  );
}

export function ProviderSkeletonRow() {
  const { palette } = useChodhiQTheme();
  return (
    <View style={[styles.row, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Bone style={styles.image} />
      <View style={styles.copy}>
        <Bone style={styles.title} />
        <Bone style={styles.line} />
        <Bone style={styles.short} />
      </View>
    </View>
  );
}

export function MarketplaceSkeleton({ count = 3 }) {
  const { reducedMotion, foreground } = useMotionPreferences();
  const focused = useIsFocused();
  const opacity = useSharedValue(0.45);
  useEffect(() => {
    if (reducedMotion || !foreground || !focused) {
      cancelAnimation(opacity);
      opacity.value = 0.7;
      return undefined;
    }
    opacity.value = withRepeat(
      withSequence(withTiming(1, { duration: 700 }), withTiming(0.45, { duration: 700 })),
      -1,
    );
    return () => cancelAnimation(opacity);
  }, [opacity, reducedMotion, foreground, focused]);
  return (
    <SkeletonOpacity.Provider value={opacity}>
      <View style={styles.list}>
        {Array.from({ length: count }, (_, index) => (
          <ProviderSkeletonRow key={index} />
        ))}
      </View>
    </SkeletonOpacity.Provider>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  row: { flexDirection: 'row', padding: spacing.sm, borderWidth: 1, borderRadius: radius.lg },
  bone: { borderRadius: radius.sm },
  image: { width: 88, height: 88 },
  copy: { flex: 1, padding: spacing.sm, gap: 10 },
  title: { height: 16, width: '76%' },
  line: { height: 12, width: '92%' },
  short: { height: 12, width: '48%' },
});
