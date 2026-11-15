import {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useChodhiQTheme, defaultThemeContext } from '../../src/context/ThemeContext';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import PressableScale from './PressableScale';
import useEffectsLevel from '../../src/hooks/useEffectsLevel';
import { theme } from '../../theme';
import type { SharedValue } from 'react-native-reanimated';

export type GlowButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type GlowButtonSize = 'sm' | 'md' | 'lg';
export type GlowButtonStatus = 'idle' | 'loading' | 'success' | 'error';

export interface GlowButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  children?: ReactNode;
  variant?: GlowButtonVariant;
  size?: GlowButtonSize;
  label?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  status?: GlowButtonStatus;
  haptic?: boolean;
  actionFeedback?: boolean;
  buttonStyle?: StyleProp<ViewStyle>;
  disabledColors?: { background: string; border: string; text: string };
  width?: number;
  height?: number;
  iconOnly?: boolean;
  stretch?: boolean;
  sweepOnMount?: boolean;
  externalShake?: SharedValue<number>;
  featureKey?: string;
  onPressIn?: PressableProps['onPressIn'];
  onPressOut?: PressableProps['onPressOut'];
}

const sizes: Record<GlowButtonSize, { height: number; padding: number; fontSize: number }> = {
  sm: { height: 40, padding: 14, fontSize: 13 },
  md: { height: 48, padding: 18, fontSize: 15 },
  lg: { height: 56, padding: 22, fontSize: 16 },
};

const accentFor = (variant: GlowButtonVariant) =>
  variant === 'danger' ? '#FF5C6C' : theme.colors.primary;
const disabledBackground = 'rgba(32,199,103,0.35)';
const disabledBorder = 'rgba(32,199,103,0.38)';
const AnimatedPath = Animated.createAnimatedComponent(Path);

