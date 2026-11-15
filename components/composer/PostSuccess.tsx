import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import useEffectsLevel from '../../src/hooks/useEffectsLevel';
import { theme } from '../../theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const checkPathLength = 56;

interface ParticleConfig {
  angle: number;
  radius: number;
  travel: number;
  size: number;
  delay: number;
  opacity: number;
  twinkle: boolean;
}

function createParticles(): ParticleConfig[] {
  return Array.from({ length: 12 }, (_, index) => ({
    angle: (Math.PI * 2 * index) / 12 + (Math.random() - 0.5) * 0.28,
    radius: 48 + Math.random() * 10,
    travel: 14 + Math.random() * 16,
    size: 2 + Math.random() * 2,
    delay: Math.random() * 0.12,
    opacity: 0.65 + Math.random() * 0.25,
    twinkle: index % 4 === 0,
  }));
}

function PostSuccess() {
  const reducedMotion = useEffectsLevel() !== 'full';
  const particles = useMemo(createParticles, []);
  const burstProgress = useSharedValue(0);
  const circleScale = useSharedValue(reducedMotion ? 1 : 0.6);
  const checkProgress = useSharedValue(reducedMotion ? 1 : 0);
  const labelProgress = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      (error: unknown) => {
        console.warn('Unable to trigger post success haptic feedback.', error);
      },
    );

    cancelAnimation(burstProgress);
    if (reducedMotion) {
      burstProgress.value = 0;
      circleScale.value = 1;
      checkProgress.value = 1;
      labelProgress.value = 1;
      return;
    }

    circleScale.value = withDelay(
      60,
      withSequence(
        withSpring(1.1, { damping: 7, stiffness: 260 }),
        withSpring(1, { damping: 12, stiffness: 220 }),
      ),
    );
    checkProgress.value = withDelay(
      360,
      withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) }),
    );
    labelProgress.value = withDelay(480, withSpring(1, { damping: 16, stiffness: 180 }));
    burstProgress.value = withSequence(
      withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) }),
      withRepeat(withTiming(2, { duration: 1000, easing: Easing.linear }), -1, false),
    );

    return () => {
      cancelAnimation(burstProgress);
      cancelAnimation(circleScale);
      cancelAnimation(checkProgress);
      cancelAnimation(labelProgress);
    };
  }, [burstProgress, checkProgress, circleScale, labelProgress, reducedMotion]);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale.value }],
    shadowOpacity: reducedMotion ? 0.25 : interpolate(circleScale.value, [0.6, 1.1], [0.12, 0.4]),
    shadowRadius: reducedMotion ? 12 : interpolate(circleScale.value, [0.6, 1.1], [8, 18]),
  }));
  const checkProps = useAnimatedProps(() => ({
    strokeDashoffset: checkPathLength * (1 - checkProgress.value),
  }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: labelProgress.value,
    transform: [{ translateY: interpolate(labelProgress.value, [0, 1], [8, 0]) }],
  }));

  return (
    <View accessible accessibilityLabel="Posted successfully" style={styles.container}>
      {!reducedMotion && (
        <View pointerEvents="none" style={styles.particleField}>
          {particles.map((particle, index) => (
            <SuccessParticle key={index} config={particle} progress={burstProgress} />
          ))}
        </View>
      )}
      <Animated.View pointerEvents="none" style={[styles.circle, circleStyle]}>
        <Svg pointerEvents="none" width={84} height={84} viewBox="0 0 84 84">
          <AnimatedPath
            d="M23 43L36 56L62 30"
            fill="none"
            stroke={theme.colors.primary}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={checkPathLength}
            animatedProps={checkProps}
          />
        </Svg>
      </Animated.View>
      <Animated.Text style={[styles.label, labelStyle]}>Posted!</Animated.Text>
    </View>
  );
}

function SuccessParticle({
  config,
  progress,
}: {
  config: ParticleConfig;
  progress: SharedValue<number>;
}) {
  const particleStyle = useAnimatedStyle(() => {
    const burst = interpolate(progress.value, [config.delay, 1], [0, 1], 'clamp');
    const twinkleOpacity = config.twinkle
      ? interpolate(progress.value, [1, 1.35, 1.7, 2], [0, 0.2, 0.7, 0.2], 'clamp')
      : 0;
    const burstOpacity = interpolate(
      progress.value,
      [config.delay, Math.min(config.delay + 0.12, 0.9), 1],
      [config.opacity, config.opacity * 0.55, 0],
      'clamp',
    );
    const distance = config.radius + config.travel * burst;

    return {
      opacity: Math.max(burstOpacity, twinkleOpacity),
      transform: [
        { translateX: Math.cos(config.angle) * distance },
        { translateY: Math.sin(config.angle) * distance },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: config.size,
          height: config.size,
          marginLeft: -config.size / 2,
          marginTop: -config.size / 2,
          borderRadius: config.size / 2,
        },
        particleStyle,
      ]}
    />
  );
}

export default memo(PostSuccess);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particleField: {
    position: 'absolute',
    top: 0,
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    backgroundColor: theme.colors.primary,
  },
  circle: {
    width: 84,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: theme.colors.primary,
    borderRadius: 42,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  label: {
    marginTop: 10,
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
});
