import React, { useCallback, useEffect, useState } from 'react';
import { Linking, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAppState } from '../context/AppStateContext';
import { useChodhiQTheme } from '../context/ThemeContext';
import { banners } from '../data/assetCatalog';
import { events } from '../data/discoveryData';
import { spacing } from '../theme/theme';
import {
  HomeBusinessCard,
  HomeCategory,
  HomeEvent,
  HomeFeatureCards,
  HomeHeader,
  HomeHero,
  HomeLocationBar,
  HomeMapCTA,
  HomeSearch,
  HomeSectionHeader,
} from '../components/HomeComponents';
import { MarketplaceSkeleton } from '../components/Skeleton';
import AdPlacement from '../components/AdPlacement';
import { loadActiveCampaigns, recordCampaignEvent } from '../data/adCampaignRepository';

export default function HomeScreen({ navigation }) {
  const {
    categories,
    providers,
    savedIds,
    toggleSaved,
    location,
    unreadCount,
    marketplaceLoading,
    refreshMarketplace,
    session,
  } = useAppState();
  const { palette, mode } = useChodhiQTheme();
  const themedHero =
    mode === 'dark'
      ? require('../../assets/theme/banner-dark.webp')
      : mode === 'warm'
        ? require('../../assets/theme/banner-warm.webp')
        : banners.featured;
  const [campaigns, setCampaigns] = useState([]);
  useEffect(() => {
    let active = true;
    loadActiveCampaigns(location)
      .then((rows) => active && setCampaigns(rows))
      .catch(() => active && setCampaigns([]));
    return () => {
      active = false;
    };
  }, [location]);
  const recordImpression = useCallback((campaign) => {
    recordCampaignEvent(campaign.id, 'impression').catch(() => {});
  }, []);
  const openCampaign = useCallback((campaign) => {
    recordCampaignEvent(campaign.id, 'click').catch(() => {});
    if (campaign.destinationUrl?.startsWith('https://')) Linking.openURL(campaign.destinationUrl);
  }, []);
  const insets = useSafeAreaInsets();
  const popular = [...providers]
    .filter((provider) => !provider.isImported || provider.rating > 0)
    .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
    .slice(0, 12);

  return (
    <SafeAreaView style={[styles.page, { backgroundColor: '#101817' }]} edges={['top']}>
      <ScrollView
        style={{ backgroundColor: palette.background }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 100 + Math.max(insets.bottom, 16) },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={marketplaceLoading}
            tintColor={palette.primary}
            colors={[palette.primary]}
            progressBackgroundColor={palette.surface}
            onRefresh={async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              await refreshMarketplace();
            }}
          />
        }
      >
        <HomeHeader
          palette={palette}
          unreadCount={unreadCount}
          onNotifications={() => navigation.navigate('Notifications')}
        />
        <HomeSearch palette={palette} onPress={() => navigation.navigate('Explore')} />
        <HomeLocationBar
          palette={palette}
          location={`${location}, UK`}
          onLocation={() => navigation.navigate('Location')}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontal}
        >
          {categories.slice(0, 5).map((category) => (
            <HomeCategory
              key={category.id}
              palette={palette}
              category={category}
              onPress={() => navigation.navigate('Explore', { categoryId: category.id })}
            />
          ))}
          <HomeCategory palette={palette} more onPress={() => navigation.navigate('Categories')} />
        </ScrollView>

        <HomeHero
          palette={palette}
          mode={mode}
          image={themedHero}
          onPress={() => navigation.navigate('Explore')}
        />

        <HomeSectionHeader
          palette={palette}
          title="Popular near you"
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
            {popular.map((provider) => (
              <HomeBusinessCard
                key={provider.id}
                palette={palette}
                provider={provider}
                saved={savedIds.includes(provider.id)}
                onSave={() => (session ? toggleSaved(provider.id) : navigation.navigate('Welcome'))}
                onPress={() => navigation.navigate('ProviderDetail', { id: provider.id })}
              />
            ))}
          </ScrollView>
        )}

        <HomeSectionHeader
          palette={palette}
          title="Featured categories"
          onPress={() => navigation.navigate('Categories')}
        />
        <HomeFeatureCards
          palette={palette}
          onTrending={() => navigation.navigate('Explore')}
          onDeals={() => navigation.navigate('Offers')}
        />

        <AdPlacement
          customCampaign={campaigns[0]}
          onImpression={recordImpression}
          onPress={openCampaign}
        />

        <HomeSectionHeader
          palette={palette}
          title="This Weekend"
          onPress={() => navigation.navigate('Events')}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontal}
        >
          {events.map((item) => (
            <HomeEvent
              key={item.id}
              palette={palette}
              item={item}
              onPress={() => navigation.navigate('Events')}
            />
          ))}
        </ScrollView>

        <HomeMapCTA palette={palette} onPress={() => navigation.navigate('Map')} />
      </ScrollView>
    </SafeAreaView>
  );
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
  horizontal: { paddingRight: spacing.md, paddingBottom: 4 },
});
