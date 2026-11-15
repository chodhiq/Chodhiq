/* eslint-disable react-hooks/immutability -- Reanimated shared values are intentionally mutated in handlers and effects. */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Search, Heart, Map, User, Users } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useChodhiQTheme, defaultThemeContext } from '../context/ThemeContext';
import useEffectsLevel from '../hooks/useEffectsLevel';
import { colors as fallbackColors, fonts, radius } from '../theme/theme';
import { getActiveScreenName } from '../lib/activeScreen';
import {
  getTabBarOverlayHeight,
  getTabBarSafeBottom,
  TAB_BAR_BOTTOM_PADDING,
  TAB_BAR_HEIGHT,
} from '../navigation/tabBarLayout';

const routes = {
  Home: { label: 'Home', testId: 'tab-home', Icon: Home },
  Explore: { label: 'Search', testId: 'tab-search', Icon: Search },
  MapTab: { label: 'Map', testId: 'tab-map', Icon: Map },
  CommunityTab: { label: 'Community', testId: 'tab-community', Icon: Users },
  Saved: { label: 'Saved', testId: 'tab-saved', Icon: Heart },
  Profile: { label: 'Profile', testId: 'tab-profile', Icon: User },
};

const barHeight = TAB_BAR_HEIGHT;
const capsuleInset = 4;
const capsuleHeight = barHeight - capsuleInset * 2;
const barSideMargin = 16;
const maximumBarWidth = 380;
const defaultPalette = defaultThemeContext?.palette || {
  background: fallbackColors.background,
  bg: fallbackColors.background,
  primary: fallbackColors.primary,
  primaryTint: fallbackColors.primaryLight,
  text: fallbackColors.textPrimary,
  textPrimary: fallbackColors.textPrimary,
  textTertiary: fallbackColors.textMuted,
  textSecondary: fallbackColors.textSecondary,
};

function withAlpha(color, alpha, fallback) {
  const value = typeof color === 'string' ? color : fallback;
  if (typeof value !== 'string') return value;

  const hex = value.match(/^#([\da-f]{3}|[\da-f]{6})$/i)?.[1];
  if (hex) {
    const expanded =
      hex.length === 3 ? [...hex].map((character) => character + character).join('') : hex;
    const channels = expanded.match(/[\da-f]{2}/gi).map((channel) => Number.parseInt(channel, 16));
    return `rgba(${channels[0]},${channels[1]},${channels[2]},${alpha})`;
  }

  const rgb = value.match(/^rgba?\(([^)]+)\)$/i)?.[1];
  if (rgb) {
    const channels = rgb
      .split(',')
      .slice(0, 3)
      .map((channel) => channel.trim());
    if (channels.length === 3) return `rgba(${channels.join(',')},${alpha})`;
  }
  return value;
}

function getRouteLayout(layouts, index, barWidth, routeCount) {
  const measured = layouts[index];
  if (measured && Number.isFinite(measured.x) && Number.isFinite(measured.width)) return measured;
  const width = routeCount > 0 ? barWidth / routeCount : 0;
  return { x: index * width, width };
}

export function getTabBarWidth(windowWidth) {
  return Math.min(Math.max(windowWidth - barSideMargin * 2, 0), maximumBarWidth);
}

