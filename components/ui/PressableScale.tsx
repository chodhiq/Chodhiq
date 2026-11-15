import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import useEffectsLevel from '../../src/hooks/useEffectsLevel';
import { safePress } from '../../src/lib/safePress';

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
  featureKey?: string;
  onActionStatusChange?: (status: 'idle' | 'loading' | 'success' | 'error') => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function getAccessibleLabel(children: PressableProps['children']): string | undefined {
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (typeof children === 'function') return undefined;
  if (Array.isArray(children)) {
    return children.map(getAccessibleLabel).filter(Boolean).join(' ').trim() || undefined;
  }
  if (
    React.isValidElement<{ accessibilityLabel?: string; children?: ReactNode; label?: string }>(
      children,
    )
  ) {
    return (
      children.props.accessibilityLabel ??
      children.props.label ??
      getAccessibleLabel(children.props.children)
    );
  }
  return undefined;
}

function PressableScale({
  haptic = true,
  onPressIn,
  onPressOut,
  onPress,
  featureKey,
  onActionStatusChange,
  style,
  disabled,
  ...props
}: PressableScaleProps) {
  const effectsLevel = useEffectsLevel();
  const [actionStatus, setActionStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle',
  );
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationEnabled = effectsLevel !== 'off';
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const handlePressIn = useCallback<NonNullable<PressableProps['onPressIn']>>(
    (event) => {
      if (!disabled) {
        scale.value = animationEnabled ? withSpring(0.97, { damping: 16, stiffness: 280 }) : 1;
        if (haptic) {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch((error: unknown) => {
            console.warn('Unable to trigger button haptic feedback.', error);
          });
        }
      }
      onPressIn?.(event);
    },
    [animationEnabled, disabled, haptic, onPressIn, scale],
  );
  const handlePressOut = useCallback<NonNullable<PressableProps['onPressOut']>>(
    (event) => {
      scale.value = animationEnabled ? withSpring(1, { damping: 12, stiffness: 260 }) : 1;
      onPressOut?.(event);
    },
    [animationEnabled, onPressOut, scale],
  );
  const updateActionStatus = useCallback(
    (status: 'idle' | 'loading' | 'success' | 'error') => {
      if (statusTimer.current) clearTimeout(statusTimer.current);
      statusTimer.current = null;
      setActionStatus(status);
      onActionStatusChange?.(status);
      if (status === 'success' || status === 'error') {
        statusTimer.current = setTimeout(() => {
          statusTimer.current = null;
          setActionStatus('idle');
          onActionStatusChange?.('idle');
        }, 1800);
      }
    },
    [onActionStatusChange],
  );
  const buttonName =
    props.testID || props.accessibilityLabel || getAccessibleLabel(props.children) || 'Action';
  const handlePress = useMemo(
    () =>
      safePress(onPress, {
        buttonName,
        featureKey,
        onStatusChange: updateActionStatus,
      }),
    [buttonName, featureKey, onPress, updateActionStatus],
  );

  useEffect(
    () => () => {
      if (statusTimer.current) clearTimeout(statusTimer.current);
    },
    [],
  );

  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      accessibilityRole={props.accessibilityRole ?? 'button'}
      accessibilityLabel={
        props.accessibilityLabel ?? getAccessibleLabel(props.children) ?? 'Action'
      }
      accessibilityState={{
        ...props.accessibilityState,
        disabled: disabled ?? props.accessibilityState?.disabled,
        busy: actionStatus === 'loading' || props.accessibilityState?.busy,
      }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[style, { minWidth: 44, minHeight: 44 }, animatedStyle]}
    />
  );
}

export default memo(PressableScale);
