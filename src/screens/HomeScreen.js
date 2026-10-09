import { AppAlert as Alert } from '../components/AppDialog';
import { MotionScrollView as ScrollView } from '../components/Motion';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Linking, RefreshControl, StyleSheet, View } from 'react-native';
import Text from '../components/AppText';
import { Store } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ExpoLocation from 'expo-location';
import { showPermissionRecovery } from '../lib/permissionRecovery';
import { useAppState } from '../context/AppStateContext';
import { useChodhiQTheme } from '../context/ThemeContext';
import { banners } from '../data/assetCatalog';
import { spacing } from '../theme/theme';
import {
  HomeBusinessCard,
  HomeCategory,
  HomeCommunityCTA,
  HomeFeaturedCategories,
  HomeHeader,
  HomeHero,
  HomeQuickActions,
  HomeSectionHeader,
} from '../components/HomeComponents';
import { MarketplaceSkeleton } from '../components/Skeleton';
import AdPlacement from '../components/AdPlacement';
import { loadActiveCampaigns, recordCampaignEvent } from '../data/adCampaignRepository';
import { distanceKm, isProviderOpenNow } from '../data/providerDiscovery';
import { FadeInView } from '../components/Motion';
import MarketplaceStatusBanner from '../components/MarketplaceStatusBanner';

