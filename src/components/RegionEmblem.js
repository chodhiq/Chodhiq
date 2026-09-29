import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Text from './AppText';
import Svg, { Path, Circle } from 'react-native-svg';
import { useChodhiQTheme } from '../context/ThemeContext';

const REGIONS = {
  kerala: {
    label: 'Kerala',
    keywords: ['kerala', 'malayali', 'malayalam'],
    color: '#4F46E5',
    render: () => (
      <>
        <Path d="M9 26 h30 l-4 6 H13 z" fill="#FFFFFF" opacity={0.9} />
        <Path
          d="M14 26 V16 h14 v10"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        <Path d="M14 16 q7 -6 14 0" fill="none" stroke="#FFFFFF" strokeWidth={2} />
      </>
    ),
  },
  tamilnadu: {
    label: 'Tamil Nadu',
    keywords: ['tamil nadu', 'tamilnadu', 'tamil'],
    color: '#D6577A',
    render: () => (
      <>
        <Path d="M24 8 L30 16 H18 Z" fill="#FFFFFF" />
        <Path d="M20 16 h8 v4 h-8 z" fill="#FFFFFF" opacity={0.9} />
        <Path d="M16 20 h16 v4 h-16 z" fill="#FFFFFF" opacity={0.85} />
        <Path d="M12 24 h24 v8 h-24 z" fill="#FFFFFF" opacity={0.8} />
      </>
    ),
  },
  karnataka: {
    label: 'Karnataka',
    keywords: ['karnataka', 'kannada', 'kannadiga'],
    color: '#C9832E',
    render: () => (
      <>
        <Path d="M24 12 C16 14 15 24 24 32 C33 24 32 14 24 12 Z" fill="#FFFFFF" opacity={0.92} />
        <Path d="M24 12 V32" stroke="#C9832E" strokeWidth={1.4} opacity={0.6} />
      </>
    ),
  },
  andhratelangana: {
    label: 'Andhra Pradesh & Telangana',
    keywords: ['andhra pradesh', 'andhra', 'telangana', 'telugu'],
    color: '#7C5CD6',
    render: () => (
      <>
        <Circle cx={18} cy={20} r={3.2} fill="#FFFFFF" />
        <Circle cx={24} cy={17} r={3.2} fill="#FFFFFF" />
        <Circle cx={30} cy={20} r={3.2} fill="#FFFFFF" />
        <Path d="M20 26 q4 -3 8 0 q-2 6 -4 8 q-2 -2 -4 -8 Z" fill="#FFFFFF" opacity={0.9} />
      </>
    ),
  },
};

export default function RegionEmblem({ region, size = 56, selected = false, onPress }) {
  const config = REGIONS[region];
  const { palette } = useChodhiQTheme();
  if (!config) return null;
  return (
    <Pressable
      style={styles.wrapper}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Show posts mentioning ${config.label}`}
      accessibilityState={{ selected }}
    >
      <View
        style={[
          styles.ring,
          { width: size, height: size, borderRadius: size / 2 },
          selected && { borderWidth: 2, borderColor: palette.saffron },
        ]}
      >
        <Svg width={size} height={size} viewBox="0 0 48 48">
          <Circle cx={24} cy={24} r={24} fill={selected ? palette.primary : config.color} />
          {config.render()}
        </Svg>
      </View>
      <Text
        numberOfLines={2}
        style={[styles.label, { color: selected ? palette.saffron : palette.text2 }]}
      >
        {config.label}
      </Text>
    </Pressable>
  );
}

export const REGION_KEYS = Object.keys(REGIONS);
export const REGION_LABELS = Object.fromEntries(
  REGION_KEYS.map((key) => [key, REGIONS[key].label]),
);
export const REGION_KEYWORDS = Object.fromEntries(
  REGION_KEYS.map((key) => [key, REGIONS[key].keywords]),
);

const styles = StyleSheet.create({
  wrapper: { width: 72, alignItems: 'center', gap: 6 },
  ring: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  label: { fontSize: 11, fontWeight: '800', textAlign: 'center', color: '#737A96' },
});
