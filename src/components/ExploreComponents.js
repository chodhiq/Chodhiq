import { MotionTouchable as TouchableOpacity } from './Motion';
import React from 'react';
import AppTextInput from './AppTextInput';
import { Image, StyleSheet, View } from 'react-native';

import Text from './AppText';
import { ChevronRight, MapPin, Search, SlidersHorizontal } from 'lucide-react-native';
import { imageSource } from '../data/assetCatalog';
import { shadows } from '../theme/theme';
import GlassView from './GlassView';
import Animated, { FadeInDown } from 'react-native-reanimated';
import useEffectsLevel from '../hooks/useEffectsLevel';
import ProviderCardGlow from '../../components/ui/ProviderCardGlow';
import GlowIconButton from '../../components/ui/GlowIconButton';

export function ExploreHeader({ palette }) {
  return (
    <View style={s.header}>
      <Text style={[s.title, { color: palette.text }]}>Search</Text>
    </View>
  );
}
export function ExploreSearch({ palette, value, onChange, onFilters }) {
  return (
    <View style={[s.search, { borderColor: palette.border }]}>
      <GlassView
        pointerEvents="none"
        intensity={44}
        style={[StyleSheet.absoluteFill, { borderRadius: 26 }]}
      />
      <Search size={19} color={palette.text2} />
      <AppTextInput
        showChrome={false}
        testID="input-explore-search"
        accessibilityLabel="Search businesses and services"
        value={value}
        onChangeText={onChange}
        placeholder="Search businesses and services..."
        placeholderTextColor={palette.muted}
        style={[s.input, { color: palette.text }]}
      />
      <GlowIconButton
        testID="btn-explore-search-filters"
        accessibilityRole="button"
        accessibilityLabel="Open search filters"
        onPress={onFilters}
        size={40}
        variant="ghost"
        haptic={false}
        style={s.filterButton}
        icon={<SlidersHorizontal size={18} color={palette.primary} />}
      />
    </View>
  );
}
export function ExploreSectionHeader({ palette, title, action = 'See all', onPress }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={[s.sectionTitle, { color: palette.text }]}>{title}</Text>
      <TouchableOpacity onPress={onPress}>
        <Text style={[s.action, { color: palette.primary }]}>{action}</Text>
      </TouchableOpacity>
    </View>
  );
}
export function SegmentedTabs({ palette, value, onChange }) {
  return (
    <View style={[s.tabs, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}>
      {['Businesses', 'Events'].map((tab) => (
        <TouchableOpacity
          key={tab}
          onPress={() => onChange(tab)}
          style={[s.tab, value === tab && { backgroundColor: palette.primary }]}
        >
          <Text
            numberOfLines={1}
            style={[s.tabText, { color: value === tab ? palette.onPrimary : palette.text2 }]}
          >
            {tab}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
export function ExploreBusinessCard({ provider, saved, onSave, onPress, index = 0 }) {
  return (
    <ProviderCardGlow
      variant="row"
      provider={provider}
      saved={saved}
      onSave={onSave}
      onPress={onPress}
      index={index}
      testID={`btn-explore-result-${provider.id}`}
      saveTestID="btn-save-business"
    />
  );
}

export function ExploreEventCard({ palette, item, onPress, index = 0 }) {
  const entrance =
    useEffectsLevel() === 'full'
      ? FadeInDown.delay(Math.min(index, 8) * 36).duration(230)
      : undefined;
  return (
    <Animated.View entering={entrance}>
      <TouchableOpacity
        onPress={onPress}
        style={[s.card, { backgroundColor: palette.surface, borderColor: palette.border }]}
      >
        <Image resizeMethod="resize" source={imageSource(item.image)} style={s.image} />
        <View style={s.cardCopy}>
          <Text numberOfLines={1} style={[s.name, { color: palette.text }]}>
            {item.title}
          </Text>
          <Text style={[s.category, { color: palette.text2 }]}>
            {item.date} · {item.organiser}
          </Text>
          <View style={s.metaRow}>
            <MapPin size={12} color={palette.text2} />
            <Text style={[s.meta, { color: palette.text2 }]}>{item.city}, UK</Text>
          </View>
        </View>
        <ChevronRight size={19} color={palette.text2} />
      </TouchableOpacity>
    </Animated.View>
  );
}
export function ExploreEmpty({ palette, onClear }) {
  return (
    <View style={[s.empty, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Search size={28} color={palette.muted} />
      <Text style={[s.emptyTitle, { color: palette.text }]}>No results found</Text>
      <Text style={[s.emptyBody, { color: palette.text2 }]}>
        Try changing your search, category or filters.
      </Text>
      <TouchableOpacity onPress={onClear} style={[s.clear, { backgroundColor: palette.primary }]}>
        <Text style={{ color: palette.onPrimary, fontWeight: '800' }}>Clear filters</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  header: { height: 48, marginBottom: 12, justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', letterSpacing: -0.2 },

  search: {
    position: 'relative',
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderWidth: 1,
    borderRadius: 26,
    paddingLeft: 16,
    paddingRight: 7,
    marginTop: 0,
    ...shadows.soft,
  },
  input: { flex: 1, fontSize: 14 },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 26,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  action: { fontSize: 12, fontWeight: '800' },
  tabs: {
    height: 44,
    flexDirection: 'row',
    borderRadius: 22,
    borderWidth: 1,
    padding: 3,
    marginTop: 26,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    paddingHorizontal: 5,
  },
  tabText: { fontSize: 11, fontWeight: '800' },
  card: {
    position: 'relative',
    minHeight: 96,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    marginBottom: 12,
    ...shadows.soft,
  },
  cardMain: { flex: 1, flexDirection: 'row', minWidth: 0 },
  dataVerifiedGlow: {
    borderColor: '#5EE0AD',
    shadowColor: '#16A36A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.32,
    shadowRadius: 12,
    elevation: 7,
  },
  imageWrap: { flexShrink: 0, width: 72, height: 72, borderRadius: 12, overflow: 'hidden' },
  image: { width: '100%', height: '100%', borderRadius: 12 },

  cardCopy: { flex: 1, paddingLeft: 12, paddingRight: 30, minWidth: 0 },
  nameRow: { flexWrap: 'wrap', flexDirection: 'row', alignItems: 'center', gap: 4 },
  dataCheckedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E6FFF4',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  dataCheckedText: { color: '#08724F', fontSize: 9, fontWeight: '800' },
  name: { fontSize: 15, fontWeight: '800', flexShrink: 1 },
  category: { fontSize: 12, marginTop: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  meta: { fontSize: 11, flexShrink: 1 },
  save: {
    position: 'absolute',
    right: 10,
    top: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tags: { flexDirection: 'row', gap: 5, marginTop: 6 },
  tag: {
    overflow: 'hidden',
    fontSize: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  empty: { alignItems: 'center', borderWidth: 1, borderRadius: 17, padding: 28, marginTop: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '800', marginTop: 10 },
  emptyBody: { fontSize: 13, textAlign: 'center', marginTop: 5 },
  clear: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 18, marginTop: 16 },
});