function GlowButton({
  variant = 'primary',
  size = 'md',
  label,
  children,
  leftIcon,
  rightIcon,
  status = 'idle',
  haptic = true,
  actionFeedback = true,
  buttonStyle,
  disabledColors,
  width: requestedWidth,
  height: requestedHeight,
  iconOnly = false,
  stretch = false,
  sweepOnMount = false,
  externalShake,
  featureKey,
  onPressIn,
  onPressOut,
  disabled = false,
  ...pressableProps
}: GlowButtonProps) {
  const { palette } = useChodhiQTheme();
  const [actionStatus, setActionStatus] = useState<GlowButtonStatus>('idle');
  const displayStatus = status === 'idle' ? actionStatus : status;
  const effectsLevel = useEffectsLevel();
  const reducedMotion = effectsLevel !== 'full';
  const dimension = sizes[size];
  const baseHeight = Math.max(44, requestedHeight ?? dimension.height);
  const initialWidth = Math.max(
    44,
    requestedWidth ??
      (iconOnly
        ? baseHeight
        : Math.max(100, label ? label.length * 9 + dimension.padding * 2 : 100)),
  );
  const accent = accentFor(variant);
  const disabledBackgroundColor = disabledColors?.background ?? disabledBackground;
  const disabledBorderColor = disabledColors?.border ?? disabledBorder;
  const disabledTextColor = disabledColors?.text ?? palette?.text ?? defaultThemeContext.palette.text;
  const inlineTextStyle = {
    fontSize: dimension.fontSize,
    color: disabled ? disabledTextColor : variant === 'ghost' ? accent : '#FFFFFF',
    fontWeight: '700' as const,
  };
  const isDisabled = disabled;
  const interactionDisabled = disabled || displayStatus === 'loading';
  const measuredWidth = useSharedValue(initialWidth);
  const animatedWidth = useSharedValue(initialWidth);
  const animatedHeight = useSharedValue(baseHeight);
  const pressedProgress = useSharedValue(0);
  const haloProgress = useSharedValue(1);
  const glowProgress = useSharedValue(0);
  const loadingProgress = useSharedValue(0);
  const successProgress = useSharedValue(0);
  const errorProgress = useSharedValue(0);
  const rotation = useSharedValue(0);
  const floatProgress = useSharedValue(0);
  const errorShake = useSharedValue(0);
  const checkProgress = useSharedValue(0);
  const sweepProgress = useSharedValue(0);
  const sweepStarted = useRef(false);

  const reportLayout = useCallback(
    (event: { nativeEvent: { layout: { width: number } } }) => {
      if (
        displayStatus !== 'loading' &&
        displayStatus !== 'success' &&
        successProgress.value === 0
      ) {
        const measured = Math.max(requestedWidth ?? 0, event.nativeEvent.layout.width);
        measuredWidth.value = measured;
        animatedWidth.value = measured;
      }
    },
    [animatedWidth, displayStatus, measuredWidth, requestedWidth, successProgress],
  );
  const handlePressIn = useCallback(
    (event: Parameters<NonNullable<PressableProps['onPressIn']>>[0]) => {
      pressedProgress.value = effectsLevel === 'off' ? 0 : withTiming(1, { duration: 100 });
      if (!reducedMotion && !isDisabled) {
        cancelAnimation(haloProgress);
        haloProgress.value = 0;
        haloProgress.value = withTiming(1, { duration: 480 });
      }
      onPressIn?.(event);
    },
    [effectsLevel, haloProgress, isDisabled, onPressIn, pressedProgress, reducedMotion],
  );
  const handlePressOut = useCallback(
    (event: Parameters<NonNullable<PressableProps['onPressOut']>>[0]) => {
      pressedProgress.value = effectsLevel === 'off' ? 0 : withTiming(0, { duration: 180 });
      onPressOut?.(event);
    },
    [effectsLevel, onPressOut, pressedProgress],
  );

  useEffect(() => {
    cancelAnimation(glowProgress);
    if (reducedMotion || isDisabled || displayStatus !== 'idle' || variant === 'ghost') {
      glowProgress.value = 0;
      return;
    }
    glowProgress.value = withRepeat(withTiming(1, { duration: 2800 }), -1, true);
    return () => cancelAnimation(glowProgress);
  }, [displayStatus, glowProgress, isDisabled, reducedMotion, variant]);

  useEffect(() => {
    if (!sweepOnMount || reducedMotion || variant !== 'primary' || sweepStarted.current) return;
    sweepStarted.current = true;
    sweepProgress.value = withTiming(1, { duration: 850, easing: Easing.out(Easing.cubic) });
  }, [reducedMotion, sweepOnMount, sweepProgress, variant]);

  useEffect(() => {
    const loading = displayStatus === 'loading';
    const circle = loading || displayStatus === 'success';
    const targetWidth = circle ? 56 : measuredWidth.value;
    animatedWidth.value = reducedMotion
      ? targetWidth
      : withTiming(targetWidth, { duration: 320, easing: Easing.out(Easing.cubic) });
    animatedHeight.value = reducedMotion
      ? circle
        ? 56
        : baseHeight
      : withTiming(circle ? 56 : baseHeight, { duration: 320, easing: Easing.out(Easing.cubic) });
    loadingProgress.value = reducedMotion
      ? Number(loading)
      : withTiming(Number(loading), { duration: 260 });
    cancelAnimation(rotation);
    cancelAnimation(floatProgress);
    if (loading && !reducedMotion) {
      rotation.value = withRepeat(withTiming(360, { duration: 1000, easing: Easing.linear }), -1);
      floatProgress.value = withRepeat(
        withSequence(withTiming(1, { duration: 450 }), withTiming(0, { duration: 450 })),
        -1,
      );
    } else {
      rotation.value = 0;
      floatProgress.value = 0;
    }
    return () => {
      cancelAnimation(rotation);
      cancelAnimation(floatProgress);
    };
  }, [
    animatedHeight,
    animatedWidth,
    baseHeight,
    loadingProgress,
    measuredWidth,
    reducedMotion,
    rotation,
    floatProgress,
    displayStatus,
  ]);

  useEffect(() => {
    if (displayStatus !== 'success') {
      successProgress.value = 0;
      checkProgress.value = 0;
      return;
    }
    successProgress.value = reducedMotion ? 1 : withTiming(1, { duration: 220 });
    if (!reducedMotion) {
      checkProgress.value = withDelay(180, withTiming(1, { duration: 450 }));
    } else {
      checkProgress.value = 1;
    }
    const reset = setTimeout(() => {
      successProgress.value = reducedMotion ? 0 : withTiming(0, { duration: 220 });
      checkProgress.value = 0;
      animatedWidth.value = reducedMotion
        ? measuredWidth.value
        : withTiming(measuredWidth.value, { duration: 260 });
    }, 1200);
    return () => clearTimeout(reset);
  }, [animatedWidth, checkProgress, measuredWidth, reducedMotion, displayStatus, successProgress]);

  useEffect(() => {
    if (displayStatus !== 'error') {
      errorProgress.value = reducedMotion ? 0 : withTiming(0, { duration: 180 });
      errorShake.value = 0;
      return;
    }
    errorProgress.value = reducedMotion
      ? 1
      : withSequence(withTiming(1, { duration: 100 }), withTiming(0, { duration: 900 }));
    if (!reducedMotion && !externalShake) {
      errorShake.value = withSequence(
        withTiming(-6, { duration: 45 }),
        withTiming(6, { duration: 45 }),
        withTiming(-4, { duration: 45 }),
        withTiming(4, { duration: 45 }),
        withTiming(0, { duration: 45 }),
      );
    }
  }, [displayStatus, errorProgress, errorShake, externalShake, reducedMotion]);

  const shellStyle = useAnimatedStyle(() => {
    const breathing = interpolate(glowProgress.value, [0, 1], [0.12, 0.32]);
    const glowAmount = Math.max(breathing, pressedProgress.value * 0.7);
    return {
      width: animatedWidth.value,
      height: animatedHeight.value,
      borderRadius: theme.radius.pill,
      opacity: 1,
      borderColor: interpolateColor(
        errorProgress.value,
        [0, 1],
        [
          interpolateColor(loadingProgress.value, [0, 1], [accent, 'rgba(31,229,160,0.24)']),
          '#FF5C6C',
        ],
      ),
      shadowColor: accent,
      shadowOpacity: isDisabled
        ? 0
        : variant === 'ghost'
          ? pressedProgress.value * 0.42
          : Platform.OS === 'android'
            ? 0
            : glowAmount,
      shadowRadius: isDisabled ? 0 : interpolate(pressedProgress.value, [0, 1], [8, 18]),
      elevation: Platform.OS === 'android' ? 0 : 3,
      transform: [
        { translateX: errorShake.value + (externalShake?.value ?? 0) },
        { scale: interpolate(pressedProgress.value, [0, 1], [1, 0.94]) },
      ],
    };
  });
  const measurementStyle = useAnimatedStyle(() => ({
    ...(stretch ? {} : { width: animatedWidth.value }),
    height: animatedHeight.value,
  }));
  const androidGlowStyle = useAnimatedStyle(() => ({
    opacity:
      isDisabled || displayStatus === 'loading'
        ? 0
        : variant === 'ghost'
          ? pressedProgress.value * 0.45
          : Math.max(0.12, glowProgress.value * 0.25, pressedProgress.value * 0.45),
    transform: [{ scale: interpolate(pressedProgress.value, [0, 1], [1, 1.08]) }],
  }));
  const fillStyle = useAnimatedStyle(() => ({
    opacity: 1 - loadingProgress.value * 0.95,
  }));
  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressedProgress.value, [0, 1], [1, 0.96]) }],
  }));
  const rightIconStyle = useAnimatedStyle(() => ({
    opacity: 1 - successProgress.value,
    transform: [{ translateX: interpolate(floatProgress.value, [0, 1], [0, 3]) }],
  }));
  const labelStyle = useAnimatedStyle(() => ({
    width:
      (label?.length ?? 0) *
      dimension.fontSize *
      0.62 *
      (1 - loadingProgress.value) *
      (1 - successProgress.value),
    opacity: (1 - loadingProgress.value) * (1 - successProgress.value),
    transform: [{ scale: interpolate(pressedProgress.value, [0, 1], [1, 0.96]) }],
  }));
  const loadingStyle = useAnimatedStyle(() => ({
    opacity: loadingProgress.value * (1 - successProgress.value),
    transform: [{ rotate: `${rotation.value}deg` }],
  }));
  const successStyle = useAnimatedStyle(() => ({
    opacity: successProgress.value,
    transform: [{ scale: interpolate(successProgress.value, [0, 1], [0.75, 1]) }],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: interpolate(haloProgress.value, [0, 1], [reducedMotion ? 0 : 0.45, 0]),
    transform: [{ scale: interpolate(haloProgress.value, [0, 1], [1, 1.35]) }],
  }));
  const sweepStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sweepProgress.value, [0, 0.12, 0.88, 1], [0, 0.8, 0.8, 0]),
    transform: [
      {
        translateX: interpolate(sweepProgress.value, [0, 1], [-56, measuredWidth.value + 56]),
      },
    ],
  }));
  const checkProps = useAnimatedProps(() => ({
    strokeDashoffset: 42 * (1 - checkProgress.value),
  }));
  const primaryColors = useMemo(
    () =>
      variant === 'danger'
        ? (['#FF5C6C', '#B8273D'] as const)
        : ([theme.colors.primary, theme.colors.primaryDark] as const),
    [variant],
  );
  const glowLayer =
    Platform.OS === 'android' ? (
      <Animated.View pointerEvents="none" style={[styles.androidGlow, androidGlowStyle]}>
        <BlurView pointerEvents="none" intensity={32} tint="dark" style={StyleSheet.absoluteFill} />
        <LinearGradient
          pointerEvents="none"
          colors={[
            variant === 'danger' ? 'rgba(255,92,108,0.42)' : 'rgba(31,229,160,0.42)',
            variant === 'danger' ? 'rgba(184,39,61,0.16)' : 'rgba(15,92,65,0.14)',
            'transparent',
          ]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    ) : null;

  return (
    <Animated.View
      onLayout={reportLayout}
      style={[
        styles.measurement,
        { width: stretch ? '100%' : (requestedWidth ?? initialWidth), height: baseHeight },
        measurementStyle,
      ]}
    >
      {glowLayer}
      <Animated.View
        testID="button-shell"
        style={[
          styles.shell,
          shellStyle,
          variant === 'primary' && styles.primaryBorder,
          variant === 'secondary' && styles.secondaryShell,
          variant === 'ghost' && styles.ghostShell,
          variant === 'danger' && styles.dangerShell,
          iconOnly && styles.iconOnlyShell,
          buttonStyle,
          isDisabled && {
            backgroundColor: disabledBackgroundColor,
            borderColor: disabledBorderColor,
          },
        ]}
      >
        {(variant === 'primary' || variant === 'danger') && !isDisabled ? (
          <Animated.View
            pointerEvents="none"
            testID="button-gradient"
            style={[StyleSheet.absoluteFill, styles.gradientLayer, fillStyle]}
          >
            <LinearGradient
              pointerEvents="none"
              colors={primaryColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        ) : null}
        {sweepOnMount && variant === 'primary' && (
          <View pointerEvents="none" style={styles.entrySweepClip}>
            <Animated.View pointerEvents="none" style={[styles.entrySweep, sweepStyle]}>
              <LinearGradient
                pointerEvents="none"
                colors={['transparent', theme.colors.primary, 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>
        )}
        <Animated.View pointerEvents="none" style={[styles.halo, haloStyle]}>
          <View style={[styles.haloCircle, { borderColor: accent }]} />
        </Animated.View>
        <Animated.View pointerEvents="none" style={[styles.spinner, loadingStyle]}>
          <Svg pointerEvents="none" width={baseHeight} height={baseHeight} viewBox="0 0 56 56">
            <Circle
              cx={28}
              cy={28}
              r={23}
              fill="none"
              stroke={accent}
              strokeWidth={2}
              strokeDasharray="36 109"
              strokeLinecap="round"
            />
          </Svg>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[styles.successMark, successStyle]}>
          <Svg pointerEvents="none" width={baseHeight} height={baseHeight} viewBox="0 0 56 56">
            <AnimatedPath
              d="M15 29L24 38L42 19"
              fill="none"
              stroke={accent}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={42}
              animatedProps={checkProps}
            />
          </Svg>
        </Animated.View>
        <PressableScale
          {...pressableProps}
          accessibilityRole={pressableProps.accessibilityRole ?? 'button'}
          accessibilityLabel={pressableProps.accessibilityLabel ?? label ?? 'Action'}
          accessibilityState={{
            ...pressableProps.accessibilityState,
            disabled: interactionDisabled,
            busy: displayStatus === 'loading',
          }}
          disabled={interactionDisabled}
          featureKey={featureKey}
          onActionStatusChange={actionFeedback ? setActionStatus : undefined}
          haptic={haptic}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.pressable}
        >
          <Animated.View style={[styles.content, contentStyle]}>
            {renderButtonContent(leftIcon, inlineTextStyle)}
            {label ? (
              <Animated.View style={[styles.labelWrapper, labelStyle]}>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.label,
                    {
                      fontSize: dimension.fontSize,
                      color: disabled
                        ? disabledTextColor
                        : variant === 'ghost'
                          ? accent
                          : '#FFFFFF',
                    },
                    iconOnly && styles.iconOnlyLabel,
                  ]}
                >
                  {label}
                </Text>
              </Animated.View>
            ) : null}
            {renderButtonContent(children, inlineTextStyle)}
            {rightIcon ? (
              <Animated.View style={rightIconStyle}>
                {renderButtonContent(rightIcon, inlineTextStyle)}
              </Animated.View>
            ) : null}
          </Animated.View>
        </PressableScale>
      </Animated.View>
    </Animated.View>
  );
}

