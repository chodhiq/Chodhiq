import React from 'react';
import { View, StyleSheet } from 'react-native';
import Text from './AppText';
import * as Icons from 'lucide-react-native';
import { radius } from '../theme/theme';

export const STATUS_CONFIG = {
  open: { label: 'Open', color: '#6657D9', icon: 'CircleCheck' },
  closed: { label: 'Closed', color: '#D64545', icon: 'CircleX' },
  limited: { label: 'Limited Hours', color: '#E08A2E', icon: 'Clock' },
  featured: { label: 'Featured', color: '#7C5CD6', icon: 'Sparkles' },
  topRated: { label: 'Top Rated', color: '#D6A72E', icon: 'Star' },
};

export default function StatusBadge({ status, size = 'md' }) {
  const config = STATUS_CONFIG[status];
  if (!config) return null;
  const IconComp = Icons[config.icon];
  const compact = size === 'sm';

  return (
    <View style={[styles.pill, { backgroundColor: config.color }, compact && styles.pillSm]}>
      <IconComp size={compact ? 11 : 13} color="#FFFFFF" strokeWidth={2.5} />
      <Text style={[styles.label, compact && styles.labelSm]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  pillSm: { paddingVertical: 4, paddingHorizontal: 8, gap: 4 },
  label: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  labelSm: { fontSize: 10.5 },
});
