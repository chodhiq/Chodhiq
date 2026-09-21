import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Bell,
  Bookmark,
  CheckCircle2,
  Code2,
  Grid2X2,
  MapPin,
  Palette,
  Search,
  SlidersHorizontal,
  Star,
  Video,
} from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import ChodhiQMap from '../components/ChodhiQMap';
import { CreatorCard, EventCard, MapProviderCard, OfferCard } from '../components/DiscoveryCards';
import { creators, DEMO_MODE, events, offers } from '../data/discoveryData';
import { imageSource, people } from '../data/assetCatalog';
import { useAppState } from '../context/AppStateContext';
import { useChodhiQTheme } from '../context/ThemeContext';
import { radius, shadows, spacing, typography } from '../theme/theme';
import { features } from '../config/features';

const chips = ['All', 'London', 'Birmingham', 'Manchester', 'Leicester'];

export function OffersScreen({ navigation }) {
  const { palette } = useChodhiQTheme();
  return (
    <SafeAreaView style={[styles.page, { backgroundColor: palette.background }]}>
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

const creatorCategories = [
  ['All', Grid2X2],
  ['Photographers', Search],
  ['Videographers', Video],
  ['Designers', Palette],
  ['Developers', Code2],
  ['More', SlidersHorizontal],
];
export function CreatorsScreen({ navigation }) {
  const { palette } = useChodhiQTheme();
  const { savedIds, toggleSaved, marketplaceLoading } = useAppState();
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const list = useMemo(
    () =>
      creators.filter(
        (x) =>
          (category === 'All' || x.category === category) &&
          `${x.name} ${x.profession} ${x.city} ${x.languages.join(' ')}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [category, query],
  );
  const source = (x) =>
    imageSource(x.image || (DEMO_MODE && x.demo ? x.demoImage : null), people.professional);
  return (
    <SafeAreaView style={[styles.page, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.creatorPage} showsVerticalScrollIndicator={false}>
        <View style={styles.creatorHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.creatorTitle, { color: palette.text }]}>
              Creators & Freelancers
            </Text>
            <Text style={[styles.creatorSubtitle, { color: palette.text2 }]}>
              Connect with talented South Indian creators and professionals across the UK.
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open saved providers"
            onPress={() => navigation.navigate('Saved')}
            style={[
              styles.circleButton,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <Bookmark size={20} color={palette.text} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open notifications"
            onPress={() => navigation.navigate('Notifications')}
            style={[
              styles.circleButton,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <Bell size={20} color={palette.text} />
            <View style={styles.redDot} />
          </TouchableOpacity>
        </View>
        <View
          style={[
            styles.creatorSearch,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <Search size={21} color={palette.text2} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search creators, skills, services..."
            placeholderTextColor={palette.muted}
            style={[styles.creatorInput, { color: palette.text }]}
          />
          <SlidersHorizontal size={20} color={palette.saffron} />
        </View>
        <View style={styles.sectionRow}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Browse by category</Text>
          <Text style={[styles.seeAll, { color: palette.saffron }]}>See all</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {creatorCategories.map(([label, Icon]) => (
            <TouchableOpacity
              key={label}
              onPress={() => setCategory(label)}
              style={styles.categoryItem}
            >
              <View
                style={[
                  styles.categoryIcon,
                  {
                    backgroundColor: category === label ? `${palette.saffron}22` : palette.surface,
                    borderColor: category === label ? palette.saffron : palette.border,
                  },
                ]}
              >
                <Icon size={22} color={category === label ? palette.saffron : palette.primary} />
              </View>
              <Text
                style={[
                  styles.categoryLabel,
                  { color: category === label ? palette.saffron : palette.text2 },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.sectionRow}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Top creators near you</Text>
          <Text style={[styles.seeAll, { color: palette.saffron }]}>See all</Text>
        </View>
        {marketplaceLoading ? (
          <View style={[styles.skeleton, { backgroundColor: palette.surfaceAlt }]} />
        ) : list.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12 }}
          >
            {list.slice(0, 4).map((item) => (
              <View
                key={item.id}
                style={[
                  styles.topCreator,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                ]}
              >
                <Image source={source(item)} style={styles.topCreatorImage} />
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={
                    savedIds.includes(item.id)
                      ? `Remove ${item.name} from saved`
                      : `Save ${item.name}`
                  }
                  accessibilityState={{ selected: savedIds.includes(item.id) }}
                  onPress={() => toggleSaved(item.id)}
                  style={styles.saveOverlay}
                >
                  <Bookmark
                    size={18}
                    color="#fff"
                    fill={savedIds.includes(item.id) ? '#fff' : 'transparent'}
                  />
                </TouchableOpacity>
                {item.verified && (
                  <CheckCircle2
                    size={20}
                    color="#2F80ED"
                    fill="#fff"
                    style={styles.verifyOverlay}
                  />
                )}
                <Text style={[styles.cardName, { color: palette.text }]}>{item.name}</Text>
                <Text numberOfLines={2} style={[styles.cardMeta, { color: palette.text2 }]}>
                  {item.profession}
                </Text>
                <Text style={[styles.cardMeta, { color: palette.text2 }]}>{item.city}</Text>
                <View style={styles.rating}>
                  <Star size={13} color={palette.saffron} fill={palette.saffron} />
                  <Text style={[styles.ratingText, { color: palette.text }]}>
                    {item.rating} ({item.reviews})
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        ) : (
          <Text style={[styles.empty, { color: palette.text2 }]}>
            No creators match this search.
          </Text>
        )}
        <View style={styles.sectionRow}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Featured professionals</Text>
          <Text style={[styles.seeAll, { color: palette.saffron }]}>See all</Text>
        </View>
        {list.slice(1, 5).map((item) => (
          <View
            key={`featured-${item.id}`}
            style={[
              styles.featuredCreator,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <Image source={source(item)} style={styles.featuredImage} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardName, { color: palette.text }]}>{item.name}</Text>
              <Text style={[styles.cardMeta, { color: palette.text2 }]}>{item.profession}</Text>
              <Text style={[styles.cardMeta, { color: palette.text2 }]}>{item.city}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 10 }}>
              <View style={styles.rating}>
                <Star size={13} color={palette.saffron} fill={palette.saffron} />
                <Text style={[styles.ratingText, { color: palette.text }]}>
                  {item.rating} ({item.reviews})
                </Text>
              </View>
              {item.available && (
                <View style={[styles.available, { backgroundColor: `${palette.success}18` }]}>
                  <Text style={{ color: palette.success, fontSize: 10, fontWeight: '800' }}>
                    Available
                  </Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

export function EventsScreen({ navigation }) {
  const { palette } = useChodhiQTheme();
  return (
    <SafeAreaView style={[styles.page, { backgroundColor: palette.background }]}>
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
  const { providers, categories } = useAppState();
  const { palette } = useChodhiQTheme();
  const [selected, setSelected] = useState(providers[0]);
  const [activeCategory, setActiveCategory] = useState(null);
  const visibleProviders = useMemo(
    () =>
      activeCategory
        ? providers.filter((provider) => provider.categoryId === activeCategory)
        : providers,
    [activeCategory, providers],
  );
  useEffect(() => {
    if (!selected && visibleProviders.length) setSelected(visibleProviders[0]);
    else if (selected && !visibleProviders.some((provider) => provider.id === selected.id)) {
      setSelected(visibleProviders[0] || null);
    }
  }, [selected, visibleProviders]);
  return (
    <SafeAreaView
      style={[styles.page, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <View style={[styles.map, { backgroundColor: palette.surfaceAlt }]}>
        <ChodhiQMap
          providers={visibleProviders.slice(0, 30)}
          selected={selected}
          onSelect={setSelected}
          palette={palette}
        />
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
            <Text style={[styles.mapSearchText, { color: palette.text2 }]}>Search this area</Text>
            <SlidersHorizontal size={18} color={palette.text2} />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.mapCategoryRow}
          >
            <TouchableOpacity
              onPress={() => setActiveCategory(null)}
              style={[
                styles.mapChip,
                { backgroundColor: activeCategory ? palette.surface : palette.primary },
              ]}
            >
              <Text
                style={[
                  styles.mapChipText,
                  { color: activeCategory ? palette.text : palette.primaryActionText },
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            {categories.slice(0, 5).map((category) => {
              const active = activeCategory === category.id;
              return (
                <TouchableOpacity
                  key={category.id}
                  onPress={() => setActiveCategory(active ? null : category.id)}
                  style={[
                    styles.mapChip,
                    { backgroundColor: active ? palette.primary : palette.surface },
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.mapChipText,
                      { color: active ? palette.primaryActionText : palette.text },
                    ]}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
        {selected && (
          <MapProviderCard
            provider={selected}
            onPress={() => navigation.navigate('ProviderDetail', { id: selected.id })}
          />
        )}
      </View>
    </SafeAreaView>
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
  search: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 13,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  chips: { paddingHorizontal: spacing.lg, paddingVertical: 12, gap: 8 },
  chip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: radius.pill },
  creatorPage: { padding: 20, paddingBottom: 110 },
  creatorHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 20 },
  creatorTitle: { fontSize: 25, fontWeight: '900' },
  creatorSubtitle: { fontSize: 13, lineHeight: 19, marginTop: 7, maxWidth: 300 },
  circleButton: {
    width: 43,
    height: 43,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  redDot: {
    position: 'absolute',
    right: 7,
    top: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  creatorSearch: {
    height: 60,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 17,
    gap: 12,
  },
  creatorInput: { flex: 1, fontSize: 14 },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 25,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: '900' },
  seeAll: { fontSize: 12, fontWeight: '800' },
  categoryRow: { gap: 17 },
  categoryItem: { width: 67, alignItems: 'center' },
  categoryIcon: {
    width: 55,
    height: 55,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: { fontSize: 10, fontWeight: '700', marginTop: 7, textAlign: 'center' },
  topCreator: { width: 172, borderRadius: 17, borderWidth: 1, padding: 10, paddingBottom: 13 },
  topCreatorImage: { width: '100%', height: 132, borderRadius: 13 },
  saveOverlay: { position: 'absolute', top: 18, right: 18 },
  verifyOverlay: { position: 'absolute', top: 18, left: 18 },
  cardName: { fontSize: 14, fontWeight: '900', marginTop: 9 },
  cardMeta: { fontSize: 11, marginTop: 4 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  ratingText: { fontSize: 11, fontWeight: '800' },
  featuredCreator: {
    minHeight: 100,
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  featuredImage: { width: 105, height: 78, borderRadius: 12 },
  available: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  skeleton: { height: 230, borderRadius: 17, opacity: 0.65 },
  empty: { paddingVertical: 32, textAlign: 'center' },
  map: {
    flex: 1,
    margin: 0,
    borderRadius: 0,
    overflow: 'hidden',
    position: 'relative',
  },
  mapControls: { position: 'absolute', top: 12, left: 16, right: 16 },
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
  mapSearchText: { flex: 1, fontSize: 13 },
  mapCategoryRow: { gap: 8, paddingTop: 10, paddingRight: 16 },
  mapChip: {
    height: 34,
    maxWidth: 132,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    ...shadows.soft,
  },
  mapChipText: { fontSize: 11, fontWeight: '700' },
});
