import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, TouchableOpacity } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduced)
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => subscription.remove();
  }, []);
  return reduced;
}

export function FadeInView({ children, delay = 0, distance = 12, style }) {
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(distance);
  useEffect(() => {
    if (reducedMotion) {
      opacity.value = 1;
      translateY.value = 0;
      return undefined;
    }
    opacity.value = withDelay(delay, withTiming(1, { duration: 320 }));
    translateY.value = withDelay(delay, withSpring(0, { damping: 17, stiffness: 150 }));
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(translateY);
    };
  }, [delay, distance, opacity, reducedMotion, translateY]);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

export function PressableScale({
  children,
  style,
  onPress,
  disabled,
  activeOpacity = 0.95,
  ...accessibilityProps
}) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animate = (toValue) => {
    if (!reducedMotion) scale.value = withSpring(toValue, { damping: 15, stiffness: 260 });
  };
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[style, animatedStyle]}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={accessibilityProps.accessibilityLabel}
        {...accessibilityProps}
        disabled={disabled}
        activeOpacity={activeOpacity}
        onPress={onPress}
        onPressIn={() => animate(0.965)}
        onPressOut={() => animate(1)}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

export function FloatingView({ children, style, distance = 3, duration = 2200 }) {
  const reduced = useReducedMotion();
  const y = useSharedValue(0);
  useEffect(() => {
    if (reduced) {
      y.value = 0;
      return undefined;
    }
    y.value = withRepeat(
      withSequence(
        withTiming(-distance, { duration, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
    return () => cancelAnimation(y);
  }, [distance, duration, reduced, y]);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

export function PulseView({ children, style, min = 0.82, duration = 900 }) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);
  useEffect(() => {
    if (reduced) {
      progress.value = 0;
      return undefined;
    }
    progress.value = withRepeat(
      withSequence(withTiming(1, { duration }), withTiming(0, { duration })),
      -1,
    );
    return () => cancelAnimation(progress);
  }, [duration, progress, reduced]);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - (1 - min) * progress.value,
    transform: [{ scale: 1 + 0.18 * progress.value }],
  }));
  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
