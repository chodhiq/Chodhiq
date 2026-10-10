import { AppAlert as Alert } from '../components/AppDialog';
import { MotionTouchable as TouchableOpacity } from '../components/Motion';
import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import AppTextInput from '../components/AppTextInput';
import { Image, Linking, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import Text from '../components/AppText';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Bell,
  MapPin,
  Layers,
  Search,
  SlidersHorizontal,
  Star,
  X,
  Utensils,
  Store,
  Scissors,
  Building2,
  Hotel,
  PartyPopper,
  LayoutGrid,
  LocateFixed,
  Navigation,
  Heart,
} from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import ChodhiQMap from '../components/ChodhiQMap';
import { EventCard, OfferCard } from '../components/DiscoveryCards';
import { events, offers } from '../data/discoveryData';
import { imageSource } from '../data/assetCatalog';
import { useAppState } from '../context/AppStateContext';
import { useChodhiQTheme } from '../context/ThemeContext';
import { radius, shadows, spacing } from '../theme/theme';
import { features } from '../config/features';
import { matchesProviderSearch, providerMatchesCategory } from '../data/categoryMatching';
import * as ExpoLocation from 'expo-location';
import { showPermissionRecovery } from '../lib/permissionRecovery';
import { getDeviceLocation } from '../lib/deviceLocation';

