import React from 'react';
import { Image, Text, StyleSheet, View } from 'react-native';
import * as Icons from 'lucide-react-native';
import { colors, radius, shadows } from '../theme/theme';
import { PressableScale } from './Motion';
import { useChodhiQTheme } from '../context/ThemeContext';
import { categoryAssets } from '../data/assetCatalog';

export default function CategoryChip({ category, onPress, selected, grid = false }) {
  const { palette } = useChodhiQTheme();
  const IconComp = Icons[iconMap[category.icon]] || Icons.Tag;
  const artwork = categoryAssets[category.id];
  const accent = category.color || colors.primary;
  return (
    <PressableScale style={[styles.wrapper, grid && styles.gridWrapper]} onPress={onPress}>
      <View
        style={[
          styles.chip,
          grid && styles.gridChip,
          { backgroundColor: palette.surface, borderColor: palette.border },
          selected && styles.selected,
        ]}
      >
        <View
          style={[
            styles.iconBubble,
            { backgroundColor: selected ? 'rgba(255,255,255,0.18)' : `${accent}18` },
          ]}
        >
          {artwork ? (
            <Image source={artwork} style={styles.artwork} resizeMode="contain" />
          ) : (
            <IconComp size={17} color={selected ? palette.background : accent} />
          )}
        </View>
        <Text
          numberOfLines={2}
          style={[
            styles.label,
            grid && styles.gridLabel,
            { color: palette.text },
            selected && { color: palette.background },
          ]}
        >
          {category.name}
        </Text>
      </View>
    </PressableScale>
  );
}

const iconMap = {
  sofa: 'Sofa',
  wrench: 'Wrench',
  zap: 'Zap',
  droplet: 'Droplet',
  scissors: 'Scissors',
  utensils: 'Utensils',
  sparkles: 'Sparkles',
  camera: 'Camera',
  calendar: 'CalendarDays',
  briefcase: 'BriefcaseBusiness',
  'heart-pulse': 'HeartPulse',
  'graduation-cap': 'GraduationCap',
  'cake-slice': 'CakeSlice',
  plane: 'Plane',
  car: 'Car',
  building: 'Building2',
  megaphone: 'Megaphone',
  users: 'Users',
  'shopping-basket': 'ShoppingBasket',
};

const styles = StyleSheet.create({
  wrapper: { borderRadius: radius.lg, ...shadows.soft },
  gridWrapper: { width: '48.5%' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: colors.card,
    paddingVertical: 10,
    paddingHorizontal: 11,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gridChip: { width: '100%', minHeight: 66, paddingVertical: 10 },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artwork: { width: 32, height: 32, borderRadius: 10 },
  label: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  gridLabel: { flex: 1, fontSize: 12, lineHeight: 16 },
});
