import { useCallback, useEffect, useState } from 'react';
import {
  type LayoutChangeEvent,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock3, Sparkles } from 'lucide-react-native';
import type { ComponentProps } from 'react';
import Animated, {
  cancelAnimation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import AnimatedPressable from './AnimatedPressable';
import useEffectsLevel from '../src/hooks/useEffectsLevel';
import { theme } from '../theme';

export type FeedTab = 'latest' | 'forYou';
type TabIcon = typeof Clock3;

export interface TabPillOption {
  id: string;
  label: string;
  Icon: TabIcon;
  disabled?: boolean;
  badge?: string;
}

export interface TabPillsProps {
  tabs?: TabPillOption[];
  value?: string;
  onChange?: (tab: string) => void;
}

const defaultTabs: TabPillOption[] = [
  { id: 'latest', label: 'Latest', Icon: Clock3 },
  { id: 'forYou', label: 'For you', Icon: Sparkles },
];

export default function TabPills({ tabs = defaultTabs, value, onChange }: TabPillsProps) {
  const effectsLevel = useEffectsLevel();
  const canAnimate = effectsLevel === 'full';
  const [uncontrolledTab, setUncontrolledTab] = useState(tabs[0]?.id ?? 'latest');
  const activeTab = value ?? uncontrolledTab;
  const rowWidth = useSharedValue(0);
  const activeIndex = useSharedValue(0);
  const indicatorStyle = useAnimatedStyle(() => {
    const slotWidth = Math.max(0, (rowWidth.value - 10 * (tabs.length - 1)) / tabs.length);
    return {
      width: 28,
      transform: [
        {
          translateX: activeIndex.value * (slotWidth + 10) + Math.max(0, (slotWidth - 28) / 2),
        },
      ],
    };
  });
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      // Reanimated shared values are updated from the native layout callback.
      // eslint-disable-next-line react-hooks/immutability
      rowWidth.value = event.nativeEvent.layout.width;
    },
    [rowWidth],
  );
  const selectTab = useCallback(
    (tab: string) => {
      const nextIndex = tabs.findIndex((item) => item.id === tab);
      // Reanimated shared values are updated from the press callback.
      // eslint-disable-next-line react-hooks/immutability
      activeIndex.value = canAnimate
        ? withSpring(nextIndex, { damping: 18, stiffness: 180 })
        : nextIndex;
      if (value === undefined) setUncontrolledTab(tab);
      onChange?.(tab);
    },
    [activeIndex, canAnimate, onChange, tabs, value],
  );
  useEffect(() => {
    const nextIndex = tabs.findIndex((item) => item.id === activeTab);
    if (nextIndex < 0) return;
    // Controlled tab changes can originate from scroll tracking outside this component.
    // eslint-disable-next-line react-hooks/immutability
    activeIndex.value = canAnimate
      ? withSpring(nextIndex, { damping: 18, stiffness: 180 })
      : nextIndex;
  }, [activeIndex, activeTab, canAnimate, tabs]);

  return (
    <View onLayout={handleLayout} style={styles.row}>
      {tabs.map(({ id, label, Icon, disabled = false, badge }) => {
        const isActive = activeTab === id;
        return (
          <TabPill
            key={id}
            label={label}
            Icon={Icon}
            badge={badge}
            isActive={isActive}
            disabled={disabled}
            onPress={() => selectTab(id)}
          />
        );
      })}
      <Animated.View pointerEvents="none" style={[styles.slidingIndicator, indicatorStyle]} />
    </View>
  );
}

interface TabPillProps {
  label: string;
  Icon: TabIcon;
  badge?: string;
  isActive: boolean;
  disabled: boolean;
  onPress: () => void;
}

