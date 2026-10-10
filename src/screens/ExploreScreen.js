import { MotionModal as Modal } from '../components/Motion';
import { MotionTouchable as TouchableOpacity } from '../components/Motion';
import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import AppTextInput from '../components/AppTextInput';
import Text from '../components/AppText';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, SlidersHorizontal, X } from 'lucide-react-native';
import { useAppState } from '../context/AppStateContext';
import { useChodhiQTheme } from '../context/ThemeContext';
import { events } from '../data/discoveryData';
import {
  matchesProviderSearch,
  providerMatchesCategory,
  providerMatchesService,
} from '../data/categoryMatching';
import {
  distanceKm,
  isProviderOpenNow,
  matchesPostcodePrefix,
  normalizePostcode,
} from '../data/providerDiscovery';
import {
  ExploreBusinessCard,
  ExploreEmpty,
  ExploreEventCard,
  ExploreHeader,
  ExploreSearch,
} from '../components/ExploreComponents';
import MarketplaceStatusBanner from '../components/MarketplaceStatusBanner';

export default function ExploreScreen({ navigation, route }) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [highestRated, setHighestRated] = useState(false);
  const [openNow, setOpenNow] = useState(false);
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [activeTab, setActiveTab] = useState('Businesses');
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [sortBy, setSortBy] = useState('Best match');
  const [price, setPrice] = useState('Any');
  const [rating, setRating] = useState('Any');
  const [selectedCity, setSelectedCity] = useState('Any city');
  const [postcodeQuery, setPostcodeQuery] = useState('');
  const [appliedPrice, setAppliedPrice] = useState(null);
  const [appliedRating, setAppliedRating] = useState(null);
  const [appliedCity, setAppliedCity] = useState(null);
  const [appliedPostcode, setAppliedPostcode] = useState('');
  const [service, setService] = useState('Any service');
  const [appliedService, setAppliedService] = useState(null);
  const {
    categories,
    providers,
    savedIds,
    toggleSaved,
    location,
    locationCoordinates,
    unreadCount,
    offline,
    lastUpdatedAt,
    marketplaceLoading,
    refreshMarketplace,
    session,
  } = useAppState();
  const { palette } = useChodhiQTheme();
  const insets = useSafeAreaInsets();
  const savedIdSet = useMemo(() => new Set(savedIds), [savedIds]);
  const cities = useMemo(
    () =>
      [...new Set(providers.map((provider) => provider.baseCity).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [providers],
  );
  const serviceOptions = useMemo(() => {
    const selected = categories.find((category) => category.id === selectedCategory);
    return [
      ...new Set(
        providers
          .filter((provider) => providerMatchesCategory(provider, selected))
          .flatMap((provider) =>
            (provider.services || [])
              .map((item) => (typeof item === 'string' ? item : item?.name))
              .filter(Boolean),
          ),
      ),
    ].sort((a, b) => a.localeCompare(b));
  }, [categories, providers, selectedCategory]);

  useEffect(() => {
    if (route.params?.categoryId) setSelectedCategory(route.params.categoryId);
  }, [route.params?.categoryId]);
  const businessResults = useMemo(() => {
    const selected = categories.find((category) => category.id === selectedCategory);
    const normalize = (value) =>
      String(value || '')
        .trim()
        .toLowerCase();
    const minimumRating = appliedRating ? Number(appliedRating.replace('+', '')) : 0;
    const normalizedPostcode = normalizePostcode(appliedPostcode);
    const withLocation = providers.map((provider) => {
      const km =
        locationCoordinates &&
        Number.isFinite(provider.baseLatitude) &&
        Number.isFinite(provider.baseLongitude)
          ? distanceKm(
              locationCoordinates.latitude,
              locationCoordinates.longitude,
              provider.baseLatitude,
              provider.baseLongitude,
            )
          : null;
      return {
        ...provider,
        openNow: isProviderOpenNow(provider.openingHours),
        distanceKm: km,
      };
    });
    const matches = withLocation.filter((provider) => {
      const providerLocations = [provider.baseCity, ...(provider.serviceAreas || [])].map(
        normalize,
      );
      return (
        matchesProviderSearch(provider, deferredQuery) &&
        providerMatchesCategory(provider, selected) &&
        providerMatchesService(provider, appliedService) &&
        (!appliedPrice || provider.priceRange === appliedPrice) &&
        Number(provider.rating || 0) >= minimumRating &&
        (!appliedCity || normalize(provider.baseCity) === normalize(appliedCity)) &&
        (!normalizedPostcode || matchesPostcodePrefix(provider.basePostcode, appliedPostcode)) &&
        (!openNow || provider.openNow === true) &&
        (!nearbyOnly ||
          providerLocations.some(
            (providerLocation) =>
              providerLocation === normalize(location) ||
              providerLocation.includes(normalize(location)) ||
              normalize(location).includes(providerLocation),
          ))
      );
    });
    return [...matches].sort((a, b) => {
      if (sortBy === 'Highest rated' || highestRated)
        return b.rating - a.rating || b.reviewCount - a.reviewCount;
      if (sortBy === 'Most reviewed') return b.reviewCount - a.reviewCount;
      if (sortBy === 'Nearest first') {
        const distanceA = a.distanceKm ?? Number.POSITIVE_INFINITY;
        const distanceB = b.distanceKm ?? Number.POSITIVE_INFINITY;
        return distanceA - distanceB;
      }
      return 0;
    });
  }, [
    appliedPrice,
    appliedRating,
    categories,
    highestRated,
    location,
    locationCoordinates,
    nearbyOnly,
    openNow,
    providers,
    deferredQuery,
    selectedCategory,
    sortBy,
    appliedCity,
    appliedPostcode,
    appliedService,
  ]);
  const eventResults = useMemo(
    () =>
      events.filter(
        (item) =>
          !deferredQuery.trim() ||
          `${item.title} ${item.organiser} ${item.city}`
            .toLowerCase()
            .includes(deferredQuery.trim().toLowerCase()),
      ),
    [deferredQuery],
  );
  const resultCount = activeTab === 'Businesses' ? businessResults.length : eventResults.length;
  const clearFilters = () => {
    setQuery('');
    setSelectedCategory(null);
    setHighestRated(false);
    setOpenNow(false);
    setNearbyOnly(false);
    setSortBy('Best match');
    setPrice('Any');
    setRating('Any');
    setSelectedCity('Any city');
    setPostcodeQuery('');
    setAppliedPrice(null);
    setAppliedRating(null);
    setAppliedCity(null);
    setAppliedPostcode('');
    setService('Any service');
    setAppliedService(null);
  };
  const resetFilters = () => {
    setSelectedCategory(null);
    setSortBy('Best match');
    setPrice('Any');
    setRating('Any');
    setSelectedCity('Any city');
    setPostcodeQuery('');
    setHighestRated(false);
    setOpenNow(false);
    setNearbyOnly(false);
    setAppliedPrice(null);
    setAppliedRating(null);
    setAppliedCity(null);
    setAppliedPostcode('');
    setService('Any service');
    setAppliedService(null);
  };

  const renderResult = useCallback(
    ({ item }) =>
      activeTab === 'Businesses' ? (
        <ExploreBusinessCard
          palette={palette}
          provider={item}
          saved={savedIdSet.has(item.id)}
          onSave={() => (session ? toggleSaved(item.id) : navigation.navigate('Welcome'))}
          onPress={() => navigation.navigate('ProviderDetail', { id: item.id })}
        />
      ) : offline && activeTab === 'Businesses' && providers.length === 0 ? (
        <View style={styles.loading}>
          <Text style={{ color: palette.text }}>Directory unavailable</Text>
          <Text style={{ color: palette.text2 }}>
            Connect to the internet and retry to load businesses.
          </Text>
        </View>
      ) : (
        <ExploreEventCard
          palette={palette}
          item={item}
          onPress={() => navigation.navigate('Events')}
        />
      ),
    [activeTab, palette, savedIdSet, session, toggleSaved, navigation],
  );

  return (
    <SafeAreaView style={[styles.page, { backgroundColor: palette.background }]} edges={['top']}>
      <FlatList
        data={
          marketplaceLoading && activeTab === 'Businesses'
            ? []
            : activeTab === 'Businesses'
              ? businessResults
              : eventResults
        }
        keyExtractor={(item) => String(item.id)}
        renderItem={renderResult}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={marketplaceLoading}
            tintColor={palette.primary}
            colors={[palette.primary]}
            progressBackgroundColor={palette.surface}
            onRefresh={refreshMarketplace}
          />
        }
        showsVerticalScrollIndicator={false}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={7}
        removeClippedSubviews={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 90 + Math.max(insets.bottom, 16) },
        ]}
        ListHeaderComponent={
          <>
            <ExploreHeader onBack={() => navigation.navigate('Home')} />
            <MarketplaceStatusBanner
              offline={offline}
              loading={marketplaceLoading}
              lastUpdatedAt={lastUpdatedAt}
              onRetry={refreshMarketplace}
              palette={palette}
            />
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
                onPress={() => {
                  setSelectedCategory(null);
                  setService('Any service');
                  setAppliedService(null);
                }}
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
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  onPress={() => {
                    const next = selectedCategory === category.id ? null : category.id;
                    setSelectedCategory(next);
                    setService('Any service');
                    setAppliedService(null);
                  }}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor:
                        selectedCategory === category.id ? palette.primary : palette.surface,
                      borderColor:
                        selectedCategory === category.id ? palette.primary : palette.border,
                    },
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.categoryChipText,
                      {
                        color:
                          selectedCategory === category.id
                            ? palette.primaryActionText
                            : palette.text,
                      },
                    ]}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.resultsHeader}>
              <Text style={[styles.resultsText, { color: palette.text }]}>
                {resultCount} results
              </Text>
              <TouchableOpacity
                onPress={() => setHighestRated((value) => !value)}
                style={styles.mapView}
              >
                <Text style={[styles.mapText, { color: palette.text2 }]}>Sort ↑</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        ListEmptyComponent={
          marketplaceLoading && activeTab === 'Businesses' ? (
            <View style={styles.loading}>
              <ActivityIndicator color={palette.primary} />
              <Text style={{ color: palette.text2 }}>Finding providers near you?</Text>
            </View>
          ) : (
            <ExploreEmpty palette={palette} onClear={clearFilters} />
          )
        }
      />
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
        cities={cities}
        serviceOptions={serviceOptions}
        service={service}
        setService={setService}
        openNow={openNow}
        setOpenNow={setOpenNow}
        nearbyOnly={nearbyOnly}
        setNearbyOnly={setNearbyOnly}
        selectedCity={selectedCity}
        setSelectedCity={setSelectedCity}
        postcodeQuery={postcodeQuery}
        setPostcodeQuery={setPostcodeQuery}
        onReset={resetFilters}
        onClose={() => setFiltersVisible(false)}
        onApply={() => {
          setHighestRated(sortBy === 'Highest rated');
          setAppliedPrice(price === 'Any' ? null : price.length);
          setAppliedRating(rating === 'Any' ? null : rating);
          setAppliedCity(selectedCity === 'Any city' ? null : selectedCity);
          setAppliedPostcode(postcodeQuery.trim());
          setAppliedService(service === 'Any service' ? null : service);
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
    cities,
    serviceOptions,
    service,
    setService,
    openNow,
    setOpenNow,
    nearbyOnly,
    setNearbyOnly,
    selectedCity,
    setSelectedCity,
    postcodeQuery,
    setPostcodeQuery,
    onReset,
    onClose,
    onApply,
  } = props;
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
            {choices(['Any', '£', '££', '£££', '££££'], price, setPrice, true)}
            <Text style={[styles.filterHeading, { color: palette.text }]}>Rating</Text>
            {choices(['Any', '4.0+', '4.5+', '4.8+'], rating, setRating, true)}
            <Text style={[styles.filterHeading, { color: palette.text }]}>Service</Text>
            {choices(['Any service', ...serviceOptions], service, setService)}
            <Text style={[styles.filterHeading, { color: palette.text }]}>Availability & area</Text>
            {choices(['Any time', 'Open now'], openNow ? 'Open now' : 'Any time', (value) =>
              setOpenNow(value === 'Open now'),
            )}
            {choices(['Any area', 'In my area'], nearbyOnly ? 'In my area' : 'Any area', (value) =>
              setNearbyOnly(value === 'In my area'),
            )}
            <Text style={[styles.filterHeading, { color: palette.text }]}>City</Text>
            {choices(['Any city', ...cities], selectedCity, setSelectedCity)}
            <Text style={[styles.filterHeading, { color: palette.text }]}>Postcode</Text>
            <AppTextInput
              accessibilityLabel="Filter listings by postcode"
              autoCapitalize="characters"
              value={postcodeQuery}
              onChangeText={setPostcodeQuery}
              placeholder="e.g. LE4 5AT"
              placeholderTextColor={palette.muted}
              style={[
                styles.postcodeInput,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                  color: palette.text,
                },
              ]}
            />
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
  postcodeInput: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 13,
  },
  applyText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
