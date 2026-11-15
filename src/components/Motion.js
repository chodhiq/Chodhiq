import { motion } from '../theme/motion';
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
import * as Haptics from 'expo-haptics';
import { useIsFocused } from '@react-navigation/native';
import ScreenSurface from '../../components/ui/Screen';
import { useMotionPreferences } from '../hooks/useMotionPreferences';
import useEffectsLevel from '../hooks/useEffectsLevel';
import { safePress } from '../lib/safePress';
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

function accessibleLabelFrom(children) {
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  return React.Children.toArray(children)
    .map((child) => {
      if (!React.isValidElement(child)) return accessibleLabelFrom(child);
      return (
        child.props?.accessibilityLabel ||
        child.props?.label ||
        accessibleLabelFrom(child.props?.children)
      );
    })
    .filter(Boolean)
    .join(' ')
    .trim();
}

function useAmbientMotion() {
  const effectsLevel = useEffectsLevel();
  const { foreground } = useMotionPreferences();
  const focused = useIsFocused();
  return effectsLevel !== 'full' || !foreground || !focused;
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
  const effectsLevel = useEffectsLevel();
  const reducedMotion = effectsLevel !== 'full';
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
  {
    children,
    style,
    onPressIn,
    onPressOut,
    disabled,
    busy = false,
    haptic = true,
    activeOpacity = 0.92,
    accessibilityLabel,
    accessibilityRole,
    accessibilityState,
    featureKey,
    ...props
  },
  ref,
) {
  const effectsLevel = useEffectsLevel();
  const [actionStatus, setActionStatus] = React.useState('idle');
  const statusTimer = useRef(null);
  const animationEnabled = effectsLevel !== 'off';
  const baseTransforms = StyleSheet.flatten(style)?.transform || [];
  const scale = useSharedValue(1);
  useEffect(() => {
    if (!animationEnabled || disabled) {
      cancelAnimation(scale);
      scale.value = 1;
    }
    return () => cancelAnimation(scale);
  }, [animationEnabled, disabled, scale]);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [...baseTransforms, { scale: scale.value }],
  }));
  const animate = (value) => {
    if (animationEnabled && !disabled)
      scale.value = withTiming(value, {
        duration: value === 1 ? motion.press.outDuration : motion.press.inDuration,
      });
  };
  const buttonName =
    props.testID || accessibilityLabel || accessibleLabelFrom(children) || 'Action';
  const onActionStatusChange = useCallback((status) => {
    if (statusTimer.current) clearTimeout(statusTimer.current);
    statusTimer.current = null;
    setActionStatus(status);
    if (status === 'success' || status === 'error') {
      statusTimer.current = setTimeout(() => {
        statusTimer.current = null;
        setActionStatus('idle');
      }, 1800);
    }
  }, []);
  const safeOnPress = React.useMemo(
    () =>
      safePress(props.onPress, {
        buttonName,
        featureKey,
        onStatusChange: onActionStatusChange,
      }),
    [buttonName, featureKey, onActionStatusChange, props.onPress],
  );
  useEffect(
    () => () => {
      if (statusTimer.current) clearTimeout(statusTimer.current);
    },
    [],
  );
  return (
    <AnimatedTouchable
      ref={ref}
      {...props}
      accessibilityRole={accessibilityRole || 'button'}
      accessibilityLabel={accessibilityLabel || accessibleLabelFrom(children) || 'Action'}
      accessibilityState={{
        ...accessibilityState,
        disabled: disabled || actionStatus === 'loading' || accessibilityState?.disabled,
        busy: busy || actionStatus === 'loading' || accessibilityState?.busy,
      }}
      accessibilityHint={
        actionStatus === 'error' ? 'The action failed. Try again.' : props.accessibilityHint
      }
      disabled={disabled || actionStatus === 'loading'}
      onPress={safeOnPress}
      activeOpacity={activeOpacity}
      style={[style, { minWidth: 44, minHeight: 44 }, animatedStyle]}
      onPressIn={(event) => {
        animate(motion.press.scale);
        if (!disabled && haptic) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch((error) => {
            console.warn('Unable to trigger button haptic feedback.', error);
          });
        }
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
  const effectsLevel = useEffectsLevel();
  const reduced = effectsLevel !== 'full';
  return <Modal {...props} ref={ref} animationType={reduced ? 'none' : animationType} />;
});

// Native stack handles detail/form transitions; tabs fade out and in on the UI thread.
export function withScreenMotion(Screen, variant = 'default') {
  function MotionScreen(props) {
    const focused = useIsFocused();
    const effectsLevel = useEffectsLevel();
    const reduced = effectsLevel !== 'full';
    const opacity = useSharedValue(reduced ? 1 : 0);
    const y = useSharedValue(reduced ? 0 : motion.entrance.distance);
    useEffect(() => {
      cancelAnimation(opacity);
      cancelAnimation(y);
      if (reduced) {
        opacity.value = 1;
        y.value = 0;
        return undefined;
      }
      if (focused) {
        opacity.value = 0;
        y.value = motion.navigation.distance;
        const config = { duration: motion.navigation.duration, easing: Easing.out(Easing.cubic) };
        opacity.value = withTiming(1, config);
        y.value = withTiming(0, config);
      } else {
        const config = { duration: motion.navigation.exitDuration, easing: Easing.in(Easing.quad) };
        opacity.value = withTiming(0, config);
        y.value = withTiming(-motion.navigation.distance / 2, config);
      }
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
      <ScreenSurface variant={variant} edges={[]}>
        <Animated.View style={[{ flex: 1 }, animatedStyle]}>
          <Screen {...props} />
        </Animated.View>
      </ScreenSurface>
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
