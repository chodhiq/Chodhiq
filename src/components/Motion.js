import { motion } from '../theme/motion';
import { devicePerformance } from '../lib/devicePerformance';
import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { Modal, Platform, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import useReducedMotion, { useMotionPreferences } from '../hooks/useMotionPreferences';
import Animated, {
  cancelAnimation,
  Easing,
  measure,
  useAnimatedRef,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

function useAmbientMotion() {
  const { reducedMotion, foreground } = useMotionPreferences();
  const focused = useIsFocused();
  return reducedMotion || devicePerformance.lowMemory || !foreground || !focused;
}

const MotionViewport = createContext(null);

export const MotionScrollView = forwardRef(function MotionScrollView(
  { children, onLayout, horizontal, onScroll, ...props },
  ref,
) {
  const viewportRef = useAnimatedRef();
  const offset = useSharedValue(0);
  const viewportRevision = useSharedValue(0);
  const handler = useAnimatedScrollHandler({
    onScroll: (event) => {
      offset.value = event.contentOffset.y;
    },
  });
  const context = useMemo(
    () => ({ offset, viewportRef, viewportRevision }),
    [offset, viewportRef, viewportRevision],
  );
  const attach = useCallback(
    (node) => {
      viewportRef(node);
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [viewportRef, ref],
  );
  if (horizontal || onScroll || Platform.OS === 'web')
    return (
      <ScrollView
        {...props}
        horizontal={horizontal}
        ref={ref}
        onScroll={onScroll}
        onLayout={onLayout}
      >
        {children}
      </ScrollView>
    );
  return (
    <MotionViewport.Provider value={context}>
      <Animated.ScrollView
        {...props}
        ref={attach}
        onLayout={(event) => {
          viewportRevision.value += 1;
          onLayout?.(event);
        }}
        onScroll={handler}
        scrollEventThrottle={16}
      >
        {children}
      </Animated.ScrollView>
    </MotionViewport.Provider>
  );
});

export function FadeInView({ children, delay = 0, distance, duration, style, onLayout }) {
  const viewport = useContext(MotionViewport);
  const nativeViewport = !!viewport && Platform.OS !== 'web';
  const reducedMotion = useReducedMotion();
  const elapsed = duration ?? (nativeViewport ? motion.section.duration : motion.entrance.duration);
  const travel = distance ?? (nativeViewport ? motion.section.distance : motion.entrance.distance);
  const opacity = useSharedValue(reducedMotion || elapsed === 0 ? 1 : 0);
  const translateY = useSharedValue(reducedMotion || elapsed === 0 ? 0 : travel);
  const revealed = useSharedValue(reducedMotion || elapsed === 0);
  const revision = useSharedValue(0);
  const sectionRef = useAnimatedRef();
  const offset = viewport?.offset;
  const viewportRef = viewport?.viewportRef;
  const viewportRevision = viewport?.viewportRevision;
  useAnimatedReaction(
    () => (nativeViewport ? [offset.value, revision.value, viewportRevision.value] : null),
    (current) => {
      if (!current || revealed.value || reducedMotion) return;
      const bounds = measure(sectionRef);
      const frame = measure(viewportRef);
      if (!bounds || !frame || bounds.height <= 0) return;
      if (bounds.pageY < frame.pageY + frame.height && bounds.pageY + bounds.height > frame.pageY) {
        revealed.value = true;
        const config = { duration: elapsed, easing: Easing.out(Easing.cubic) };
        opacity.value = withDelay(delay, withTiming(1, config));
        translateY.value = withDelay(delay, withTiming(0, config));
      }
    },
    [nativeViewport, reducedMotion, delay, elapsed],
  );
  useEffect(() => {
    if (reducedMotion || elapsed === 0) {
      revealed.value = true;
      opacity.value = 1;
      translateY.value = 0;
    } else if (!nativeViewport) {
      const config = { duration: elapsed, easing: Easing.out(Easing.cubic) };
      opacity.value = withDelay(delay, withTiming(1, config));
      translateY.value = withDelay(delay, withTiming(0, config));
    }
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(translateY);
    };
  }, [nativeViewport, reducedMotion, delay, elapsed, opacity, translateY, revealed]);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
  return (
    <Animated.View
      ref={sectionRef}
      style={[style, animatedStyle]}
      onLayout={(event) => {
        revision.value += 1;
        onLayout?.(event);
      }}
    >
      {children}
    </Animated.View>
  );
}

export const MotionTouchable = forwardRef(function MotionTouchable(
  { children, style, onPressIn, onPressOut, disabled, activeOpacity = 0.92, ...props },
  ref,
) {
  const reducedMotion = useReducedMotion();
  const baseTransforms = StyleSheet.flatten(style)?.transform || [];
  const scale = useSharedValue(1);
  useEffect(() => {
    if (reducedMotion || disabled) {
      cancelAnimation(scale);
      scale.value = 1;
    }
    return () => cancelAnimation(scale);
  }, [reducedMotion, disabled, scale]);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [...baseTransforms, { scale: scale.value }],
  }));
  const animate = (value) => {
    if (!reducedMotion && !disabled)
      scale.value = withTiming(value, {
        duration: value === 1 ? motion.press.outDuration : motion.press.inDuration,
      });
  };
  return (
    <AnimatedTouchable
      ref={ref}
      accessibilityRole="button"
      {...props}
      disabled={disabled}
      activeOpacity={activeOpacity}
      style={[style, animatedStyle]}
      onPressIn={(event) => {
        animate(motion.press.scale);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        animate(1);
        onPressOut?.(event);
      }}
    >
      {children}
    </AnimatedTouchable>
  );
});

