import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import useEffectsLevel from '../src/hooks/useEffectsLevel';
import { theme } from '../theme';

export interface PulseDotProps {
  size?: number;
  active?: boolean;
}

export default function PulseDot({ size = 8, active = true }: PulseDotProps) {
  const effectsLevel = useEffectsLevel();
  const canAnimate = effectsLevel === 'full' && active;
  const progress = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(progress);
    if (!canAnimate) {
      progress.value = 0;
      return;
    }
    progress.value = withRepeat(withTiming(1, { duration: 1400 }), -1, true);
    return () => cancelAnimation(progress);
  }, [canAnimate, progress]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: canAnimate ? interpolate(progress.value, [0, 1], [1, 0.45]) : 1,
    transform: [{ scale: canAnimate ? interpolate(progress.value, [0, 1], [1, 1.6]) : 1 }],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: canAnimate ? interpolate(progress.value, [0, 1], [0.55, 0]) : 0,
    transform: [{ scale: canAnimate ? interpolate(progress.value, [0, 1], [1, 2.2]) : 1 }],
  }));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View
        pointerEvents="none"
        style={[styles.halo, { width: size, height: size, borderRadius: size / 2 }, haloStyle]}
      />
      <Animated.View
        style={[styles.dot, { width: size, height: size, borderRadius: size / 2 }, pulseStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  dot: {
    backgroundColor: theme.colors.primary,
  },
});
