import { AppAlert as Alert } from '../components/AppDialog';
import { MotionTouchable as TouchableOpacity } from '../components/Motion';
import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import AppTextInput from '../components/AppTextInput';
import { ActivityIndicator, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import Text from '../components/AppText';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Bell,
  MapPin,
  Layers,
  Search,
  SlidersHorizontal,
  X,
  Navigation,
} from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import ChodhiQMap from '../components/ChodhiQMap';
import GlassView from '../components/GlassView';
import { EventCard, OfferCard } from '../components/DiscoveryCards';
import { events, offers } from '../data/discoveryData';
import { useAppState } from '../context/AppStateContext';
import { useChodhiQTheme } from '../context/ThemeContext';
import { radius, shadows, spacing } from '../theme/theme';
import { features } from '../config/features';
import { matchesProviderSearch, providerMatchesCategory } from '../data/categoryMatching';
import * as ExpoLocation from 'expo-location';
import { showPermissionRecovery } from '../lib/permissionRecovery';
import { getDeviceLocation } from '../lib/deviceLocation';
import { openExternalUrl } from '../lib/openExternalUrl';
import { getTabBarOverlayHeight } from '../navigation/tabBarLayout';
import ProviderCardGlow from '../../components/ui/ProviderCardGlow';
import GlowChip from '../../components/ui/GlowChip';
import GlowIconButton from '../../components/ui/GlowIconButton';
import GlowCard from '../../components/GlowCard';
import GlowButton from '../../components/ui/GlowButton';