export function OffersScreen({ navigation }) {
  const { palette } = useChodhiQTheme();
  return (
    <SafeAreaView
      style={[styles.page, { backgroundColor: palette.background }]}
      edges={['left', 'right', 'bottom']}
    >
      <ScreenHeader
        navigation={navigation}
        title="Offers near you"
        subtitle="Live promotions from community providers"
      />
      <ScrollView contentContainerStyle={styles.content}>
        {features.customAds ? (
          offers.map((item) => <OfferCard key={item.id} item={item} />)
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
      style={[styles.page, { backgroundColor: palette.background }]}
      edges={['left', 'right', 'bottom']}
    >
      <ScreenHeader
        navigation={navigation}
        title="Events"
        subtitle="Culture, community and business across the UK"
      />
      <ScrollView contentContainerStyle={styles.content}>
        {events.map((item) => (
          <EventCard
            key={item.id}
            item={item}
            onPress={() =>
              Linking.openURL(
                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.title + ' ' + item.city)}`,
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
  } = useAppState();
  const { palette } = useChodhiQTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [selected, setSelected] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeCity, setActiveCity] = useState(null);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [viewport, setViewport] = useState(null);
  const [locating, setLocating] = useState(false);
  const [layersVisible, setLayersVisible] = useState(false);
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
    const destination = hasCoordinates(provider)
      ? `${provider.baseLatitude},${provider.baseLongitude}`
      : provider.address || `${provider.name} ${provider.baseCity || ''}`;
    Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`,
    ).catch(() => {});
  };
  const categoryShortcuts = [
    ['All', null, LayoutGrid],
    ['Restaurants', ['restaurant', 'restaurants'], Utensils],
    ['Shops', ['shop', 'shops', 'grocery'], Store],
    ['Salons & Beauty', ['beauty', 'salon', 'salons & beauty'], Scissors],
    ['Home & Property', ['home-property', 'property', 'home & property'], Building2],
    ['Hotels & Stay', ['hotel', 'hotels', 'hotels & stay'], Hotel],
    ['Events & Catering', ['events', 'event', 'catering', 'events & catering'], PartyPopper],
  ];
  return (
    <SafeAreaView style={[styles.mapPage, { backgroundColor: palette.background }]} edges={[]}>
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
          style={[
            styles.mapBrandHeader,
            { backgroundColor: palette.dark ? palette.bg : '#101817' },
          ]}
        >
          <Text style={styles.mapBrandLogo}>
            Chodhi<Text style={{ color: palette.primary }}>Q</Text>
          </Text>
          <TouchableOpacity
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
          <View style={[styles.mapSearch, { backgroundColor: palette.surface }]}>
            {route?.name !== 'MapTab' && (
              <TouchableOpacity
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
                accessibilityRole="button"
                accessibilityLabel="Clear map search"
                onPress={() => setQuery('')}
                style={styles.mapControlButton}
              >
                <X size={18} color={palette.text2} />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Show map filters"
              accessibilityState={{ expanded: filtersVisible }}
              onPress={() => setFiltersVisible((value) => !value)}
              style={[
                styles.mapFilterButton,
                { backgroundColor: filtersVisible ? palette.primarySoft : palette.surfaceAlt },
              ]}
            >
              <SlidersHorizontal size={18} color={palette.primary} />
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.mapCategoryRow}
          >
            {categoryShortcuts.map(([label, categoryIds, Icon]) => {
              const target =
                categoryIds &&
                categories.find((item) => {
                  const id = String(item.id || '').toLowerCase();
                  const name = String(item.name || '').toLowerCase();
                  return categoryIds.some((value) => id === value || name === value);
                });
              const categoryId = target?.id;
              const active = categoryId ? activeCategory === target?.id : !activeCategory;
              return (
                <TouchableOpacity
                  key={label}
                  onPress={() =>
                    setActiveCategory(categoryId ? (active ? null : target?.id || null) : null)
                  }
                  style={[
                    styles.mapCategoryCard,
                    {
                      backgroundColor: active ? palette.primary : palette.surface,
                      borderColor: active ? palette.primary : palette.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.mapCategoryIcon,
                      { backgroundColor: active ? '#FFFFFF20' : palette.surfaceAlt },
                    ]}
                  >
                    <Icon size={20} color={active ? '#FFFFFF' : palette.text} />
                  </View>
                  <Text
                    numberOfLines={2}
                    style={[styles.mapCategoryLabel, { color: active ? '#FFFFFF' : palette.text }]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {filtersVisible ? (
            <View
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
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
          <View style={styles.mapFloatingRow}>
            <View style={[styles.mapResultBadge, { backgroundColor: palette.surface }]}>
              <MapPin size={15} color={palette.primary} />
              <Text style={[styles.mapResultText, { color: palette.text }]}>
                {visibleProviders.length} results in this area
              </Text>
            </View>
            <TouchableOpacity
              disabled={locating}
              onPress={useCurrentLocation}
              style={[styles.currentLocationButton, { backgroundColor: palette.surface }]}
            >
              <LocateFixed size={16} color={palette.primary} />
              <Text style={{ color: palette.primary, fontWeight: '800', fontSize: 12 }}>
                {locating ? 'Locating…' : 'Use current location'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={[styles.mapSideControls, { bottom: Math.max(205, windowHeight * 0.29) }]}>
          <TouchableOpacity
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
            disabled={locating}
            accessibilityRole="button"
            accessibilityLabel="Go to current location"
            onPress={useCurrentLocation}
            style={[styles.mapRoundControl, { backgroundColor: palette.surface }]}
          >
            <Navigation size={20} color={palette.text} />
          </TouchableOpacity>
        </View>
        {selected ? (
          <View
            style={[
              styles.mapBottomArea,
              { bottom: Math.max(8, insets.bottom), maxHeight: windowHeight * 0.48 },
            ]}
          >
            <MapSelectedCard
              provider={providersById.get(selected.id) || selected}
              palette={palette}
              saved={savedIds.includes(selected.id)}
              onSave={() => (session ? toggleSaved(selected.id) : navigation.navigate('Welcome'))}
              onDirections={() => directions(selected)}
              onPress={() => navigation.navigate('ProviderDetail', { id: selected.id })}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.nearbyCarousel}
              style={{ maxHeight: 145 }}
            >
              {nearCards.map((provider) => (
                <MapNearbyCard
                  key={provider.id}
                  provider={providersById.get(provider.id) || provider}
                  palette={palette}
                  selected={provider.id === selected.id}
                  onPress={() => setSelected(provider)}
                />
              ))}
            </ScrollView>
          </View>
        ) : providers.length > 0 && mapProviders.length === 0 ? (
          <View
            style={[
              styles.mapEmptyCard,
              { backgroundColor: palette.surface, bottom: Math.max(8, insets.bottom) },
            ]}
          >
            <Text style={[styles.mapEmptyTitle, { color: palette.text }]}>
              Map locations unavailable
            </Text>
            <Text style={[styles.mapEmptyText, { color: palette.text2 }]}>
              Businesses are available in Search, but their map locations could not be loaded.
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Explore')}>
              <Text style={[styles.mapResetText, { color: palette.primary }]}>
                Browse businesses in Search
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View
            style={[
              styles.mapEmptyCard,
              { backgroundColor: palette.surface, bottom: Math.max(8, insets.bottom) },
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

function MapSelectedCard({ provider, palette, saved, onSave, onDirections, onPress }) {
  const image = provider.image ? imageSource(provider.image) : null;
  const openNow = businessOpenNow(provider);
  const distance = provider.distance || null;
  return (
    <View style={[styles.selectedBusinessCard, { backgroundColor: palette.surface }]}>
      <View style={styles.selectedHandle} />
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.selectedCardBody}>
        {image ? (
          <Image source={image} style={styles.selectedBusinessImage} />
        ) : (
          <View
            style={[
              styles.selectedBusinessImage,
              styles.missingImage,
              { backgroundColor: palette.surfaceAlt },
            ]}
          >
            <Store size={28} color={palette.muted} />
          </View>
        )}
        <View style={styles.selectedBusinessCopy}>
          <Text numberOfLines={1} style={[styles.selectedBusinessName, { color: palette.text }]}>
            {provider.name}
          </Text>
          <Text numberOfLines={1} style={[styles.mapSecondary, { color: palette.text2 }]}>
            {provider.category}
          </Text>
          <View style={styles.mapMetaRow}>
            {provider.reviewCount > 0 && Number.isFinite(provider.rating) && (
              <>
                <Star size={15} fill={palette.saffron} color={palette.saffron} />
                <Text style={[styles.mapRatingText, { color: palette.text }]}>
                  {provider.rating.toFixed(1)} ({provider.reviewCount})
                </Text>
              </>
            )}
            {distance && (
              <Text style={[styles.mapSecondary, { color: palette.text2 }]}>· {distance}</Text>
            )}
          </View>
          {!!provider.address && (
            <Text numberOfLines={1} style={[styles.mapSecondary, { color: palette.text2 }]}>
              {provider.address}
            </Text>
          )}
          {typeof openNow === 'boolean' && (
            <View
              style={[
                styles.openStatus,
                { backgroundColor: openNow ? palette.primarySoft : palette.surfaceAlt },
              ]}
            >
              <Text
                style={{
                  color: openNow ? palette.primary : palette.text2,
                  fontSize: 11,
                  fontWeight: '800',
                }}
              >
                {openNow ? 'Open' : 'Closed'}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.selectedActions}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={
              saved ? `Remove ${provider.name} from saved` : `Save ${provider.name}`
            }
            onPress={onSave}
            style={styles.mapActionButton}
          >
            <Heart
              size={19}
              color={saved ? palette.danger : palette.text2}
              fill={saved ? palette.danger : 'transparent'}
            />
          </TouchableOpacity>
          {(hasCoordinates(provider) || provider.address || provider.baseCity) && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Directions to ${provider.name}`}
              onPress={onDirections}
              style={[styles.mapActionButton, { backgroundColor: palette.primarySoft }]}
            >
              <Navigation size={19} color={palette.primary} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

function MapNearbyCard({ provider, palette, selected, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.nearbyCard,
        {
          backgroundColor: palette.surface,
          borderColor: selected ? palette.primary : palette.border,
          borderWidth: selected ? 2 : 1,
        },
      ]}
    >
      {provider.image ? (
        <Image source={imageSource(provider.image)} style={styles.nearbyImage} />
      ) : (
        <View
          style={[styles.nearbyImage, styles.missingImage, { backgroundColor: palette.surfaceAlt }]}
        >
          <Store size={20} color={palette.muted} />
        </View>
      )}
      <Text numberOfLines={1} style={[styles.nearbyName, { color: palette.text }]}>
        {provider.name}
      </Text>
      <View style={styles.nearbyMeta}>
        <MapPin size={12} color={palette.text2} />
        <Text style={[styles.nearbyMetaText, { color: palette.text2 }]}>
          {provider.distance || provider.baseCity}
        </Text>
        {provider.reviewCount > 0 && Number.isFinite(provider.rating) && (
          <>
            <Star size={12} color={palette.saffron} fill={palette.saffron} />
            <Text style={[styles.nearbyMetaText, { color: palette.text2 }]}>
              {provider.rating.toFixed(1)}
            </Text>
          </>
        )}
      </View>
    </TouchableOpacity>
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
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    ...shadows.soft,
  },
  mapControlButton: { width: 28, height: 36, alignItems: 'center', justifyContent: 'center' },
  mapSearchInput: { flex: 1, height: 46, fontSize: 13, paddingVertical: 0 },
  mapFilterButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapCategoryRow: { gap: 8, paddingTop: 10, paddingRight: 16 },
  mapCategoryCard: {
    width: 98,
    minHeight: 84,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    gap: 4,
    ...shadows.soft,
  },
  mapCategoryIcon: {
    width: 52,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapCategoryLabel: { fontSize: 11, lineHeight: 14, textAlign: 'center', fontWeight: '700' },

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
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.soft,
  },
  mapFloatingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  currentLocationButton: {
    minHeight: 42,
    borderRadius: 24,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
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
  selectedBusinessCard: { borderRadius: 22, padding: 12, ...shadows.lift },
  selectedHandle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#9CA3AF66',
    alignSelf: 'center',
    marginBottom: 10,
  },
  selectedCardBody: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  selectedBusinessImage: { width: 110, height: 104, borderRadius: 14 },
  missingImage: { alignItems: 'center', justifyContent: 'center' },
  selectedBusinessCopy: { flex: 1, gap: 4, minWidth: 0 },
  selectedBusinessName: { fontSize: 17, fontWeight: '900' },
  mapSecondary: { fontSize: 11, lineHeight: 15 },
  mapMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  mapRatingText: { fontSize: 12, fontWeight: '700' },
  openStatus: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 2,
  },
  selectedActions: { justifyContent: 'space-between', alignSelf: 'stretch' },
  mapActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nearbyCarousel: { paddingVertical: 3, gap: 8, paddingRight: 8 },
  nearbyCard: { width: 142, borderRadius: 14, padding: 6, gap: 5, ...shadows.soft },
  nearbyImage: { width: '100%', height: 72, borderRadius: 9 },
  nearbyName: { fontSize: 11, fontWeight: '800' },
  nearbyMeta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  nearbyMetaText: { fontSize: 10, flexShrink: 1 },
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
});
