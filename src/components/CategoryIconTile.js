import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Icons from 'lucide-react-native';
import { radius, typography } from '../theme/theme';
import { PressableScale } from './Motion';
import { useChodhiQTheme } from '../context/ThemeContext';

const ICON_MAP = {
  cart: 'ShoppingCart',
  utensils: 'UtensilsCrossed',
  'shopping-basket': 'ShoppingBag',
  'heart-pulse': 'HeartPulse',
  sparkles: 'Sparkles',
  camera: 'Camera',
  calendar: 'CalendarDays',
  wrench: 'Wrench',
  sofa: 'Home',
  briefcase: 'BriefcaseBusiness',
  zap: 'Zap',
  droplet: 'Droplet',
  scissors: 'Scissors',
  'graduation-cap': 'GraduationCap',
  'cake-slice': 'CakeSlice',
  plane: 'Plane',
  car: 'Car',
  building: 'Building2',
  megaphone: 'Megaphone',
  users: 'Users',
};

const FALLBACK_PALETTE = ['#4F46E5', '#7C3AED', '#8B5CF6', '#6366F1', '#A855F7'];

export default function CategoryIconTile({ category, onPress, index = 0 }) {
  const { palette } = useChodhiQTheme();
  const IconComp = Icons[ICON_MAP[category.icon]] || Icons.Tag;
  const tint = category.color || FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];

  return (
    <PressableScale
      style={styles.wrapper}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Explore ${category.name}`}
    >
      <View style={[styles.tile, { backgroundColor: tint }]}>
        <IconComp size={26} color="#FFFFFF" strokeWidth={2} />
      </View>
      <Text numberOfLines={1} style={[styles.label, { color: palette.text }]}>
        {category.name}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: 78, alignItems: 'center', gap: 8 },
  tile: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.34)',
  },
  label: { ...typography.caption, fontWeight: '800', fontSize: 11, textAlign: 'center' },
});