export function OffersScreen({ navigation }) {
  const { palette } = useChodhiQTheme();
  return (
    <SafeAreaView
      style={[styles.page, { backgroundColor: 'transparent' }]}
      edges={['left', 'right', 'bottom']}
    >
      <ScreenHeader
        navigation={navigation}
        title="Offers near you"
        subtitle="Live promotions from community providers"
      />
      <ScrollView contentContainerStyle={styles.content}>
        {features.customAds ? (
          offers.map((item, index) => <OfferCard key={item.id} item={item} index={index} />)
        ) : (
          <Text style={{ color: palette.text2 }}>
            Community promotions will be available after the initial launch period.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export function EventsScreen({ navigation }) {
  const { palette } = useChodhiQTheme();
  return (
    <SafeAreaView
      style={[styles.page, { backgroundColor: 'transparent' }]}
      edges={['left', 'right', 'bottom']}
    >
      <ScreenHeader
        navigation={navigation}
        title="Events"
        subtitle="Culture, community and business across the UK"
      />
      <ScrollView contentContainerStyle={styles.content}>
        {events.map((item, index) => (
          <EventCard
            key={item.id}
            item={item}
            index={index}
            onPress={() =>
              openExternalUrl(
                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.title + ' ' + item.city)}`,
                {
                  title: 'Map unavailable',
                  fallbackMessage: 'The event location could not be opened in Maps.',
                },
              )
            }
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

export function MapScreen({ navigation, route }) {
  const {
    providers,
    categories,
    savedIds,
    toggleSaved,
    session,
    unreadCount,
    location,
    locationCoordinates,
    setCurrentLocation,
    marketplaceLoading,
    refreshMarketplace,
  } = useAppState();
  const { palette } = useChodhiQTheme();
  const insets = useSafeAreaInsets();
  const mapBottomInset =
    route?.name === 'MapTab'
      ? getTabBarOverlayHeight(insets.bottom) + 12
      : Math.max(8, insets.bottom);
  const { height: windowHeight } = useWindowDimensions();
  const [selected, setSelected] = useState(null);
  const [bottomCardHeight, setBottomCardHeight] = useState(0);
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeCity, setActiveCity] = useState(null);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [viewport, setViewport] = useState(null);
  const [locating, setLocating] = useState(false);
  const [mapType, setMapType] = useState('standard');
  const cities = useMemo(
    () =>
      [...new Set(providers.map((provider) => provider.baseCity).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [providers],
  );
  const filteredProviders = useMemo(() => {
    const category = categories.find((item) => item.id === activeCategory);
    return providers.filter((provider) => {
      const areas = [provider.baseCity, ...(provider.serviceAreas || [])]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());
      return (
        matchesProviderSearch(provider, deferredQuery) &&
        providerMatchesCategory(provider, category) &&
        (!activeCity || areas.includes(activeCity.toLowerCase()))
      );
    });
  }, [activeCategory, activeCity, categories, providers, deferredQuery]);
  const mapProviders = useMemo(() => filteredProviders.filter(hasCoordinates), [filteredProviders]);
  const providersWithMeta = useMemo(
    () =>
      filteredProviders.map((provider) => ({
        ...provider,
        distance:
          locationCoordinates && hasCoordinates(provider)
            ? `${distanceKm(locationCoordinates, provider).toFixed(1)} km`
            : null,
        openNow: businessOpenNow(provider),
      })),
    [filteredProviders, locationCoordinates?.latitude, locationCoordinates?.longitude],
  );
  const providersById = useMemo(
    () => new Map(providersWithMeta.map((provider) => [provider.id, provider])),
    [providersWithMeta],
  );
  const visibleProviders = useMemo(() => {
    if (!viewport) return mapProviders;
    return mapProviders.filter(
      (provider) =>
        provider.baseLatitude >= viewport.latitude - viewport.latitudeDelta / 2 &&
        provider.baseLatitude <= viewport.latitude + viewport.latitudeDelta / 2 &&
        provider.baseLongitude >= viewport.longitude - viewport.longitudeDelta / 2 &&
        provider.baseLongitude <= viewport.longitude + viewport.longitudeDelta / 2,
    );
  }, [mapProviders, viewport]);
  useEffect(() => {
    if (!selected && visibleProviders.length) setSelected(visibleProviders[0]);
    else if (selected && !visibleProviders.some((provider) => provider.id === selected.id)) {
      setSelected(visibleProviders[0] || null);
    }
  }, [selected, visibleProviders]);
  const mapInitialLocation = locationCoordinates
    ? { ...locationCoordinates, latitudeDelta: 0.12, longitudeDelta: 0.12 }
    : null;
  const nearCards = useMemo(() => {
    const cardProviders = providersWithMeta.filter(hasCoordinates);
    if (!mapInitialLocation) return cardProviders.slice(0, 12);
    return [...cardProviders]
      .sort((a, b) => distanceKm(mapInitialLocation, a) - distanceKm(mapInitialLocation, b))
      .slice(0, 12);
  }, [mapInitialLocation?.latitude, mapInitialLocation?.longitude, providersWithMeta]);
  const useCurrentLocation = async () => {
    if (locating) return;
    try {
      setLocating(true);
      const detected = await getDeviceLocation(ExpoLocation);
      setCurrentLocation(detected.city || location, detected);
      setViewport({
        latitude: detected.latitude,
        longitude: detected.longitude,
        latitudeDelta: 0.12,
        longitudeDelta: 0.12,
      });
      setActiveCity(null);
      Alert.alert(
        'Location updated',
        detected.city
          ? `The map is centered on your current location in ${detected.city}.`
          : 'The map is centered on your current device location.',
      );
    } catch (error) {
      if (error.code === 'LOCATION_PERMISSION_DENIED') {
        showPermissionRecovery('Location permission needed', error.message);
      } else {
        Alert.alert('Could not get your location', error.message);
      }
    } finally {
      setLocating(false);
    }
  };
  const directions = (provider) => {
    const url = hasCoordinates(provider)
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${provider.baseLatitude},${provider.baseLongitude}`)}`
      : provider.googlePlaceId
        ? `https://www.google.com/maps/dir/?api=1&destination_place_id=${encodeURIComponent(provider.googlePlaceId)}`
        : provider.googleMapsSearchUrl ||
          (provider.googleMapsUrl?.includes('/search/') ? provider.googleMapsUrl : null);
    if (url) {
      void openExternalUrl(url, {
        title: 'Directions unavailable',
        fallbackMessage: 'Directions could not be opened. Try again later.',
      });
    } else {
      Alert.alert('Directions unavailable', 'This business does not have a usable map location.');
    }
  };
  return (
    <SafeAreaView style={[styles.mapPage, { backgroundColor: 'transparent' }]} edges={[]}>
      <View style={[styles.map, { backgroundColor: palette.surfaceAlt, marginTop: insets.top }]}>
        <ChodhiQMap
          providers={mapProviders}
          selected={selected}
          onSelect={setSelected}
          palette={palette}
          location={mapInitialLocation || undefined}
          onRegionChange={(region) => {
            if (region) {
              setViewport(region);
            }
          }}
          mapType={mapType}
        />
        <View
          pointerEvents="box-none"
          style={[
            styles.mapBrandHeader,
            { backgroundColor: palette.dark ? palette.bg : '#101817' },
          ]}
        >
          <Text style={styles.mapBrandLogo}>
            Chodhi<Text style={{ color: palette.primary }}>Q</Text>
          </Text>
          <TouchableOpacity
            testID="btn-map-notifications"
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            onPress={() => navigation.navigate('Notifications')}
            style={styles.mapBell}
          >
            <Bell size={22} color="#FFFFFF" />
            {unreadCount > 0 && <View style={styles.mapBellDot} />}
          </TouchableOpacity>
        </View>
        <View style={styles.mapControls} pointerEvents="box-none">
          <GlassView
            pointerEvents="box-none"
            intensity={44}
            style={[styles.mapSearch, { borderRadius: 26 }]}
          >
            {route?.name !== 'MapTab' && (
              <TouchableOpacity
                testID="btn-map-back"
                accessibilityRole="button"
                accessibilityLabel="Go back"
                onPress={() => navigation.goBack()}
                style={styles.mapControlButton}
              >
                <ArrowLeft size={20} color={palette.text} />
              </TouchableOpacity>
            )}
            <Search size={18} color={palette.text2} />
            <AppTextInput
              showChrome={false}
              accessibilityLabel="Search map providers"
              value={query}
              onChangeText={setQuery}
              placeholder="Search restaurants, salons, services..."
              placeholderTextColor={palette.muted}
              returnKeyType="search"
              style={[styles.mapSearchInput, { color: palette.text }]}
            />
            {query ? (
              <TouchableOpacity
                testID="btn-map-clear"
                accessibilityRole="button"
                accessibilityLabel="Clear map search"
                onPress={() => setQuery('')}
                style={styles.mapControlButton}
              >
                <X size={18} color={palette.text2} />
              </TouchableOpacity>
            ) : null}
            <GlowIconButton
              testID="btn-map-filters"
              accessibilityRole="button"
              accessibilityLabel={filtersVisible ? 'Hide map filters' : 'Show map filters'}
              accessibilityState={{ expanded: filtersVisible }}
              onPress={() => setFiltersVisible((value) => !value)}
              size={40}
              variant="ghost"
              haptic={false}
              style={styles.mapFilterButton}
              icon={<SlidersHorizontal size={18} color={palette.primary} />}
            />
          </GlassView>
          <ScrollView
            horizontal
            pointerEvents="box-none"
            showsHorizontalScrollIndicator={false}
            style={styles.mapCategoryScroller}
            contentContainerStyle={styles.mapCategoryRow}
          >
            {[{ id: null, name: 'All', icon: 'grid' }, ...categories].map((category) => {
              const active = category.id ? activeCategory === category.id : !activeCategory;
              return (
                <GlowChip
                  key={category.id || 'all'}
                  label={category.name}
                  selected={active}
                  onPress={() =>
                    setActiveCategory(category.id ? (active ? null : category.id) : null)
                  }
                  style={[
                    styles.mapCategoryChip,
                    {
                      backgroundColor: active ? palette.primary : palette.surface,
                      borderColor: active ? palette.primary : palette.border,
                    },
                  ]}
                />
              );
            })}
          </ScrollView>
          {filtersVisible ? (
            <View
              pointerEvents="box-none"
              style={[
                styles.mapFilterPanel,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ]}
            >
              <View style={styles.mapFilterHeader}>
                <View>
                  <Text style={[styles.mapFilterTitle, { color: palette.text }]}>
                    Filter by city
                  </Text>
                  <Text style={[styles.mapFilterSubtitle, { color: palette.text2 }]}>
                    Include service areas
                  </Text>
                </View>
                {(activeCity || activeCategory || query) && (
                  <TouchableOpacity
                    testID="btn-map-reset"
                    accessibilityRole="button"
                    accessibilityLabel="Reset all map filters"
                    onPress={() => {
                      setQuery('');
                      setActiveCity(null);
                      setActiveCategory(null);
                    }}
                  >
                    <Text style={[styles.mapResetText, { color: palette.primary }]}>Reset</Text>
                  </TouchableOpacity>
                )}
              </View>
              <ScrollView
                horizontal
                pointerEvents="box-none"
                showsHorizontalScrollIndicator={false}
              >
                <View style={styles.mapCityRow}>
                  <MapFilterChip
                    label="Everywhere"
                    active={!activeCity}
                    onPress={() => setActiveCity(null)}
                    palette={palette}
                  />
                  {cities.map((city) => (
                    <MapFilterChip
                      key={city}
                      label={city}
                      active={activeCity === city}
                      onPress={() => setActiveCity(activeCity === city ? null : city)}
                      palette={palette}
                    />
                  ))}
                </View>
              </ScrollView>
            </View>
          ) : null}
          {mapProviders.length > 0 ? (
            <GlassView pointerEvents="box-none" intensity={44} style={styles.mapResultBadge}>
              <MapPin size={14} color={palette.primary} />
              <Text style={[styles.mapResultText, { color: palette.text }]}>
                {visibleProviders.length} {visibleProviders.length === 1 ? 'result' : 'results'} in
                this area
              </Text>
            </GlassView>
          ) : null}
        </View>
        <View
          pointerEvents="box-none"
          style={[
            styles.mapSideControls,
            {
              bottom: bottomCardHeight
                ? bottomCardHeight + mapBottomInset
                : Math.max(205, windowHeight * 0.29),
            },
          ]}
        >
          <TouchableOpacity
            testID="btn-map-type"
            accessibilityRole="button"
            accessibilityLabel={
              mapType === 'standard' ? 'Switch to satellite map' : 'Switch to standard map'
            }
            onPress={() => setMapType((value) => (value === 'standard' ? 'satellite' : 'standard'))}
            style={[styles.mapRoundControl, { backgroundColor: palette.surface }]}
          >
            <Layers size={20} color={palette.text} />
          </TouchableOpacity>
          <TouchableOpacity
            testID="btn-map-current-location"
            disabled={locating}
            accessibilityRole="button"
            accessibilityLabel="Go to current location"
            onPress={useCurrentLocation}
            style={[styles.mapRoundControl, { backgroundColor: palette.surface }]}
          >
            <Navigation size={20} color={palette.text} />
          </TouchableOpacity>
        </View>
        {marketplaceLoading || providers.length === 0 ? (
          <View
            pointerEvents="box-none"
            style={[
              styles.mapEmptyCard,
              { backgroundColor: palette.surface, bottom: mapBottomInset },
            ]}
          >
            <ActivityIndicator color={palette.primary} />
            <Text style={[styles.mapEmptyTitle, { color: palette.text }]}>
              {marketplaceLoading ? 'Loading businesses' : 'No businesses available'}
            </Text>
            <Text style={[styles.mapEmptyText, { color: palette.text2 }]}>
              {marketplaceLoading
                ? 'Business locations are being refreshed.'
                : 'Retry to check for available businesses.'}
            </Text>
            <TouchableOpacity
              testID="btn-map-retry"
              accessibilityRole="button"
              onPress={refreshMarketplace}
            >
              <Text style={[styles.mapResetText, { color: palette.primary }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : selected ? (
          <View
            pointerEvents="box-none"
            style={[
              styles.mapBottomArea,
              { bottom: mapBottomInset, maxHeight: windowHeight * 0.48 },
            ]}
            onLayout={({ nativeEvent }) => setBottomCardHeight(nativeEvent.layout.height)}
          >
            <MapSelectedCard
              provider={providersById.get(selected.id) || selected}
              saved={savedIds.includes(String(selected.id))}
              onSave={() => (session ? toggleSaved(selected.id) : navigation.navigate('Welcome'))}
              onDirections={() => directions(selected)}
              onPress={() => navigation.navigate('ProviderDetail', { id: selected.id })}
            />
          </View>
        ) : nearCards.length > 1 ? (
          <View
            pointerEvents="box-none"
            style={[
              styles.mapBottomArea,
              { bottom: mapBottomInset, maxHeight: windowHeight * 0.48 },
            ]}
            onLayout={({ nativeEvent }) => setBottomCardHeight(nativeEvent.layout.height)}
          >
            <ScrollView
              horizontal
              pointerEvents="box-none"
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.nearbyCarousel}
              style={{ maxHeight: 196 }}
            >
              {nearCards.map((provider) => (
                <MapNearbyCard
                  key={provider.id}
                  provider={providersById.get(provider.id) || provider}
                  palette={palette}
                  saved={savedIds.includes(String(provider.id))}
                  selected={provider.id === selected?.id}
                  onPress={() => setSelected(provider)}
                  onSave={() =>
                    session ? toggleSaved(provider.id) : navigation.navigate('Welcome')
                  }
                />
              ))}
            </ScrollView>
          </View>
        ) : mapProviders.length > 0 ? (
          <View
            pointerEvents="box-none"
            style={[
              styles.mapEmptyCard,
              { backgroundColor: palette.surface, bottom: mapBottomInset },
            ]}
          >
            <Text style={[styles.mapEmptyTitle, { color: palette.text }]}>
              {visibleProviders.length === 0
                ? 'No businesses in this map area'
                : 'Map locations unavailable'}
            </Text>
            <Text style={[styles.mapEmptyText, { color: palette.text2 }]}>
              {visibleProviders.length === 0
                ? 'Move the map or choose another area to see businesses with map locations.'
                : 'No businesses match the current view. Clear your filters or browse Search.'}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Explore')}>
              <Text style={[styles.mapResetText, { color: palette.primary }]}>
                Browse businesses in Search
              </Text>
            </TouchableOpacity>
          </View>
        ) : providers.length > 0 ? (
          <View
            pointerEvents="box-none"
            style={[styles.mapEmptyPosition, { bottom: Math.max(112, mapBottomInset + 84) }]}
          >
            <GlowCard variant="map" contentStyle={styles.mapEmptyContent}>
              <Text style={[styles.mapEmptyTitle, { color: palette.text }]}>No map pins yet</Text>
              <Text style={[styles.mapEmptyText, { color: palette.text2 }]}>
                These businesses don&apos;t have a location yet. Browse them in Search.
              </Text>
              <GlowButton
                label="Browse in Search"
                variant="ghost"
                size="sm"
                onPress={() => navigation.navigate('Explore')}
                buttonStyle={styles.mapBrowseButton}
              />
            </GlowCard>
          </View>
        ) : (
          <View
            pointerEvents="box-none"
            style={[
              styles.mapEmptyCard,
              { backgroundColor: palette.surface, bottom: mapBottomInset },
            ]}
          >
            <Text style={[styles.mapEmptyTitle, { color: palette.text }]}>No providers found</Text>
            <Text style={[styles.mapEmptyText, { color: palette.text2 }]}>
              Try another service, city or category.
            </Text>
            <TouchableOpacity
              onPress={() => {
                setQuery('');
                setActiveCity(null);
                setActiveCategory(null);
              }}
            >
              <Text style={[styles.mapResetText, { color: palette.primary }]}>Clear filters</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function MapFilterChip({ label, active, onPress, palette }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.mapCityChip,
        {
          backgroundColor: active ? palette.primarySoft : palette.surfaceAlt,
          borderColor: active ? palette.primary : palette.border,
        },
      ]}
    >
      <Text style={[styles.mapCityChipText, { color: active ? palette.primary : palette.text2 }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function hasCoordinates(provider) {
  return (
    Number.isFinite(provider.baseLatitude) &&
    Number.isFinite(provider.baseLongitude) &&
    Math.abs(provider.baseLatitude) <= 90 &&
    Math.abs(provider.baseLongitude) <= 180
  );
}

function distanceKm(origin, provider) {
  const radians = (value) => (value * Math.PI) / 180;
  const dLat = radians(provider.baseLatitude - origin.latitude);
  const dLon = radians(provider.baseLongitude - origin.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(origin.latitude)) *
      Math.cos(radians(provider.baseLatitude)) *
      Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function businessOpenNow(provider) {
  const hours = provider.openingHours || [];
  if (!hours.length) return null;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const day = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[
    parts.find((part) => part.type === 'weekday')?.value
  ];
  const minutes =
    Number(parts.find((part) => part.type === 'hour')?.value) * 60 +
    Number(parts.find((part) => part.type === 'minute')?.value);
  const item = hours.find((entry) => Number(entry.day_of_week) === day);
  if (!item) return null;
  if (item.is_closed) return false;
  if (!item.open_time || !item.close_time) return null;
  const toMinutes = (value) => {
    const [h, m] = String(value).split(':').map(Number);
    return h * 60 + m;
  };
  const open = toMinutes(item.open_time),
    close = toMinutes(item.close_time);
  return close < open ? minutes >= open || minutes < close : minutes >= open && minutes < close;
}

function MapSelectedCard({ provider, saved, onSave, onDirections, onPress }) {
  return (
    <ProviderCardGlow
      variant="map"
      provider={{ ...provider, openNow: businessOpenNow(provider) }}
      saved={saved}
      selected
      onPress={onPress}
      onSave={onSave}
      onDirections={
        hasCoordinates(provider) || provider.address || provider.baseCity ? onDirections : undefined
      }
      saveTestID="btn-map-save"
      directionsTestID="btn-map-directions"
    />
  );
}

function MapNearbyCard({ provider, palette: _palette, saved, selected, onPress, onSave }) {
  return (
    <ProviderCardGlow
      variant="map"
      mapMode="nearby"
      provider={provider}
      saved={saved}
      selected={selected}
      onPress={onPress}
      onSave={onSave}
      saveTestID="btn-map-save"
    />
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    padding: spacing.lg,
    paddingBottom: 100,
    gap: 12,
  },

  mapPage: { flex: 1 },
  map: {
    flex: 1,
    margin: 0,
    borderRadius: 0,
    overflow: 'hidden',
    position: 'relative',
  },
  mapControls: { position: 'absolute', top: 88, left: 16, right: 16 },
  mapBrandHeader: {
    position: 'absolute',
    top: -1,
    left: -1,
    right: -1,
    height: 76,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },

  mapBrandLogo: { color: '#FFFFFF', fontSize: 25, fontWeight: '800', letterSpacing: -1 },
  mapBell: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  mapBellDot: {
    position: 'absolute',
    right: 4,
    top: 3,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  mapSearch: {
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    ...shadows.soft,
  },
  mapControlButton: { width: 28, height: 36, alignItems: 'center', justifyContent: 'center' },
  mapSearchInput: { flex: 1, height: 46, fontSize: 13, paddingVertical: 0, paddingHorizontal: 0 },
  mapFilterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapCategoryScroller: { marginHorizontal: -16 },
  mapCategoryRow: { gap: 8, paddingTop: 10, paddingHorizontal: 16 },
  mapCategoryChip: { maxWidth: 152 },

  mapFilterPanel: { marginTop: 10, borderRadius: 16, borderWidth: 1, padding: 13, ...shadows.soft },
  mapFilterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mapFilterTitle: { fontSize: 13, fontWeight: '800' },
  mapFilterSubtitle: { fontSize: 10, marginTop: 2 },
  mapResetText: { fontSize: 12, fontWeight: '800' },
  mapCityRow: { flexDirection: 'row', gap: 7, paddingTop: 11, paddingRight: 8 },
  mapCityChip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mapCityChipText: { fontSize: 10, fontWeight: '700' },
  mapResultBadge: {
    alignSelf: 'flex-start',
    marginTop: 10,
    borderRadius: radius.pill,
    minHeight: 34,
    paddingHorizontal: 11,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...shadows.soft,
  },
  mapSideControls: { position: 'absolute', right: 16, bottom: 250, gap: 8 },
  mapRoundControl: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  mapBottomArea: { position: 'absolute', left: 12, right: 12, gap: 10 },
  nearbyCarousel: { paddingVertical: 3, gap: 8, paddingRight: 8 },
  mapResultText: { fontSize: 11, fontWeight: '800' },
  mapEmptyCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 28,
    borderRadius: 20,
    padding: 16,
    gap: 5,
    ...shadows.lift,
  },
  mapEmptyTitle: { fontSize: 14, fontWeight: '900' },
  mapEmptyText: { fontSize: 11, marginBottom: 5 },
  mapEmptyPosition: { position: 'absolute', left: 16, right: 16 },
  mapEmptyContent: { gap: 8, padding: 16 },
  mapBrowseButton: { alignSelf: 'flex-start', paddingHorizontal: 8 },
});
