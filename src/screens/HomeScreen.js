import { AppAlert as Alert } from '../components/AppDialog';
import { MotionScrollView as ScrollView } from '../components/Motion';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, RefreshControl, StyleSheet, View } from 'react-native';
import Text from '../components/AppText';
import { Store } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ExpoLocation from 'expo-location';
import { showPermissionRecovery } from '../lib/permissionRecovery';
import { getDeviceLocation } from '../lib/deviceLocation';
import { useAppState } from '../context/AppStateContext';
import { useChodhiQTheme } from '../context/ThemeContext';
import { spacing } from '../theme/theme';
import { getTabBarContentPadding } from '../navigation/tabBarLayout';
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
import { features } from '../config/features';
import { openExternalUrl } from '../lib/openExternalUrl';

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
    refreshError,
    lastUpdatedAt,
    marketplaceLoading,
    refreshMarketplace,
    session,
    profile,
    setCurrentLocation,
  } = useAppState();
  const { palette, mode } = useChodhiQTheme();
  const themedHero = require('../../assets/theme/banner-dark.webp');
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
  const recordImpression = useCallback((campaign, placement = 'customer-home') => {
    const recorded =
      placement === 'customer-home'
        ? recordCampaignEvent(campaign.id, 'impression')
        : recordCampaignEvent(campaign.id, 'impression', placement);
    recorded.catch(() => {});
  }, []);
  const openCampaign = useCallback((campaign, placement = 'customer-home') => {
    const recorded =
      placement === 'customer-home'
        ? recordCampaignEvent(campaign.id, 'click')
        : recordCampaignEvent(campaign.id, 'click', placement);
    recorded.catch(() => {});
    if (campaign.destinationUrl?.startsWith('https://'))
      void openExternalUrl(campaign.destinationUrl, {
        title: 'Sponsor link unavailable',
        fallbackMessage: 'This sponsor link could not be opened. Try again later.',
      });
  }, []);
  const insets = useSafeAreaInsets();
  const useCurrentLocation = useCallback(async () => {
    try {
      setLocating(true);
      const detected = await getDeviceLocation(ExpoLocation);
      setCurrentLocation(detected.city || location, detected);
      Alert.alert(
        'Location updated',
        detected.city
          ? `Nearby businesses will use your current location in ${detected.city}.`
          : 'Nearby businesses will use your current device location.',
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
  }, [location, setCurrentLocation]);
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
            provider.distance &&
            parseDistance(provider.distance) <= 50,
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
  const locationPopular = locationCoordinates
    ? popular.filter((provider) => nearby.some((item) => item.id === provider.id))
    : popular;
  const discoveryProviders =
    discoveryMode === 'nearby'
      ? nearby
      : discoveryMode === 'open'
        ? openNow
        : discoveryMode === 'topRated'
          ? popular
          : locationCoordinates
            ? locationPopular.length
              ? locationPopular
              : nearby.length
                ? nearby
                : browseBusinesses
            : popular.length
              ? popular
              : browseBusinesses;
  const directoryFallback = discoveryMode === 'popular' && !!locationCoordinates && !nearby.length;
  const popularTitle = {
    nearby: 'Nearby businesses',
    open: 'Open now',
    topRated: locationCoordinates ? 'Top rated near you' : 'Top rated',
    popular: directoryFallback
      ? 'UK businesses to explore'
      : locationCoordinates
        ? locationPopular.length
          ? selectedCategoryId
            ? 'Popular in this category'
            : 'Popular near you'
          : 'Nearby businesses'
        : popular.length
          ? selectedCategoryId
            ? 'Popular in this category'
            : 'Popular businesses'
          : 'Businesses to explore',
  }[discoveryMode];
  const featuredCategories = categories.slice(0, 10);
  const recentlyAddedWithoutDuplicates = recentlyAdded.filter(
    (provider) =>
      !discoveryProviders.some(
        (visibleProvider) => String(visibleProvider.id) === String(provider.id),
      ),
  );
  return (
    <SafeAreaView style={[styles.page, { backgroundColor: 'transparent' }]} edges={['top']}>
      <ScrollView
        style={{ backgroundColor: 'transparent' }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: getTabBarContentPadding(insets.bottom) },
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
          refreshError={refreshError}
          loading={marketplaceLoading}
          lastUpdatedAt={lastUpdatedAt}
          onRetry={refreshMarketplace}
          palette={palette}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ backgroundColor: 'transparent' }}
          contentContainerStyle={styles.categoryHorizontal}
        >
          {categories.slice(0, 3).map((category) => (
            <HomeCategory
              key={category.id}
              palette={palette}
              category={category}
              active={selectedCategoryId === category.id}
              onPress={() =>
                setSelectedCategoryId((current) => (current === category.id ? null : category.id))
              }
            />
          ))}
          <HomeCategory palette={palette} more onPress={() => navigation.navigate('Categories')} />
        </ScrollView>

        <View style={styles.sectionInset}>
          <FadeInView distance={8}>
            <HomeHero
              palette={palette}
              mode={mode}
              image={themedHero}
              images={[themedHero]}
              location={location}
              campaign={features.customAds ? campaigns[0] : null}
              onCampaignImpression={(campaign) => recordImpression(campaign, 'home_hero')}
              onCampaignPress={(campaign) => openCampaign(campaign, 'home_hero')}
              onPress={() => navigation.navigate('Explore')}
            />
          </FadeInView>

          <HomeQuickActions
            palette={palette}
            activeMode={discoveryMode}
            onNearby={() =>
              setDiscoveryMode((current) => (current === 'nearby' ? 'popular' : 'nearby'))
            }
            onTopRated={() =>
              setDiscoveryMode((current) => (current === 'topRated' ? 'popular' : 'topRated'))
            }
            onOpenNow={() =>
              setDiscoveryMode((current) => (current === 'open' ? 'popular' : 'open'))
            }
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
                    : directoryFallback
                      ? 'No businesses near you yet. Showing the UK directory.'
                      : locationCoordinates
                        ? 'Based on businesses within 50 km'
                        : popular.length
                          ? 'Top businesses people love around you'
                          : 'Real listings from the ChodhiQ directory'
            }
            onPress={
              discoveryMode === 'topRated' && discoveryProviders.length === 0
                ? undefined
                : () => navigation.navigate('Explore')
            }
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
                  saved={savedIds.includes(String(provider.id))}
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
                discoveryMode === 'topRated' && styles.compactEmptyState,
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
                  : discoveryMode === 'nearby'
                    ? locationCoordinates
                      ? 'No nearby businesses yet'
                      : 'Choose your current location'
                    : discoveryMode === 'open'
                      ? 'No businesses are marked open right now'
                      : `No ${categories.find((category) => category.id === selectedCategoryId)?.name || 'business'} listings here yet`}
              </Text>
              <Text style={[styles.emptyBody, { color: palette.text2 }]}>
                {discoveryMode === 'nearby'
                  ? locationCoordinates
                    ? 'No nearby business listings are available for this location yet. Browse all businesses or choose another area.'
                    : 'Allow location access or choose an area to see nearby listings.'
                  : offline
                    ? 'You are offline. Showing saved directory data; reconnect and retry to refresh listings.'
                    : refreshError
                      ? 'The directory could not be refreshed. Showing the latest available listings; retry to refresh.'
                      : discoveryMode === 'topRated'
                        ? 'Ratings will appear when customers leave genuine reviews.'
                        : 'Check back soon or try another category.'}
              </Text>
            </View>
          )}

          {categories.length > 0 ? (
            <>
              <HomeSectionHeader
                palette={palette}
                title="Featured collections"
                subtitle="Browse all categories"
                onPress={() => navigation.navigate('Categories')}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.featuredCategoriesScroll}
                contentContainerStyle={styles.featuredCategoriesContent}
              >
                <HomeFeaturedCategories
                  palette={palette}
                  categories={featuredCategories}
                  providers={enrichedProviders}
                  onCategory={(category) =>
                    navigation.navigate('Explore', { categoryId: category.id })
                  }
                />
              </ScrollView>
            </>
          ) : null}

          <HomeSectionHeader
            palette={palette}
            title="Recently added"
            subtitle={
              recentlyAddedWithoutDuplicates.length
                ? 'Newly published local businesses'
                : recentlyAdded.length
                  ? 'No other new listings beyond the businesses shown above'
                  : 'Newly published local businesses'
            }
            onPress={
              recentlyAddedWithoutDuplicates.length
                ? () => navigation.navigate('Explore')
                : undefined
            }
          />
          {marketplaceLoading ? (
            <MarketplaceSkeleton count={3} />
          ) : recentlyAddedWithoutDuplicates.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontal}
            >
              {recentlyAddedWithoutDuplicates.map((provider) => (
                <HomeBusinessCard
                  key={`recent-${provider.id}`}
                  palette={palette}
                  provider={provider}
                  saved={savedIds.includes(String(provider.id))}
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

          <AdPlacement onImpression={recordImpression} onPress={openCampaign} />

          <HomeCommunityCTA
            palette={palette}
            onPress={() => navigation.navigate('CommunityTab', { compose: true })}
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
    paddingVertical: 5,
    flexGrow: 1,
    justifyContent: 'center',
    backgroundColor: 'transparent',
    gap: 8,
  },
  sectionInset: { width: '100%' },
  horizontal: { paddingRight: spacing.md, paddingBottom: 4 },
  featuredCategoriesScroll: { marginHorizontal: -18 },
  featuredCategoriesContent: { paddingHorizontal: 18, paddingBottom: 4 },
  emptyState: { alignItems: 'center', borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 4 },
  compactEmptyState: { alignItems: 'flex-start', paddingVertical: 10, paddingHorizontal: 12 },
  emptyTitle: { fontSize: 13, fontWeight: '800', textAlign: 'center' },
  emptyBody: { fontSize: 11, lineHeight: 16, textAlign: 'center' },
});
