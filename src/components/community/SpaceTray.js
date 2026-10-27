import { MotionTouchable as TouchableOpacity } from '../Motion';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { MessageCircle, Store } from 'lucide-react-native';
import Text from './MelaText';

function SpaceIcon({ space, active, palette, onPress }) {
  const Icon = space.slug === 'general' ? Store : MessageCircle;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${space.name} community space`}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.space,
        {
          backgroundColor: active ? palette.primary : palette.surfaceAlt,
          borderColor: active ? palette.primary : palette.border,
        },
      ]}
    >
      <Icon size={16} color={active ? palette.onPrimary : palette.text2} />
      <Text
        numberOfLines={1}
        style={[styles.spaceLabel, { color: active ? palette.onPrimary : palette.text }]}
      >
        {space.name}
      </Text>
    </TouchableOpacity>
  );
}

export default function SpaceTray({ spaces, selected, palette, onSelect }) {
  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <Text style={[styles.title, { color: palette.text }]}>Your spaces</Text>
        <Text style={[styles.subtitle, { color: palette.text2 }]}>Switch community</Text>
      </View>
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
  container: { marginTop: 8 },
  heading: {
    marginHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 14, fontWeight: '800', letterSpacing: -0.25 },
  subtitle: { fontSize: 10, fontWeight: '600' },
  tray: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 3, gap: 7 },
  space: {
    minHeight: 38,
    maxWidth: 180,
    flexDirection: 'row',
    flexShrink: 0,
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderRadius: 14,
  },
  spaceLabel: { fontSize: 11, fontWeight: '700', flexShrink: 1 },
});
