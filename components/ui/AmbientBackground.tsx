import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import useEffectsLevel from '../../src/hooks/useEffectsLevel';
import { theme } from '../../theme';
import type { BackgroundVariant } from './Screen';

interface AmbientBackgroundProps {
  variant?: BackgroundVariant;
}

const variantIndexes: Record<BackgroundVariant, number> = {
  default: 0,
  subtle: 1,
  intense: 2,
};

const variantOpacity = {
  left: [0.2, 0.1, 0.27],
  right: [0.18, 0.09, 0.24],
};

const variantOffset = {
  left: [
    { x: 0, y: 0 },
    { x: -24, y: 20 },
    { x: 18, y: -14 },
  ],
  right: [
    { x: 0, y: 0 },
    { x: 20, y: 16 },
    { x: -18, y: -20 },
  ],
};

function AmbientBackground({ variant = 'default' }: AmbientBackgroundProps) {
  const effectsLevel = useEffectsLevel();
  const staticBackground = effectsLevel !== 'full';
  const motionProgress = useSharedValue(0);
  const variantProgress = useSharedValue(variantIndexes[variant]);

  useEffect(() => {
    cancelAnimation(motionProgress);
    if (effectsLevel !== 'full') {
      motionProgress.value = 0;
      return;
    }
    motionProgress.value = withRepeat(withTiming(1, { duration: 10000 }), -1, true);
    return () => cancelAnimation(motionProgress);
  }, [effectsLevel, motionProgress]);

  useEffect(() => {
    if (staticBackground) {
      variantProgress.value = variantIndexes[variant];
      return;
    }
    variantProgress.value = withTiming(variantIndexes[variant], { duration: 500 });
  }, [staticBackground, variant, variantProgress]);

  return (
    <View pointerEvents="none" style={styles.container}>
      <AmbientBlob
        side="left"
        staticBackground={staticBackground}
        motionProgress={motionProgress}
        variantProgress={variantProgress}
        variant={variant}
      />
      <AmbientBlob
        side="right"
        staticBackground={staticBackground}
        motionProgress={motionProgress}
        variantProgress={variantProgress}
        variant={variant}
      />
    </View>
  );
}

interface AmbientBlobProps {
  side: 'left' | 'right';
  staticBackground: boolean;
  motionProgress: SharedValue<number>;
  variantProgress: SharedValue<number>;
  variant: BackgroundVariant;
}

const AmbientBlob = memo(function AmbientBlob({
  side,
  staticBackground,
  motionProgress,
  variantProgress,
  variant,
}: AmbientBlobProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity:
      interpolate(variantProgress.value, [0, 1, 2], variantOpacity[side]) *
      (staticBackground ? 1 : interpolate(motionProgress.value, [0, 1], [0.88, 1])),
    transform: [
      {
        translateX:
          interpolate(
            variantProgress.value,
            [0, 1, 2],
            variantOffset[side].map(({ x }) => x),
          ) + (staticBackground ? 0 : (side === 'left' ? 1 : -1) * motionProgress.value * 14),
      },
      {
        translateY:
          interpolate(
            variantProgress.value,
            [0, 1, 2],
            variantOffset[side].map(({ y }) => y),
          ) + (staticBackground ? 0 : motionProgress.value * 8),
      },
      { scale: staticBackground ? 1 : interpolate(motionProgress.value, [0, 1], [1, 1.08]) },
    ],
  }));
  const staticOffset = variantOffset[side][variantIndexes[variant]];
  const blob = (
    <Svg pointerEvents="none" width="100%" height="100%" viewBox="0 0 300 300">
      <Defs>
        <RadialGradient id={`app-ambient-${side}`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={theme.colors.primary} stopOpacity="1" />
          <Stop offset="0.55" stopColor={theme.colors.primaryDark} stopOpacity="0.5" />
          <Stop offset="1" stopColor={theme.colors.primaryDeep} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="300" height="300" fill={`url(#app-ambient-${side})`} />
    </Svg>
  );

  if (staticBackground) {
    return (
      <View
        style={[
          styles.blob,
          styles[side],
          {
            opacity: variantOpacity[side][variantIndexes[variant]],
            transform: [{ translateX: staticOffset.x }, { translateY: staticOffset.y }],
          },
        ]}
      >
        {blob}
      </View>
    );
  }

  return <Animated.View style={[styles.blob, styles[side], animatedStyle]}>{blob}</Animated.View>;
});

export default memo(AmbientBackground);

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    backgroundColor: theme.colors.background,
  },
  blob: {
    position: 'absolute',
    width: 300,
    height: 300,
  },
  left: {
    top: -135,
    left: -150,
  },
  right: {
    top: -145,
    right: -150,
  },
});
