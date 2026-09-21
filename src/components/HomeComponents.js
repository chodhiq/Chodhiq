import React from 'react';
import { Image, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  Bell,
  ChevronRight,
  Heart,
  Map,
  MapPin,
  Search,
  SlidersHorizontal,
  Star,
} from 'lucide-react-native';
import { categoryFallback, imageSource } from '../data/assetCatalog';
import { radius, shadows } from '../theme/theme';
import * as Icons from 'lucide-react-native';

export function HomeHeader({ palette, unreadCount, onNotifications }) {
  const logo = require('../../assets/chodhiq-official-logo.png');
  return (
    <View style={[s.header, { backgroundColor: palette.dark ? palette.bg : '#101817' }]}>
      <View style={s.top}>
        <Image source={logo} style={s.logo} resizeMode="contain" accessibilityLabel="ChodhiQ" />
        <View style={s.actions}>
          <IconButton
            onPress={onNotifications}
            label={`Open notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
          >
            <Bell size={20} color="#FFFFFF" />
            {unreadCount > 0 && <View style={s.dot} />}
          </IconButton>
        </View>
      </View>
    </View>
  );
}
function IconButton({ onPress, children, label }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={s.iconButton}
    >
      {children}
    </TouchableOpacity>
  );
}
export function HomeSearch({ palette, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[s.search, { backgroundColor: palette.elevated, borderColor: palette.border }]}
    >
      <Search size={20} color={palette.text} />
      <Text style={[s.searchText, { color: palette.text2 }]}>
        Search for restaurants, salons, services...
      </Text>
      <View style={[s.filter, { backgroundColor: palette.surfaceMuted }]}>
        <SlidersHorizontal size={19} color={palette.text2} />
      </View>
    </TouchableOpacity>
  );
}
export function HomeLocationBar({ palette, location, onLocation }) {
  return (
    <View style={s.locationRow}>
      <TouchableOpacity style={s.locationInline} onPress={onLocation}>
        <MapPin size={18} color={palette.text} fill={palette.text} />
        <Text numberOfLines={1} style={[s.locationText, { color: palette.text }]}>
          {location}
        </Text>
        <ChevronRight size={15} color={palette.text2} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onLocation}
        style={[s.currentLocation, { backgroundColor: palette.surfaceMuted }]}
      >
        <MapPin size={15} color={palette.primary} />
        <Text style={[s.currentLocationText, { color: palette.primary }]}>
          Use current location
        </Text>
      </TouchableOpacity>
    </View>
  );
}
export function HomeHero({ palette, mode, image, onPress }) {
  const warm = mode === 'warm';
  const eyebrow = warm ? 'GOOD PLACES   BRIGHTER DAYS' : 'DISCOVER NEAR YOU';
  const firstLine = warm ? 'Explore' : 'Great places';
  const secondLine = warm ? 'your neighborhood' : 'around you';
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={s.hero}>
      <ImageBackground
        source={image}
        resizeMode="cover"
        style={[s.heroImage, { height: 190, aspectRatio: undefined, justifyContent: 'flex-end' }]}
        imageStyle={s.heroRadius}
      >
        <View
          style={[s.overlay, { backgroundColor: warm ? 'rgba(251,245,234,.72)' : palette.overlay }]}
        />
        <View style={[s.heroCopy, { padding: 20, maxWidth: '84%' }]}>
          <Text style={[s.heroEyebrow, { color: palette.textSecondary }]}>{eyebrow}</Text>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.82}
            numberOfLines={2}
            style={[s.heroTitle, { color: warm ? palette.text : '#FFFFFF' }]}
          >
            {firstLine}
            {`\n`}
            <Text style={{ color: warm ? palette.primary : '#FFFFFF' }}>{secondLine}</Text>
          </Text>
          <Text
            numberOfLines={3}
            style={[s.heroBody, { color: warm ? palette.textSecondary : '#F2F5F3' }]}
          >
            Find the best restaurants, services and local businesses — all in one place.
          </Text>
          <View
            style={[
              s.heroButton,
              {
                backgroundColor: palette.primary,
                height: 40,
              },
            ]}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Explore now</Text>
            <ChevronRight size={18} color="#FFFFFF" />
          </View>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
}
export function HomeFeatureCards({ palette, onTrending, onDeals }) {
  return (
    <View style={s.featureRow}>
      <TouchableOpacity
        onPress={onTrending}
        style={[s.featureCard, { backgroundColor: palette.primaryTint }]}
      >
        <Icons.BarChart3 style={s.featureIcon} size={24} color={palette.primary} />
        <View style={{ flex: 1, justifyContent: 'space-between' }}>
          <Text style={[s.featureTitle, { color: palette.text }]}>Trending this week</Text>
          <View style={[s.featureArrow, { backgroundColor: palette.primary }]}>
            <ChevronRight size={16} color={palette.onPrimary} />
          </View>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onDeals}
        style={[s.featureCard, { backgroundColor: palette.accentTint }]}
      >
        <Icons.Tag style={s.featureIcon} size={24} color={palette.accent} />
        <View style={{ flex: 1, justifyContent: 'space-between' }}>
          <Text style={[s.featureTitle, { color: palette.text }]}>Nearby deals</Text>
          <Text style={[s.featureBody, { color: palette.text2 }]}>Save on top places</Text>
          <View style={[s.featureArrow, { backgroundColor: palette.accent }]}>
            <ChevronRight size={16} color={palette.onPrimary} />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}
export function HomeSectionHeader({ palette, title, onPress }) {
  return (
    <View style={s.sectionHead}>
      <Text style={[s.sectionTitle, { color: palette.text }]}>{title}</Text>
      <TouchableOpacity onPress={onPress} style={s.viewAll}>
        <Text style={[s.viewAllText, { color: palette.primary }]}>See all</Text>
        <ChevronRight size={15} color={palette.primary} />
      </TouchableOpacity>
    </View>
  );
}
export function HomeCategory({ palette, category, onPress, more = false }) {
  const iconMap = {
    building: 'Building2',
    car: 'CarFront',
    users: 'Users',
    briefcase: 'BriefcaseBusiness',
    'shopping-basket': 'ShoppingBag',
    sparkles: 'Sparkles',
    calendar: 'CalendarDays',
    'graduation-cap': 'GraduationCap',
    utensils: 'UtensilsCrossed',
    sofa: 'Sofa',
    wrench: 'Wrench',
    zap: 'Zap',
    camera: 'Camera',
    scissors: 'Scissors',
    hammer: 'Hammer',
    plug: 'PlugZap',
    shower: 'ShowerHead',
  };
  const Icon = more
    ? Icons.MoreHorizontal
    : Icons[iconMap[String(category?.icon || '').toLowerCase()]] || Icons.LayoutGrid;
  return (
    <TouchableOpacity style={s.category} onPress={onPress}>
      <View
        style={[
          s.categoryCircle,
          {
            backgroundColor: palette.surfaceMuted,
            borderColor: palette.border,
          },
        ]}
      >
        <Icon size={24} color={palette.text2} />
      </View>
      <Text numberOfLines={1} style={[s.categoryLabel, { color: palette.text }]}>
        {more ? 'More' : category.name}
      </Text>
    </TouchableOpacity>
  );
}
export function HomeBusinessCard({ palette, provider, saved, onSave, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[s.business, { backgroundColor: palette.surface, borderColor: palette.border }]}
    >
      <View>
        <Image
          source={imageSource(
            provider.image,
            categoryFallback(provider.category, provider.categoryId),
          )}
          style={s.businessImage}
        />
        {typeof provider.openNow === 'boolean' && (
          <View
            style={[
              s.status,
              { backgroundColor: provider.openNow ? palette.statusPositive : palette.muted },
            ]}
          >
            <Text style={s.statusText}>{provider.openNow ? 'Open' : 'Closed'}</Text>
          </View>
        )}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={
            saved ? `Remove ${provider.name} from saved` : `Save ${provider.name}`
          }
          accessibilityState={{ selected: saved }}
          onPress={onSave}
          style={{
            position: 'absolute',
            right: 7,
            top: 7,
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: '#FFFFFFE8',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Heart
            size={15}
            color={saved ? palette.danger : palette.text2}
            fill={saved ? palette.danger : 'transparent'}
          />
        </TouchableOpacity>
      </View>
      <Text numberOfLines={1} style={[s.businessName, { color: palette.text }]}>
        {provider.name}
      </Text>
      <Text numberOfLines={1} style={[s.meta, { color: palette.text2 }]}>
        {provider.category}
      </Text>
      <View style={s.rating}>
        <Star
          size={12}
          color={provider.reviewCount > 0 ? palette.saffron : palette.muted}
          fill={provider.reviewCount > 0 ? palette.saffron : 'transparent'}
        />
        <Text style={[s.ratingText, { color: palette.text }]}>
          {provider.reviewCount > 0 ? `${provider.rating} (${provider.reviewCount})` : 'New'}
          {provider.distance ? ` · ${provider.distance}` : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
export function HomeOffer({ palette, image, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={s.offer}>
      <ImageBackground source={image} style={s.offerImage} imageStyle={s.offerRadius}>
        <View style={s.offerOverlay} />
        <View style={s.offerCopy}>
          <Text style={s.promoted}>PROMOTED</Text>
          <Text style={s.offerTitle}>10% OFF</Text>
          <Text style={s.offerBody}>Weekend restaurant special</Text>
          <Text style={s.offerMeta}>Valid till 30 Sep 2026</Text>
        </View>
        <View style={[s.offerArrow, { backgroundColor: palette.saffron }]}>
          <ChevronRight size={22} color="#081B2C" />
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
}
export function HomeCreator({ palette, item, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[s.creator, { backgroundColor: palette.surface, borderColor: palette.border }]}
    >
      <Image source={imageSource(item.image)} style={s.creatorImage} />
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={[s.creatorName, { color: palette.text }]}>
          {item.name}
        </Text>
        <Text numberOfLines={1} style={[s.meta, { color: palette.text2 }]}>
          {item.profession}
        </Text>
        <Text style={[s.creatorCity, { color: palette.muted }]}>{item.city}</Text>
      </View>
    </TouchableOpacity>
  );
}
export function HomeEvent({ palette, item, onPress }) {
  const parts = String(item.date).split(' ');
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[s.event, { backgroundColor: palette.surface, borderColor: palette.border }]}
    >
      <View style={[s.dateBlock, { backgroundColor: palette.surfaceAlt }]}>
        <Text style={[s.day, { color: palette.text }]}>{parts[0] || '14'}</Text>
        <Text style={[s.month, { color: palette.text2 }]}>{parts[1] || 'SEP'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={[s.eventTitle, { color: palette.text }]}>
          {item.title}
        </Text>
        <Text numberOfLines={1} style={[s.meta, { color: palette.text2 }]}>
          {item.organiser}
        </Text>
        <View style={s.rating}>
          <MapPin size={11} color={palette.text2} />
          <Text style={[s.creatorCity, { color: palette.text2 }]}>{item.city}, UK</Text>
        </View>
      </View>
      <Image source={imageSource(item.image)} style={s.eventImage} />
    </TouchableOpacity>
  );
}
export function HomeMapCTA({ palette, onPress }) {
  return (
    <View style={[s.map, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}>
      <View style={[s.mapIcon, { backgroundColor: palette.primarySoft }]}>
        <Map size={22} color={palette.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.mapTitle, { color: palette.text }]}>Discover on the UK map</Text>
        <Text style={[s.meta, { color: palette.text2 }]}>
          Browse providers by location and distance.
        </Text>
      </View>
      <TouchableOpacity
        onPress={onPress}
        style={[s.mapButton, { backgroundColor: palette.primary }]}
      >
        <Text style={{ color: palette.dark ? '#081B2C' : '#FFFFFF', fontWeight: '800' }}>
          Open map
        </Text>
        <ChevronRight size={16} color={palette.dark ? '#081B2C' : '#FFFFFF'} />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    height: 60,
    marginHorizontal: -18,
    marginTop: -12,
    marginBottom: 16,
    paddingHorizontal: 18,
    backgroundColor: '#101817',
    justifyContent: 'center',
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logo: { width: 112, height: 36 },
  location: {
    maxWidth: '62%',
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    ...shadows.soft,
  },
  locationText: { fontSize: 14, fontWeight: '700', flexShrink: 1 },
  actions: { flexDirection: 'row', gap: 8 },
  avatarText: { fontSize: 14, fontWeight: '900' },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    right: 8,
    top: 7,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#EB3E48',
  },
  search: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 18,
    paddingRight: 7,
    borderRadius: 26,
    borderWidth: 1,
    marginTop: 12,
    ...shadows.soft,
  },
  searchText: { flex: 1, fontSize: 14 },
  filter: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  locationInline: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7 },
  currentLocation: {
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    borderRadius: 18,
  },
  currentLocationText: { fontSize: 10, fontWeight: '800' },
  hero: { marginTop: 18, borderRadius: 20, overflow: 'hidden', ...shadows.soft },
  heroImage: { width: '100%', aspectRatio: 16 / 9, justifyContent: 'center' },
  heroRadius: { borderRadius: 20 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,15,28,.42)' },
  heroCopy: { padding: 24, maxWidth: '70%' },
  heroEyebrow: { fontSize: 11, letterSpacing: 1.2, fontWeight: '700', marginBottom: 6 },
  heroTitle: { fontSize: 26, lineHeight: 30, fontWeight: '800' },
  heroBody: { fontSize: 13, lineHeight: 18, marginTop: 7 },
  heroButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    borderRadius: 22,
    marginTop: 14,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  viewAllText: { fontSize: 12, fontWeight: '700' },
  category: { width: 64, alignItems: 'center', marginRight: 8 },
  categoryCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: { fontSize: 11, fontWeight: '700', marginTop: 7, textAlign: 'center' },
  business: {
    width: 168,
    borderWidth: 0,
    borderRadius: 16,
    padding: 0,
    marginRight: 14,
  },
  businessImage: { width: '100%', height: 108, borderRadius: 14 },
  featureRow: { flexDirection: 'row', gap: 10 },
  featureCard: {
    flex: 1,
    height: 100,
    borderRadius: 16,
    padding: 12,
    position: 'relative',
  },
  featureIcon: { position: 'absolute', right: 12, top: 12 },
  featureArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: { fontSize: 13, lineHeight: 17, fontWeight: '800', maxWidth: 92 },
  featureBody: { fontSize: 9, marginTop: 3 },
  status: {
    position: 'absolute',
    left: 7,
    bottom: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
  businessName: { fontSize: 14, fontWeight: '800', marginTop: 9 },
  meta: { fontSize: 11, marginTop: 3 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  ratingText: { fontSize: 11, fontWeight: '600' },
  offer: { height: 130, borderRadius: 20, overflow: 'hidden', marginTop: 26 },
  offerImage: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  offerRadius: { borderRadius: 20 },
  offerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(3,13,25,.60)' },
  offerCopy: { padding: 18 },
  promoted: { color: '#E6B85C', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  offerTitle: { fontSize: 25, fontWeight: '900', color: '#FFF', marginTop: 3 },
  offerBody: { fontSize: 12, color: '#FFF' },
  offerMeta: { fontSize: 10, color: '#CBD2DD', marginTop: 5 },
  offerArrow: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 18,
  },
  creator: {
    width: 220,
    height: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
    padding: 8,
    marginRight: 12,
  },
  creatorImage: { width: 64, height: 70, borderRadius: 12 },
  creatorName: { fontSize: 13, fontWeight: '800' },
  creatorCity: { fontSize: 10, marginTop: 4 },
  event: {
    width: 330,
    height: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 17,
    padding: 8,
    marginRight: 12,
  },
  dateBlock: {
    width: 54,
    height: 68,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  day: { fontSize: 20, fontWeight: '900' },
  month: { fontSize: 10, fontWeight: '800' },
  eventTitle: { fontSize: 13, fontWeight: '800' },
  eventImage: { width: 82, height: 72, borderRadius: 12 },
  map: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginTop: 26,
  },
  mapIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapTitle: { fontSize: 14, fontWeight: '800' },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 20,
  },
});