export default function HomeScreen({ navigation }) {
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
    profile,
    setCurrentLocation,
  } = useAppState();
  const { palette, mode } = useChodhiQTheme();
  const themedHero =
    mode === 'dark'
      ? require('../../assets/theme/banner-dark.webp')
      : mode === 'warm'
        ? require('../../assets/theme/banner-warm.webp')
        : banners.featured;
  const [campaigns, setCampaigns] = useState([]);
  const [discoveryMode, setDiscoveryMode] = useState('popular');
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [locating, setLocating] = useState(false);
  useEffect(() => {
    let active = true;
    const refreshCampaigns = () =>
      loadActiveCampaigns(location)
        .then((rows) => active && setCampaigns(rows))
        .catch(() => active && setCampaigns([]));
    void refreshCampaigns();
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refreshCampaigns();
        void refreshMarketplace();
      }
    });
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') void refreshCampaigns();
    }, 60_000);
    return () => {
      active = false;
      listener.remove();
      clearInterval(interval);
    };
  }, [location, refreshMarketplace]);
  const recordImpression = useCallback((campaign) => {
    recordCampaignEvent(campaign.id, 'impression').catch(() => {});
  }, []);
  const openCampaign = useCallback((campaign) => {
    recordCampaignEvent(campaign.id, 'click').catch(() => {});
    if (campaign.destinationUrl?.startsWith('https://')) Linking.openURL(campaign.destinationUrl);
  }, []);
  const insets = useSafeAreaInsets();
  const useCurrentLocation = useCallback(async () => {
    try {
      setLocating(true);
      const permission = await ExpoLocation.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        showPermissionRecovery(
          'Location permission needed',
          'Allow location access to find businesses near you.',
        );
        return;
      }
      const position = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
      });
      const [place] = await ExpoLocation.reverseGeocodeAsync(position.coords);
      const city = place?.city || place?.subregion || place?.region;
      if (!city) {
        Alert.alert('Location unavailable', 'Choose your area manually and try again.');
        return;
      }
      setCurrentLocation(city, {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch {
      Alert.alert('Location unavailable', 'Choose your area manually and try again.');
    } finally {
      setLocating(false);
    }
  }, [setCurrentLocation]);
  const { enrichedProviders, popular, browseBusinesses, nearby, openNow, recentlyAdded } =
    useMemo(() => {
      const enriched = providers.map((provider) => {
        const distance =
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
          distance:
            distance == null
              ? null
              : `${distance < 10 ? distance.toFixed(1) : Math.round(distance)} km`,
          openNow: isProviderOpenNow(provider.openingHours),
        };
      });
      const categoryProviders = selectedCategoryId
        ? enriched.filter((provider) => provider.categoryId === selectedCategoryId)
        : enriched;
      const popularProviders = categoryProviders
        .filter((provider) => provider.reviewCount > 0 && Number.isFinite(provider.rating))
        .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
        .slice(0, 12);
      const browse = [...categoryProviders]
        .sort((a, b) => {
          const cityA =
            String(a.baseCity || '').toLowerCase() === String(location || '').toLowerCase();
          const cityB =
            String(b.baseCity || '').toLowerCase() === String(location || '').toLowerCase();
          if (cityA !== cityB) return cityA ? -1 : 1;
          const distanceA = parseDistance(a.distance);
          const distanceB = parseDistance(b.distance);
          return (
            distanceA - distanceB || new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0)
          );
        })
        .slice(0, 12);
      const nearbyProviders = categoryProviders
        .filter(
          (provider) =>
            Number.isFinite(provider.baseLatitude) &&
            Number.isFinite(provider.baseLongitude) &&
            provider.distance,
        )
        .sort((a, b) => parseDistance(a.distance) - parseDistance(b.distance))
        .slice(0, 12);
      const openProviders = categoryProviders
        .filter((provider) => provider.openNow === true)
        .sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0))
        .slice(0, 12);
      const recent = enriched
        .filter((provider) => provider.publishedAt)
        .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
        .slice(0, 12);
      return {
        enrichedProviders: enriched,
        popular: popularProviders,
        browseBusinesses: browse,
        nearby: nearbyProviders,
        openNow: openProviders,
        recentlyAdded: recent,
      };
    }, [providers, location, locationCoordinates, selectedCategoryId]);
  const discoveryProviders =
    discoveryMode === 'nearby'
      ? nearby
      : discoveryMode === 'open'
        ? openNow
        : discoveryMode === 'topRated'
          ? popular
          : popular.length
            ? popular
            : browseBusinesses;
  const popularTitle = {
    nearby: 'Nearby businesses',
    open: 'Open now',
    topRated: 'Top rated near you',
    popular: popular.length
      ? selectedCategoryId
        ? 'Popular in this category'
        : 'Popular near you'
      : 'Businesses to explore',
  }[discoveryMode];
  const featuredCategories = categories.slice(0, 10);
  return (
    <SafeAreaView style={[styles.page, { backgroundColor: '#101817' }]} edges={['top']}>
      <ScrollView
        style={{ backgroundColor: palette.background }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 72 + Math.max(insets.bottom, 12) },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={marketplaceLoading}
            tintColor={palette.primary}
            colors={[palette.primary]}
            progressBackgroundColor={palette.surface}
            onRefresh={async () => {
              await refreshMarketplace();
            }}
          />
        }
      >
        <HomeHeader
          palette={palette}
          unreadCount={unreadCount}
          location={location}
          profile={profile}
          currentLocationLoading={locating}
          onNotifications={() => navigation.navigate('Notifications')}
          onLocation={() => navigation.navigate('Location')}
          onCurrentLocation={useCurrentLocation}
          onSearch={() => navigation.navigate('Explore')}
          onProfile={() => navigation.navigate('Profile')}
        />
        <MarketplaceStatusBanner
          offline={offline}
          loading={marketplaceLoading}
          lastUpdatedAt={lastUpdatedAt}
          onRetry={refreshMarketplace}
          palette={palette}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.categoryHorizontal,
            { backgroundColor: palette.surface, borderBottomColor: palette.border },
          ]}
        >
          <HomeCategory
            key="all-categories"
            palette={palette}
            category={{ id: 'all', name: 'All', icon: 'grid' }}
            active={!selectedCategoryId}
            index={0}
            onPress={() => setSelectedCategoryId(null)}
          />
          {categories.slice(0, 8).map((category, index) => (
            <HomeCategory
              key={category.id}
              palette={palette}
              category={category}
              active={selectedCategoryId === category.id}
              index={index + 1}
              onPress={() =>
                setSelectedCategoryId((current) => (current === category.id ? null : category.id))
              }
            />
          ))}
          <HomeCategory
            palette={palette}
            more
            index={4}
            onPress={() => navigation.navigate('Categories')}
          />
        </ScrollView>

        <View style={styles.sectionInset}>
          <FadeInView distance={8}>
            <HomeHero
              palette={palette}
              mode={mode}
              image={themedHero}
              images={[themedHero, banners.premium, banners.soft]}
              location={location}
              onPress={() => navigation.navigate('Explore')}
            />
          </FadeInView>

          <HomeQuickActions
            palette={palette}
            onNearby={() => setDiscoveryMode('nearby')}
            onTopRated={() => setDiscoveryMode('topRated')}
            onOpenNow={() => setDiscoveryMode('open')}
          />

          <HomeSectionHeader
            palette={palette}
            title={popularTitle}
            subtitle={
              discoveryMode === 'nearby' && !locationCoordinates
                ? 'Choose your current location to sort by distance'
                : discoveryMode === 'open'
                  ? 'Based on business opening hours'
                  : discoveryMode === 'topRated'
                    ? 'Based on genuine customer reviews'
                    : popular.length
                      ? 'Top businesses people love around you'
                      : 'Real listings from the ChodhiQ directory'
            }
            onPress={() => navigation.navigate('Explore')}
          />
          {marketplaceLoading ? (
            <MarketplaceSkeleton count={3} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontal}
            >
              {discoveryProviders.map((provider) => (
                <HomeBusinessCard
                  key={provider.id}
                  palette={palette}
                  provider={provider}
                  saved={savedIds.includes(provider.id)}
                  onSave={() =>
                    session ? toggleSaved(provider.id) : navigation.navigate('Welcome')
                  }
                  onCategory={() =>
                    navigation.navigate('Explore', { categoryId: provider.categoryId })
                  }
                  onPress={() => navigation.navigate('ProviderDetail', { id: provider.id })}
                />
              ))}
            </ScrollView>
          )}

          {!marketplaceLoading && discoveryProviders.length === 0 && (
            <View
              style={[
                styles.emptyState,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ]}
            >
              {discoveryMode === 'popular' && (
                <Store
                  size={72}
                  strokeWidth={1.25}
                  color={palette.text2}
                  accessible={false}
                  style={{ marginBottom: 12 }}
                />
              )}
              <Text style={[styles.emptyTitle, { color: palette.text }]}>
                {discoveryMode === 'topRated'
                  ? 'No reviewed businesses to rank yet'
                  : discoveryMode === 'nearby' && !locationCoordinates
                    ? 'Choose your current location'
                    : discoveryMode === 'open'
                      ? 'No businesses are marked open right now'
                      : `No ${categories.find((category) => category.id === selectedCategoryId)?.name || 'business'} listings here yet`}
              </Text>
              <Text style={[styles.emptyBody, { color: palette.text2 }]}>
                {offline
                  ? 'Connect to the internet and retry to load business listings.'
                  : discoveryMode === 'topRated'
                    ? 'Ratings will appear when customers leave genuine reviews.'
                    : discoveryMode === 'nearby' && !locationCoordinates
                      ? 'Allow location access or choose an area to see nearby listings.'
                      : 'Check back soon or try another category.'}
              </Text>
            </View>
          )}

          <HomeSectionHeader
            palette={palette}
            title="Featured collections"
            subtitle="Browse categories with local businesses"
            onPress={() => navigation.navigate('Categories')}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontal}
          >
            <HomeFeaturedCategories
              palette={palette}
              categories={featuredCategories}
              providers={enrichedProviders}
              onCategory={(category) => navigation.navigate('Explore', { categoryId: category.id })}
            />
          </ScrollView>

          <HomeSectionHeader
            palette={palette}
            title="Recently added"
            subtitle="Newly published local businesses"
            onPress={() => navigation.navigate('Explore')}
          />
          {marketplaceLoading ? (
            <MarketplaceSkeleton count={3} />
          ) : recentlyAdded.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontal}
            >
              {recentlyAdded.map((provider) => (
                <HomeBusinessCard
                  key={`recent-${provider.id}`}
                  palette={palette}
                  provider={provider}
                  saved={savedIds.includes(provider.id)}
                  onSave={() =>
                    session ? toggleSaved(provider.id) : navigation.navigate('Welcome')
                  }
                  onCategory={() =>
                    navigation.navigate('Explore', { categoryId: provider.categoryId })
                  }
                  onPress={() => navigation.navigate('ProviderDetail', { id: provider.id })}
                />
              ))}
            </ScrollView>
          ) : !marketplaceLoading ? (
            <View
              style={[
                styles.emptyState,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ]}
            >
              <Text style={[styles.emptyBody, { color: palette.text2 }]}>
                New listings will appear here when businesses publish their profiles.
              </Text>
            </View>
          ) : null}

          <AdPlacement
            customCampaign={campaigns[0]}
            onImpression={recordImpression}
            onPress={openCampaign}
          />

          <HomeCommunityCTA
            palette={palette}
            onPress={() => navigation.navigate('Community', { compose: true })}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function parseDistance(value) {
  const distance = Number.parseFloat(String(value));
  return Number.isFinite(distance) ? distance : Number.POSITIVE_INFINITY;
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 840,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  categoryHorizontal: {
    marginHorizontal: -18,
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 2,
    backgroundColor: '#FFFFFF',
    gap: 5,
  },
  sectionInset: { width: '100%' },
  horizontal: { paddingRight: spacing.md, paddingBottom: 4 },
  emptyState: { alignItems: 'center', borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 4 },
  emptyTitle: { fontSize: 13, fontWeight: '800', textAlign: 'center' },
  emptyBody: { fontSize: 11, lineHeight: 16, textAlign: 'center' },
});