function TabPill({ label, Icon, badge, isActive, disabled, onPress }: TabPillProps) {
  const { fontScale, width } = useWindowDimensions();
  const effectsLevel = useEffectsLevel();
  const canAnimate = effectsLevel === 'full';
  const progress = useSharedValue(0);
  const sweepProgress = useSharedValue(0);
  const activeFade = useSharedValue(isActive ? 1 : 0);
  const compact = width < 420 || fontScale > 1.25;

  useEffect(() => {
    cancelAnimation(progress);
    if (!canAnimate || !isActive) {
      progress.value = 0;
      return;
    }
    progress.value = withRepeat(withTiming(1, { duration: 2800 }), -1, true);
    return () => cancelAnimation(progress);
  }, [canAnimate, isActive, progress]);

  useEffect(() => {
    activeFade.value = canAnimate
      ? withTiming(isActive ? 1 : 0, { duration: 220 })
      : Number(isActive);
  }, [activeFade, canAnimate, isActive]);

  useEffect(() => {
    cancelAnimation(sweepProgress);
    if (!canAnimate || !isActive) {
      sweepProgress.value = 0;
      return;
    }
    sweepProgress.value = withRepeat(withTiming(1, { duration: 4000 }), -1, false);
    return () => cancelAnimation(sweepProgress);
  }, [canAnimate, isActive, sweepProgress]);

  const glowStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      activeFade.value,
      [0, 1],
      [theme.colors.border, 'rgba(31,229,160,0.7)'],
    ),
    shadowOpacity:
      (canAnimate ? interpolate(progress.value, [0, 1], [0.12, 0.32]) : 0.18) * activeFade.value,
    shadowRadius: canAnimate ? interpolate(progress.value, [0, 1], [6, 14]) : 9,
  }));
  const androidGlowStyle = useAnimatedStyle(() => ({
    opacity:
      !canAnimate || !isActive
        ? 0
        : interpolate(progress.value, [0, 1], [0.08, 0.24]) * activeFade.value,
  }));
  const fillStyle = useAnimatedStyle(() => ({ opacity: activeFade.value }));
  const sweepStyle = useAnimatedStyle(
    () => ({
      opacity: canAnimate ? activeFade.value : 0,
      transform: [{ translateX: interpolate(sweepProgress.value, [0, 1], [-100, 160]) }],
    }),
    [canAnimate],
  );
  const iconProps: ComponentProps<typeof Icon> = {
    color: isActive ? theme.colors.primary : theme.colors.textSecondary,
    size: 17,
    strokeWidth: 2,
  };

  return (
    <Animated.View style={[styles.pill, compact && styles.compactPill, glowStyle]}>
      {Platform.OS === 'android' && isActive && (
        <Animated.View pointerEvents="none" style={[styles.androidGlow, androidGlowStyle]}>
          <BlurView
            pointerEvents="none"
            intensity={32}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(31,229,160,0.4)', 'rgba(15,92,65,0.14)', 'transparent']}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
      <AnimatedPressable
        accessibilityRole="tab"
        accessibilityState={{ selected: isActive, disabled }}
        accessibilityLabel={label}
        accessibilityHint={disabled ? 'Coming soon' : undefined}
        disabled={disabled}
        onPress={onPress}
        style={styles.pressable}
      >
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.activeGradient, fillStyle]}
        >
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(31,229,160,0.12)', 'rgba(10,61,43,0.32)']}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <View pointerEvents="none" style={styles.sweepClip}>
          <Animated.View pointerEvents="none" style={[styles.sweep, sweepStyle]}>
            <LinearGradient
              pointerEvents="none"
              colors={['transparent', 'rgba(31,229,160,0.32)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
        <View style={[styles.pillContent, compact && styles.compactPillContent]}>
          <Icon {...iconProps} />
          <Text style={[styles.label, isActive && styles.activeLabel]}>{label}</Text>
          {badge ? <Text style={styles.badge}>{badge}</Text> : null}
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    position: 'relative',
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 5,
  },
  slidingIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 2,
    borderRadius: 1,
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.9,
    shadowRadius: 5,
    elevation: 2,
  },
  pill: {
    flex: 1,
    minHeight: 48,
    position: 'relative',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  compactPill: {
    minHeight: 56,
  },
  pressable: {
    flex: 1,
    minHeight: 46,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: 15,
  },
  activeGradient: {
    borderRadius: 14,
  },
  androidGlow: {
    position: 'absolute',
    top: -8,
    right: -8,
    bottom: -8,
    left: -8,
    overflow: 'hidden',
    borderRadius: 24,
  },
  sweepClip: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    borderRadius: 15,
  },
  sweep: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '65%',
  },
  pillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  compactPillContent: {
    flexDirection: 'column',
    gap: 3,
  },
  label: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    flexShrink: 1,
    textAlign: 'center',
  },
  activeLabel: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  badge: {
    overflow: 'hidden',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    backgroundColor: 'rgba(31,229,160,0.12)',
    color: theme.colors.primary,
    fontSize: 9,
    fontWeight: '700',
  },
});