function renderButtonContent(content: ReactNode, textStyle: TextStyle): ReactNode {
  if (typeof content === 'string' || typeof content === 'number') {
    return <Text style={textStyle}>{content}</Text>;
  }
  if (Array.isArray(content)) {
    return content.map((item, index) => (
      <Fragment key={index}>{renderButtonContent(item, textStyle)}</Fragment>
    ));
  }
  return content;
}

export default memo(GlowButton);

const styles = StyleSheet.create({
  measurement: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shell: {
    position: 'relative',
    minWidth: 56,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  primaryBorder: {
    borderColor: 'rgba(31,229,160,0.75)',
  },
  secondaryShell: {
    borderColor: 'rgba(31,229,160,0.4)',
  },
  ghostShell: {
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    elevation: 0,
  },
  dangerShell: {
    borderColor: 'rgba(255,92,108,0.8)',
  },
  iconOnlyShell: {
    width: '100%',
    minWidth: 0,
    height: '100%',
    borderRadius: 999,
  },
  gradientLayer: {
    overflow: 'hidden',
    borderRadius: theme.radius.pill,
  },
  entrySweepClip: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    borderRadius: theme.radius.pill,
  },
  entrySweep: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 56,
  },
  androidGlow: {
    position: 'absolute',
    top: -8,
    right: -8,
    bottom: -8,
    left: -8,
    overflow: 'hidden',
    borderRadius: 32,
  },
  halo: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 56,
    height: 56,
    marginTop: -28,
    marginLeft: -28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  haloCircle: {
    width: 56,
    height: 56,
    borderWidth: 1,
    borderRadius: 28,
  },
  spinner: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successMark: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressable: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: theme.radius.pill,
    paddingHorizontal: 14,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: {
    fontWeight: '700',
  },
  labelWrapper: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOnlyLabel: {
    display: 'none',
  },
});
