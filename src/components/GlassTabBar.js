import React, { useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Search, Heart, Map, User, Users } from 'lucide-react-native';
import GlassView from './GlassView';
import { useChodhiQTheme } from '../context/ThemeContext';
import useReducedMotion from '../hooks/useMotionPreferences';
import { fonts, radius } from '../theme/theme';

const icons = {
  Home,
  Explore: Search,
  MapTab: Map,
  CommunityTab: Users,
  Saved: Heart,
  Profile: User,
};
const bubbleSize = 50;
const bubbleRise = 14;
const barHeight = 60;

export default function GlassTabBar({ state, descriptors, navigation }) {
  const { palette } = useChodhiQTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const position = useRef(new Animated.Value(state.index)).current;
  const stretch = useRef(new Animated.Value(1)).current;
  const routeCount = state.routes.length;
  const slotWidth = routeCount ? width / routeCount : 0;

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
    if (reducedMotion) {
      position.setValue(state.index);
      stretch.setValue(1);
      return undefined;
    }

    const animation = Animated.parallel([
      Animated.spring(position, {
        toValue: state.index,
        tension: 190,
        friction: 17,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(stretch, {
          toValue: 1.35,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(stretch, {
          toValue: 1,
          tension: 220,
          friction: 12,
          useNativeDriver: true,
        }),
      ]),
    ]);
    animation.start();
    return () => animation.stop();
  }, [position, reducedMotion, state.index, stretch]);

  if (keyboardVisible) return null;

  const bottomInset = Math.max(insets.bottom, 8);
  const translateX =
    slotWidth > 0 && routeCount > 1
      ? position.interpolate({
          inputRange: [0, routeCount - 1],
          outputRange: [
            (slotWidth - bubbleSize) / 2,
            slotWidth * (routeCount - 1) + (slotWidth - bubbleSize) / 2,
          ],
        })
      : 0;
  const scaleY = stretch.interpolate({ inputRange: [1, 1.35], outputRange: [1, 0.9] });

  return (
    <View
      style={[
        styles.container,
        {
          height: barHeight + bottomInset + 12,
          paddingBottom: bottomInset + 8,
          paddingTop: 4,
          paddingHorizontal: 12,
        },
      ]}
    >
      <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={styles.barFrame}>
        <GlassView
          androidBlurEnabled={false}
          intensity={34}
          style={[
            StyleSheet.absoluteFill,
            styles.plate,
            {
              backgroundColor: palette.dark ? 'rgba(8,10,9,0.88)' : 'rgba(255,255,255,0.84)',
              borderColor: palette.dark ? 'rgba(224,255,236,0.12)' : palette.border,
            },
          ]}
        />
        {slotWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.bubble,
              {
                backgroundColor: palette.primary,
                shadowColor: palette.primary,
                transform: [{ translateX }, { scaleX: stretch }, { scaleY }],
              },
            ]}
          />
        )}
        <View style={styles.row}>
          {state.routes.map((route, index) => {
            const options = descriptors[route.key].options;
            const label =
              typeof options.tabBarLabel === 'string'
                ? options.tabBarLabel
                : options.title || route.name;
            const focused = state.index === index;
            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };
            return (
              <TabItem
                key={route.key}
                Icon={icons[route.name] || Home}
                label={label}
                focused={focused}
                palette={palette}
                reducedMotion={reducedMotion}
                onPress={onPress}
                onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

function TabItem({ Icon, label, focused, palette, reducedMotion, onPress, onLongPress }) {
  const active = useRef(new Animated.Value(focused ? 1 : 0)).current;
  useEffect(() => {
    if (reducedMotion) {
      active.setValue(focused ? 1 : 0);
      return undefined;
    }
    const animation = Animated.spring(active, {
      toValue: focused ? 1 : 0,
      tension: 220,
      friction: 16,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [active, focused, reducedMotion]);

  const translateY = active.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -(bubbleRise - 1)],
  });
  const scale = active.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.item}
    >
      <Animated.View style={{ transform: [{ translateY }, { scale }] }}>
        <Icon
          size={22}
          strokeWidth={focused ? 2.5 : 2}
          color={focused ? palette.onPrimary : palette.muted}
        />
      </Animated.View>
      <Animated.Text
        numberOfLines={1}
        style={[
          styles.label,
          { color: focused ? palette.primary : palette.muted, opacity: active },
        ]}
      >
        {label}
      </Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative', width: '100%' },
  barFrame: { position: 'relative', width: '100%', height: barHeight },
  plate: { borderRadius: 24, borderWidth: 1 },
  row: { flexDirection: 'row', height: barHeight },
  item: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
    gap: 3,
  },
  label: {
    fontSize: 10,
    lineHeight: 12,
    fontFamily: fonts.semibold,
    includeFontPadding: false,
  },
  bubble: {
    position: 'absolute',
    top: -bubbleRise,
    left: 0,
    width: bubbleSize,
    height: bubbleSize,
    borderRadius: radius.pill,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
});