export function PressableScale(props) {
  return <MotionTouchable {...props} />;
}

export const MotionModal = forwardRef(function MotionModal(
  { animationType = 'fade', ...props },
  ref,
) {
  const reduced = useReducedMotion();
  return <Modal {...props} ref={ref} animationType={reduced ? 'none' : animationType} />;
});

// Native stack handles detail/form transitions; tabs get a small UI-thread fade.
export function withScreenMotion(Screen) {
  function MotionScreen(props) {
    const focused = useIsFocused();
    const reduced = useReducedMotion();
    const opacity = useSharedValue(reduced ? 1 : 0);
    const firstFocus = useRef(true);
    const previousFocused = useRef(false);
    const y = useSharedValue(reduced ? 0 : motion.entrance.distance);
    useEffect(() => {
      cancelAnimation(opacity);
      cancelAnimation(y);
      const wasFocused = previousFocused.current;
      previousFocused.current = focused;
      if (!focused || reduced || wasFocused) {
        if (focused) firstFocus.current = false;
        opacity.value = 1;
        y.value = 0;
        return undefined;
      }
      const entrance = firstFocus.current ? motion.entrance : motion.navigation;
      firstFocus.current = false;
      opacity.value = 0;
      y.value = entrance.distance;
      const config = { duration: entrance.duration, easing: Easing.out(Easing.cubic) };
      opacity.value = withTiming(1, config);
      y.value = withTiming(0, config);
      return () => {
        cancelAnimation(opacity);
        cancelAnimation(y);
      };
    }, [focused, reduced, opacity, y]);
    const animatedStyle = useAnimatedStyle(() => ({
      opacity: opacity.value,
      transform: [{ translateY: y.value }],
    }));
    return (
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>
        <Screen {...props} />
      </Animated.View>
    );
  }
  MotionScreen.displayName = `Motion(${Screen.displayName || Screen.name})`;
  return MotionScreen;
}

export function FloatingView({ children, style, distance = 3, duration = 2200 }) {
  const reduced = useAmbientMotion();
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
  const reduced = useAmbientMotion();
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
