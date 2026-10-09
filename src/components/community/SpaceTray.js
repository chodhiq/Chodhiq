import { MotionTouchable as TouchableOpacity } from '../Motion';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import { MessageCircle, Store } from 'lucide-react-native';
import Text from './MelaText';
import { useChodhiQTheme } from '../../context/ThemeContext';
import { melaHeadingFont } from '../../theme/mela';
import useReducedMotion from './useReducedMotion';

export function SpaceAccentBar({ accent, children, style }) {
  const { palette } = useChodhiQTheme();
  const previous = useRef(accent);
  const value = useRef(new Animated.Value(1)).current;
  const [range, setRange] = useState([accent, accent]);
  const reduced = useReducedMotion();
  useEffect(() => {
    value.stopAnimation();
    setRange([previous.current, accent]);
    previous.current = accent;
    value.setValue(0);
    Animated.timing(value, {
      toValue: 1,
      duration: reduced ? 0 : 150,
      useNativeDriver: false,
    }).start();
  }, [accent, reduced, value]);
  return (
    <Animated.View
      style={[
        style,
        {
          backgroundColor: palette.surface,
          borderBottomWidth: 3,
          borderBottomColor: value.interpolate({ inputRange: [0, 1], outputRange: range }),
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

function SpaceIcon({ space, active, palette, onPress }) {
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(active ? 1.15 : 1)).current;
  useEffect(() => {
    Animated.timing(scale, {
      toValue: active ? 1.15 : 1,
      duration: reduced ? 0 : 150,
      useNativeDriver: true,
    }).start();
  }, [active, reduced, scale]);
  const Icon = space.slug === 'general' ? Store : MessageCircle;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${space.name} community space`}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={styles.space}
    >
      <Animated.View
        style={[
          styles.circle,
          {
            backgroundColor: palette.surface,
            borderColor: active ? palette.primary : palette.border,
            transform: [{ scale }],
          },
        ]}
      >
        <Icon size={23} color={palette.text} />
      </Animated.View>
      <Text
        numberOfLines={2}
        style={{
          color: palette.text,
          fontFamily: melaHeadingFont,
          fontSize: 13,
          textAlign: 'center',
        }}
      >
        {space.name}
      </Text>
    </TouchableOpacity>
  );
}

export default function SpaceTray({ spaces, selected, palette, onSelect }) {
  return (
    <View style={{ marginTop: 16 }}>
      <Text
        style={{
          color: palette.text,
          fontFamily: melaHeadingFont,
          fontSize: 18,
          marginHorizontal: 24,
        }}
      >
        Your spaces
      </Text>
      <Text style={{ color: palette.text2, fontSize: 12, marginHorizontal: 24, marginTop: 6 }}>
        General is the shared space for everyone. Choose a space to see its posts.
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tray}
      >
        {spaces.map((space) => (
          <SpaceIcon
            key={space.slug}
            space={space}
            active={selected === space.slug}
            palette={palette}
            onPress={() => onSelect(space.slug)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tray: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 10, gap: 8 },
  space: { width: 82, minHeight: 100, alignItems: 'center', gap: 12 },
  circle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
