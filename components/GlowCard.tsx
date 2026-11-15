import type { PropsWithChildren } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';
import { useEffect } from 'react';
import Animated, {
  cancelAnimation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import useEffectsLevel from '../src/hooks/useEffectsLevel';
import { theme } from '../theme';

interface GlowCardProps extends PropsWithChildren {
  isNew?: boolean;
  visible?: boolean;
  variant?: 'card' | 'row' | 'settings' | 'profile' | 'map';
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  swooshStyle?: StyleProp<ViewStyle>;
  glowIntensity?: number;
  showAccentDecoration?: boolean;
  shadowTint?: 'primary' | 'none';
}

export default function GlowCard({
  children,
  isNew = false,
  visible = true,
  variant = 'card',
  style,
  contentStyle,
  swooshStyle,
  glowIntensity = 1,
  showAccentDecoration = true,
  shadowTint = 'primary',
}: GlowCardProps) {
  const effectsLevel = useEffectsLevel();
  const canGlow = effectsLevel === 'full' && visible;
  const canAnimate = effectsLevel === 'full' && visible;
  const progress = useSharedValue(0);
  const landingProgress = useSharedValue(1);
  const flashProgress = useSharedValue(1);

  useEffect(() => {
    cancelAnimation(progress);
    if (!canGlow) {
      progress.value = 0;
      return;
    }
    progress.value = withRepeat(withTiming(1, { duration: 2800 }), -1, true);
    return () => cancelAnimation(progress);
  }, [canGlow, progress]);

  useEffect(() => {
    cancelAnimation(landingProgress);
    cancelAnimation(flashProgress);
    if (!isNew || !canAnimate) {
      landingProgress.value = 1;
      flashProgress.value = 1;
      return;
    }
    landingProgress.value = 0;
    landingProgress.value = withTiming(1, { duration: 1200 });
    flashProgress.value = 0;
    flashProgress.value = withTiming(1, { duration: 900 });
    return () => {
      cancelAnimation(landingProgress);
      cancelAnimation(flashProgress);
    };
  }, [canAnimate, flashProgress, isNew, landingProgress]);

  const shadowStyle = useAnimatedStyle(() => ({
    shadowOpacity:
      shadowTint === 'none'
        ? 0
        : (isNew && flashProgress.value < 1
            ? interpolate(flashProgress.value, [0, 1], [0.8, 0.2])
            : effectsLevel === 'off'
              ? 0
              : canGlow
                ? interpolate(progress.value, [0, 1], [0.12, 0.34])
                : 0.12) * glowIntensity,
    shadowRadius:
      shadowTint === 'none'
        ? 0
        : isNew && flashProgress.value < 1
          ? interpolate(flashProgress.value, [0, 1], [24, 10])
          : effectsLevel === 'off'
            ? 0
            : canGlow
              ? interpolate(progress.value, [0, 1], [7, 16])
              : 10,
  }));
  const borderGlowStyle = useAnimatedStyle(() => ({
    borderColor:
      isNew && canAnimate
        ? interpolateColor(
            landingProgress.value,
            [0, 1],
            ['rgba(31,229,160,0.9)', theme.colors.border],
          )
        : theme.colors.border,
  }));
  const androidGlowStyle = useAnimatedStyle(() => ({
    opacity:
      (!visible
        ? 0
        : isNew && flashProgress.value < 1
          ? interpolate(flashProgress.value, [0, 1], [0.8, 0.16])
          : effectsLevel === 'off'
            ? 0
            : canGlow
              ? interpolate(progress.value, [0, 1], [0.08, 0.24])
              : 0.16) * glowIntensity,
  }));
  const highlightStyle = useAnimatedStyle(() => ({
    opacity: !canAnimate
      ? 0
      : interpolate(landingProgress.value, [0, 0.12, 0.72, 1], [0, 1, 0.9, 0]),
    transform: [{ scaleX: !canAnimate ? 0 : landingProgress.value }],
  }));

  const radius =
    variant === 'row' || variant === 'settings'
      ? 18
      : variant === 'profile'
        ? 24
        : variant === 'map'
          ? 20
          : theme.radius.card;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          borderRadius: radius,
          elevation: shadowTint === 'none' ? 0 : Math.round(3 * glowIntensity),
          shadowColor: shadowTint === 'none' ? 'transparent' : theme.colors.primary,
        },
        shadowStyle,
      ]}
    >
      <Animated.View
        style={[
          styles.card,
          variant !== 'card' && styles[variant],
          borderGlowStyle,
          style,
          { borderRadius: radius },
        ]}
      >
        {showAccentDecoration && Platform.OS === 'android' && effectsLevel !== 'off' && visible && (
          <Animated.View
            pointerEvents="none"
            style={[styles.androidGlow, { borderRadius: radius }, androidGlowStyle]}
          >
            <BlurView
              pointerEvents="none"
              intensity={36}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(31,229,160,0.42)', 'rgba(15,92,65,0.14)', 'transparent']}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        )}
        {showAccentDecoration && (
          <Svg
            pointerEvents="none"
            width={178}
            height={136}
            viewBox="0 0 178 136"
            style={[styles.swoosh, swooshStyle]}
          >
            <Defs>
              <SvgLinearGradient id="community-card-swoosh" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={theme.colors.primary} stopOpacity={0.35} />
                <Stop offset="1" stopColor={theme.colors.primary} stopOpacity={0} />
              </SvgLinearGradient>
            </Defs>
            <Path
              d="M56 0C94 24 126 36 178 34V0H56ZM178 34C140 62 126 96 114 136H178V34Z"
              fill="url(#community-card-swoosh)"
            />
          </Svg>
        )}
        {isNew && canAnimate && (
          <Animated.View pointerEvents="none" style={[styles.topHighlight, highlightStyle]}>
            <LinearGradient
              pointerEvents="none"
              colors={[
                'rgba(31,229,160,0)',
                'rgba(31,229,160,0.24)',
                'rgba(31,229,160,1)',
                'rgba(31,229,160,0.24)',
                'rgba(31,229,160,0)',
              ]}
              locations={[0, 0.42, 0.5, 0.58, 1]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        )}
        <View
          style={[styles.content, variant !== 'card' && styles[`${variant}Content`], contentStyle]}
        >
          {children}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  androidGlow: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    borderRadius: theme.radius.card,
  },
  card: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  swoosh: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    zIndex: 2,
  },
  content: {
    zIndex: 1,
    gap: 18,
    padding: 20,
  },
  row: {
    borderRadius: 18,
  },
  settings: {
    borderRadius: 18,
  },
  profile: {
    borderRadius: 24,
  },
  map: {
    borderRadius: 20,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  settingsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  profileContent: {
    padding: 18,
  },
  mapContent: {
    gap: 12,
    padding: 14,
  },
});