export default function GlassTabBar({ state, descriptors, navigation, blurTarget }) {
  const themeContext = useChodhiQTheme();
  const palette = themeContext?.palette || defaultPalette;
  const insets = useSafeAreaInsets();
  const effectsLevel = useEffectsLevel();
  const fullEffects = effectsLevel === 'full';
  const { width: windowWidth } = useWindowDimensions();
  const [barWidth, setBarWidth] = useState(getTabBarWidth(windowWidth));
  const [layoutRevision, setLayoutRevision] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const routeCount = state.routes.length;
  const initialTabWidth = routeCount > 0 ? barWidth / routeCount : 0;
  const initialLayout = {
    x: state.index * initialTabWidth,
    width: initialTabWidth,
  };
  const capsuleX = useSharedValue(initialLayout.x + capsuleInset);
  const capsuleWidth = useSharedValue(Math.max(initialLayout.width - capsuleInset * 2, 0));
  const fromX = useSharedValue(initialLayout.x + capsuleInset);
  const toX = useSharedValue(initialLayout.x + capsuleInset);
  const fromWidth = useSharedValue(Math.max(initialLayout.width - capsuleInset * 2, 0));
  const toWidth = useSharedValue(Math.max(initialLayout.width - capsuleInset * 2, 0));
  const transitionProgress = useSharedValue(1);
  const fromIndex = useSharedValue(state.index);
  const toIndex = useSharedValue(state.index);
  const routeLayouts = useRef([]);
  const activeIndex = useRef(state.index);
  const isTransitioning = useRef(false);

  const measureBar = useCallback((event) => {
    const measuredWidth = event?.nativeEvent?.layout?.width;
    if (Number.isFinite(measuredWidth) && measuredWidth > 0) setBarWidth(measuredWidth);
  }, []);

  const measureTab = useCallback(
    (index, event) => {
      const layout = event?.nativeEvent?.layout;
      if (!Number.isFinite(layout?.x) || !Number.isFinite(layout?.width) || layout.width <= 0)
        return;
      routeLayouts.current[index] = { x: layout.x, width: layout.width };
      setLayoutRevision((revision) => revision + 1);

      if (index === activeIndex.current && !isTransitioning.current) {
        const nextX = layout.x + capsuleInset;
        const nextWidth = Math.max(layout.width - capsuleInset * 2, 0);
        capsuleX.value = nextX;
        capsuleWidth.value = nextWidth;
        fromX.value = nextX;
        toX.value = nextX;
        fromWidth.value = nextWidth;
        toWidth.value = nextWidth;
      }
    },
    [capsuleWidth, capsuleX, fromWidth, fromX, toWidth, toX],
  );

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    const nextIndex = Math.max(0, Math.min(state.index, routeCount - 1));
    const previousIndex = activeIndex.current;
    const previousLayout = getRouteLayout(
      routeLayouts.current,
      previousIndex,
      barWidth,
      routeCount,
    );
    const nextLayout = getRouteLayout(routeLayouts.current, nextIndex, barWidth, routeCount);
    const nextX = nextLayout.x + capsuleInset;
    const nextWidth = Math.max(nextLayout.width - capsuleInset * 2, 0);

    if (nextIndex === previousIndex) {
      if (!isTransitioning.current) {
        capsuleX.value = nextX;
        capsuleWidth.value = nextWidth;
        fromX.value = nextX;
        toX.value = nextX;
        fromWidth.value = nextWidth;
        toWidth.value = nextWidth;
        fromIndex.value = nextIndex;
        toIndex.value = nextIndex;
        transitionProgress.value = 1;
      }
      return;
    }

    activeIndex.current = nextIndex;
    isTransitioning.current = fullEffects;
    const previousX = capsuleX.value;
    const previousWidth = capsuleWidth.value;
    fromX.value = Number.isFinite(previousX) ? previousX : previousLayout.x + capsuleInset;
    fromWidth.value = Number.isFinite(previousWidth)
      ? previousWidth
      : Math.max(previousLayout.width - capsuleInset * 2, 0);
    toX.value = nextX;
    toWidth.value = nextWidth;
    fromIndex.value = previousIndex;
    toIndex.value = nextIndex;

    if (!fullEffects) {
      capsuleX.value = nextX;
      capsuleWidth.value = nextWidth;
      fromX.value = nextX;
      fromWidth.value = nextWidth;
      fromIndex.value = nextIndex;
      transitionProgress.value = 1;
      isTransitioning.current = false;
      return;
    }

    transitionProgress.value = 0;
    transitionProgress.value = withSpring(1, { damping: 20, stiffness: 220 }, (finished) => {
      if (finished) {
        capsuleX.value = nextX;
        capsuleWidth.value = nextWidth;
      }
    });
    isTransitioning.current = false;
  }, [
    barWidth,
    capsuleWidth,
    capsuleX,
    fromIndex,
    fromWidth,
    fromX,
    fullEffects,
    layoutRevision,
    routeCount,
    state.index,
    toIndex,
    toWidth,
    toX,
    transitionProgress,
  ]);

  const capsuleStyle = useAnimatedStyle(() => {
    const progress = transitionProgress.value;
    return {
      width: fromWidth.value + (toWidth.value - fromWidth.value) * progress,
      transform: [{ translateX: fromX.value + (toX.value - fromX.value) * progress }],
    };
  });

  if (keyboardVisible || getActiveScreenName() === 'ProviderDetail') return null;

  const primary = palette.primary || defaultPalette.primary;
  const primaryTint = palette.primaryTint || defaultPalette.primaryTint || primary;
  const activeText =
    palette.text || palette.textPrimary || defaultPalette.text || defaultPalette.textPrimary;
  const inactiveText = palette.textSecondary || defaultPalette.textSecondary;
  const bottomInset = getTabBarSafeBottom(insets.bottom);
  const background =
    palette.background || palette.bg || defaultPalette.background || defaultPalette.bg;
  const canBlur = fullEffects && (Platform.OS !== 'android' || Boolean(blurTarget?.current));
  return (
        <View
      testID="glass-tabbar-container"
      pointerEvents="box-none"
      style={[
        styles.container,
        {
          height: getTabBarOverlayHeight(insets.bottom),
          paddingBottom: bottomInset + TAB_BAR_BOTTOM_PADDING,
        },
      ]}
    >
      <View
        testID="glass-tabbar-frame"
        onLayout={measureBar}
        pointerEvents="box-none"
        style={styles.barFrame}
      >
        <View
          pointerEvents="none"
          testID="glass-tabbar-surface"
          style={[
            StyleSheet.absoluteFill,
            styles.glassSurface,
            {
              backgroundColor: canBlur
                ? 'transparent'
                : withAlpha(background, 0.7, defaultPalette.background || defaultPalette.bg),
                borderColor: withAlpha(primary, 0.12, defaultPalette.primary),
            },
          ]}
        >
          {canBlur ? (
            <BlurFallbackBoundary
              fallback={
                <View
                  pointerEvents="none"
                  style={[
                    StyleSheet.absoluteFill,
                    { backgroundColor: withAlpha(background, 0.7, defaultPalette.background) },
                  ]}
                />
              }
            >
              <>
                <BlurView
                  testID="glass-tabbar-background-blur"
                  intensity={58}
                  tint="default"
                  blurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : 'none'}
                  blurTarget={blurTarget}
                  style={StyleSheet.absoluteFill}
                />
                <View
                  pointerEvents="none"
                  style={[
                    StyleSheet.absoluteFill,
                    { backgroundColor: withAlpha(background, 0.35, defaultPalette.background) },
                  ]}
                />
              </>
            </BlurFallbackBoundary>
          ) : null}
        </View>
        <Animated.View
          pointerEvents="none"
          testID="tab-active-capsule"
          style={[
            styles.capsule,
            capsuleStyle,
            {
              borderColor: withAlpha(primary, 0.55, defaultPalette.primary),
              shadowColor: primary,
            },
          ]}
        >
          <LinearGradient
            pointerEvents="none"
            colors={[
              withAlpha(primary, 0.1, defaultPalette.primary),
              withAlpha(primaryTint, 0.45, defaultPalette.primaryTint),
            ]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <View style={styles.row}>
          {state.routes.map((route, index) => {
            const option = routes[route.name] || {};
            const options = descriptors[route.key]?.options || {};
            const label =
              typeof options.tabBarLabel === 'string'
                ? options.tabBarLabel
                : options.title || option.label || route.name;
            const focused = state.index === index;
            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented)
                navigation.navigate(route.name, route.params);
            };
            const Icon = option.Icon || Home;

            return (
              <TabItem
                key={route.key}
                index={index}
                Icon={Icon}
                label={label}
                activeText={activeText}
                inactiveText={inactiveText}
                primary={primary}
                focused={focused}
                fromIndex={fromIndex}
                toIndex={toIndex}
                transitionProgress={transitionProgress}
                onLayout={(event) => measureTab(index, event)}
                onPress={onPress}
                onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
                testID={option.testId || `tab-${label.toLowerCase()}`}
                style={styles.tabSlot}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

class BlurFallbackBoundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function TabItem({
  index,
  Icon,
  label,
  activeText,
  inactiveText,
  primary,
  focused,
  fromIndex,
  toIndex,
  transitionProgress,
  onLayout,
  onPress,
  onLongPress,
  testID,
  style,
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      testID={testID}
      onLayout={onLayout}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.item, style]}
    >
      <View pointerEvents="none" style={styles.itemContent}>
        <View testID="tab-icon-slot" style={styles.iconSlot}>
          <Icon size={19} color={focused ? activeText : inactiveText} strokeWidth={2} />
        </View>
        <View testID="tab-label-slot" style={styles.labelSlot}>
          <Animated.Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            style={[styles.label, { color: focused ? activeText : inactiveText }]}
          >
            {label}
          </Animated.Text>
        </View>
        <View
          pointerEvents="none"
          style={[styles.underline, { backgroundColor: primary, opacity: focused ? 1 : 0 }]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: barSideMargin,
  },
  barFrame: {
    position: 'relative',
    width: '100%',
    maxWidth: maximumBarWidth,
    alignSelf: 'center',
    height: barHeight,
  },
  glassSurface: {
    overflow: 'hidden',
    borderRadius: Math.max(radius?.xl || 0, 30),
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    width: '100%',
    height: barHeight,
  },
  capsule: {
    position: 'absolute',
    top: capsuleInset,
    left: 0,
    height: capsuleHeight,
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: Math.max(radius?.xl || 0, 30),
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  item: {
    minWidth: 0,
    height: barHeight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 1,
  },
  tabSlot: {
    flex: 1,
    minWidth: 0,
  },
  itemContent: {
    width: '100%',
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  iconSlot: {
    width: 22,
    height: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelSlot: {
    width: '100%',
    minWidth: 0,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    width: '100%',
    textAlign: 'center',
    fontSize: 10,
    lineHeight: 12,
    fontFamily: fonts.semibold,
    includeFontPadding: false,
  },
  underline: {
    width: 18,
    height: 2,
    marginTop: 1,
    borderRadius: radius?.pill || 999,
  },
});
