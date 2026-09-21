import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, SlidersHorizontal, X } from 'lucide-react-native';
import { useAppState } from '../context/AppStateContext';
import { useChodhiQTheme } from '../context/ThemeContext';
import { events } from '../data/discoveryData';
import { matchesProviderSearch, providerMatchesCategory } from '../data/categoryMatching';
import {
  ExploreBusinessCard,
  ExploreEmpty,
  ExploreEventCard,
  ExploreHeader,
  ExploreSearch,
} from '../components/ExploreComponents';

export default function ExploreScreen({ navigation, route }) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [highestRated, setHighestRated] = useState(false);
  const [openNow, setOpenNow] = useState(false);
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [activeTab, setActiveTab] = useState('Businesses');
  const [visibleCount, setVisibleCount] = useState(20);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [sortBy, setSortBy] = useState('Best match');
  const [price, setPrice] = useState('$$');
  const [rating, setRating] = useState('4.0+');
  const [amenities, setAmenities] = useState(['Dine-in']);
  const [appliedPrice, setAppliedPrice] = useState(null);
  const [appliedRating, setAppliedRating] = useState(null);
  const {
    categories,
    providers,
    savedIds,
    toggleSaved,
    location,
    unreadCount,
    marketplaceLoading,
    session,
  } = useAppState();
  const { palette } = useChodhiQTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (route.params?.categoryId) setSelectedCategory(route.params.categoryId);
  }, [route.params?.categoryId]);
  useEffect(
    () => setVisibleCount(20),
    [query, selectedCategory, highestRated, openNow, nearbyOnly, activeTab],
  );

  const businessResults = useMemo(() => {
    const selected = categories.find((category) => category.id === selectedCategory);
    const normalize = (value) =>
      String(value || '')
        .trim()
        .toLowerCase();
    const minimumRating = appliedRating ? Number(appliedRating.replace('+', '')) : 0;
    const matches = providers.filter((provider) => {
      const providerLocations = [provider.baseCity, ...(provider.serviceAreas || [])].map(
        normalize,
      );
      return (
        matchesProviderSearch(provider, query) &&
        providerMatchesCategory(provider, selected) &&
        (!appliedPrice || provider.priceRange === appliedPrice) &&
        Number(provider.rating || 0) >= minimumRating &&
        (!openNow || provider.openNow !== false) &&
        (!nearbyOnly || providerLocations.includes(normalize(location)))
      );
    });
    return [...matches].sort((a, b) => {
      if (sortBy === 'Highest rated' || highestRated)
        return b.rating - a.rating || b.reviewCount - a.reviewCount;
      if (sortBy === 'Most reviewed') return b.reviewCount - a.reviewCount;
      if (sortBy === 'Nearest first')
        return parseFloat(a.distance || '999') - parseFloat(b.distance || '999');
      return 0;
    });
  }, [
    appliedPrice,
    appliedRating,
    categories,
    highestRated,
    location,
    nearbyOnly,
    openNow,
    providers,
    query,
    selectedCategory,
    sortBy,
  ]);
  const eventResults = useMemo(
    () =>
      events.filter(
        (item) =>
          !query.trim() ||
          `${item.title} ${item.organiser} ${item.city}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
      ),
    [query],
  );
  const resultCount = activeTab === 'Businesses' ? businessResults.length : eventResults.length;
  const clearFilters = () => {
    setQuery('');
    setSelectedCategory(null);
    setHighestRated(false);
    setOpenNow(false);
    setNearbyOnly(false);
  };
  const resetFilters = () => {
    setSortBy('Best match');
    setPrice('$$');
    setRating('4.0+');
    setAmenities(['Dine-in']);
    setHighestRated(false);
    setAppliedPrice(null);
    setAppliedRating(null);
  };

  return (
    <SafeAreaView style={[styles.page, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 90 + Math.max(insets.bottom, 16) },
        ]}
      >
        <ExploreHeader onBack={() => navigation.navigate('Home')} />
        <ExploreSearch
          palette={palette}
          value={query}
          onChange={setQuery}
          onFilters={() => setFiltersVisible(true)}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryChips}
        >
          <TouchableOpacity
            onPress={() => setSelectedCategory(null)}
            style={[
              styles.categoryChip,
              {
                backgroundColor: selectedCategory ? palette.surface : palette.primary,
                borderColor: selectedCategory ? palette.border : palette.primary,
              },
            ]}
          >
            <Text
              style={[
                styles.categoryChipText,
                { color: selectedCategory ? palette.text : palette.primaryActionText },
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          {categories.slice(0, 5).map((category) => (
            <TouchableOpacity
              key={category.id}
              onPress={() =>
                setSelectedCategory((current) => (current === category.id ? null : category.id))
              }
              style={[
                styles.categoryChip,
                {
                  backgroundColor:
                    selectedCategory === category.id ? palette.primary : palette.surface,
                  borderColor: selectedCategory === category.id ? palette.primary : palette.border,
                },
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.categoryChipText,
                  {
                    color:
                      selectedCategory === category.id ? palette.primaryActionText : palette.text,
                  },
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.resultsHeader}>
          <Text style={[styles.resultsText, { color: palette.text }]}>{resultCount} results</Text>
          <TouchableOpacity
            onPress={() => setHighestRated((value) => !value)}
            style={styles.mapView}
          >
            <Text style={[styles.mapText, { color: palette.text2 }]}>Sort ↑</Text>
          </TouchableOpacity>
        </View>

        {marketplaceLoading && activeTab === 'Businesses' ? (
          <View style={styles.loading}>
            <ActivityIndicator color={palette.primary} />
            <Text style={{ color: palette.text2 }}>Finding providers near you…</Text>
          </View>
        ) : null}
        {!marketplaceLoading &&
          activeTab === 'Businesses' &&
          businessResults
            .slice(0, visibleCount)
            .map((provider) => (
              <ExploreBusinessCard
                key={provider.id}
                palette={palette}
                provider={provider}
                saved={savedIds.includes(provider.id)}
                onSave={() => (session ? toggleSaved(provider.id) : navigation.navigate('Welcome'))}
                onPress={() => navigation.navigate('ProviderDetail', { id: provider.id })}
              />
            ))}
        {activeTab === 'Events' &&
          eventResults.map((item) => (
            <ExploreEventCard
              key={item.id}
              palette={palette}
              item={item}
              onPress={() => navigation.navigate('Events')}
            />
          ))}
        {!marketplaceLoading && resultCount === 0 && (
          <ExploreEmpty palette={palette} onClear={clearFilters} />
        )}
        {activeTab === 'Businesses' && visibleCount < businessResults.length && (
          <TouchableOpacity
            onPress={() => setVisibleCount((count) => count + 20)}
            style={[
              styles.more,
              { backgroundColor: palette.primarySoft, borderColor: palette.border },
            ]}
          >
            <Text style={{ color: palette.primary, fontWeight: '800' }}>Show more results</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Toggle highest rated results"
        onPress={() => setFiltersVisible(true)}
        style={styles.floatingFilter}
      >
        <SlidersHorizontal size={17} color="#FFFFFF" />
        <Text style={styles.floatingFilterText}>Filters</Text>
      </TouchableOpacity>
      <FiltersModal
        visible={filtersVisible}
        palette={palette}
        resultCount={resultCount}
        sortBy={sortBy}
        setSortBy={setSortBy}
        price={price}
        setPrice={setPrice}
        rating={rating}
        setRating={setRating}
        amenities={amenities}
        setAmenities={setAmenities}
        onReset={resetFilters}
        onClose={() => setFiltersVisible(false)}
        onApply={() => {
          setHighestRated(sortBy === 'Highest rated');
          setAppliedPrice(price);
          setAppliedRating(rating);
          setFiltersVisible(false);
        }}
      />
    </SafeAreaView>
  );
}

function FiltersModal(props) {
  const {
    visible,
    palette,
    resultCount,
    sortBy,
    setSortBy,
    price,
    setPrice,
    rating,
    setRating,
    amenities,
    setAmenities,
    onReset,
    onClose,
    onApply,
  } = props;
  const toggleAmenity = (item) =>
    setAmenities((current) =>
      current.includes(item) ? current.filter((value) => value !== item) : [...current, item],
    );
  const choices = (items, selected, onSelect, compact = false) => (
    <View style={styles.optionGrid}>
      {items.map((item) => {
        const active = selected === item;
        return (
          <TouchableOpacity
            key={item}
            onPress={() => onSelect(item)}
            style={[
              styles.option,
              compact && styles.optionCompact,
              {
                borderColor: active ? palette.primary : palette.border,
                backgroundColor: active ? palette.primarySoft : palette.surface,
              },
            ]}
          >
            {active ? <Check size={14} color={palette.primary} /> : null}
            <Text style={[styles.optionText, { color: active ? palette.primary : palette.text }]}>
              {item}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.sheet, { backgroundColor: palette.surface }]}>
          <View style={styles.sheetHeader}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close filters"
              onPress={onClose}
              style={styles.closeButton}
            >
              <X size={20} color={palette.text} />
            </TouchableOpacity>
            <Text style={[styles.sheetTitle, { color: palette.text }]}>Filters</Text>
            <TouchableOpacity onPress={onReset}>
              <Text style={[styles.reset, { color: palette.primary }]}>Reset</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetBody}>
            <Text style={[styles.filterHeading, { color: palette.text }]}>Sort by</Text>
            {choices(
              ['Best match', 'Highest rated', 'Nearest first', 'Most reviewed'],
              sortBy,
              setSortBy,
            )}
            <Text style={[styles.filterHeading, { color: palette.text }]}>Price range</Text>
            {choices(['$', '$$', '$$$', '$$$$'], price, setPrice, true)}
            <Text style={[styles.filterHeading, { color: palette.text }]}>Rating</Text>
            {choices(['4.0+', '4.5+', '4.8+'], rating, setRating, true)}
            <Text style={[styles.filterHeading, { color: palette.text }]}>Amenities</Text>
            <View style={styles.optionGrid}>
              {[
                'Dine-in',
                'Takeaway',
                'Delivery',
                'Outdoor seating',
                'Parking',
                'Wheelchair accessible',
              ].map((item) => {
                const active = amenities.includes(item);
                return (
                  <TouchableOpacity
                    key={item}
                    onPress={() => toggleAmenity(item)}
                    style={[
                      styles.option,
                      {
                        borderColor: active ? palette.primary : palette.border,
                        backgroundColor: active ? palette.primarySoft : palette.surface,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        { color: active ? palette.primary : palette.text },
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
          <TouchableOpacity
            onPress={onApply}
            style={[styles.applyButton, { backgroundColor: palette.primary }]}
          >
            <Text style={styles.applyText}>Show {resultCount} results</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  recents: { borderTopWidth: 1 },
  recentRow: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
  },
  recentText: { flex: 1, fontSize: 13 },
  categoryChips: { gap: 8, paddingTop: 16, paddingBottom: 4 },
  categoryChip: {
    height: 34,
    maxWidth: 132,
    borderWidth: 1,
    borderRadius: 18,
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  categoryChipText: { fontSize: 11, fontWeight: '700' },
  searchChip: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 },
  chipText: { fontSize: 12, fontWeight: '600' },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 16,
    paddingBottom: 4,
  },
  filter: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 12,
  },
  filterText: { fontSize: 12, fontWeight: '700' },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 25,
    marginBottom: 13,
  },
  resultsText: { fontSize: 14, fontWeight: '800' },
  mapView: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  mapText: { fontSize: 12, fontWeight: '800' },
  loading: { alignItems: 'center', gap: 10, paddingVertical: 32 },
  more: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 15,
    paddingVertical: 13,
    marginTop: 4,
  },
  floatingFilter: {
    position: 'absolute',
    bottom: 88,
    alignSelf: 'center',
    height: 42,
    borderRadius: 22,
    paddingHorizontal: 18,
    backgroundColor: '#101817',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  floatingFilterText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,.38)' },
  sheet: {
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    alignSelf: 'center',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 24,
  },
  sheetHeader: {
    height: 60,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { fontSize: 16, fontWeight: '700' },
  reset: { fontSize: 13, fontWeight: '700' },
  sheetBody: { paddingHorizontal: 16, paddingBottom: 18 },
  filterHeading: { fontSize: 14, fontWeight: '700', marginTop: 18, marginBottom: 10 },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: {
    minHeight: 42,
    width: '48%',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  optionCompact: { flex: 1, minWidth: 70, justifyContent: 'center' },
  optionText: { fontSize: 12, fontWeight: '600' },
  applyButton: {
    height: 52,
    borderRadius: 999,
    marginHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
