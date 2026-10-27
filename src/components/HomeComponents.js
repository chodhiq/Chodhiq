import HeroBackdrop from './HeroBackdrop';
import ImageBackground from './RevealImageBackground';
import { useIsFocused } from '@react-navigation/native';
import { useMotionPreferences } from '../hooks/useMotionPreferences';
import { MotionTouchable as TouchableOpacity } from './Motion';
import { getMelaPalette } from '../theme/mela';
import React from 'react';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import Text from './AppText';
import {
  Bell,
  ChevronRight,
  Heart,
  LocateFixed,
  Map,
  MapPin,
  Search,
  SlidersHorizontal,
  Star,
  UserRound,
} from 'lucide-react-native';
import { categoryFallback, imageSource } from '../data/assetCatalog';
import { shadows } from '../theme/theme';
import * as Icons from 'lucide-react-native';
import { PressableScale } from './Motion';
import GlassView from './GlassView';

export function HomeHeader({
  palette,
  unreadCount,
  location,
  profile,
  onNotifications,
  onLocation,
  onCurrentLocation,
  currentLocationLoading,
  onSearch,
  onProfile,
}) {
  const isDark = palette.dark;
  const logo = isDark
    ? require('../../assets/chodhiq-logo-white.png')
    : require('../../assets/chodhiq-logo-black.png');
  const headerText = palette.text;
  const city = String(location || '').trim();
  return (
    <View style={[s.header, { backgroundColor: palette.bg }]}>
      <View style={s.top}>
        <Image
          resizeMethod="resize"
          source={logo}
          style={s.logo}
          resizeMode="contain"
          accessibilityLabel="ChodhiQ"
        />
        <View style={s.actions}>
          <IconButton
            onPress={onNotifications}
            label={`Open notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
            style={{ backgroundColor: palette.surfaceAlt }}
          >
            <Bell size={20} color={headerText} />
            {unreadCount > 0 && (
              <View style={[s.notificationBadge, { borderColor: palette.bg }]}>
                <Text style={s.notificationBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </IconButton>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            onPress={onProfile}
            style={[s.avatarButton, { borderColor: palette.border }]}
          >
            {profile?.avatarUri ? (
              <Image
                resizeMethod="resize"
                source={{ uri: profile.avatarUri }}
                style={s.profileAvatar}
              />
            ) : (
              <View style={[s.profileAvatarFallback, { backgroundColor: palette.surfaceAlt }]}>
                {profile?.name && profile.name !== 'Guest' ? (
                  <Text style={s.avatarText}>{profile.name.trim().slice(0, 1).toUpperCase()}</Text>
                ) : (
                  <UserRound size={19} color={headerText} />
                )}
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
      <View style={s.locationRow}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Choose your area"
          style={s.locationInline}
          onPress={onLocation}
        >
          <MapPin size={18} color={headerText} fill={headerText} />
          <Text numberOfLines={1} style={[s.headerLocationText, { color: headerText }]}>
            {city || 'Choose your area'}
          </Text>
          <Icons.ChevronDown size={16} color={headerText} />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Use current location"
          disabled={currentLocationLoading}
          onPress={onCurrentLocation}
          style={[
            s.headerCurrentLocation,
            { borderColor: palette.primary, backgroundColor: palette.primaryTint },
          ]}
        >
          <LocateFixed size={15} color={palette.primary} />
          <Text numberOfLines={1} style={[s.headerCurrentLocationText, { color: palette.primary }]}>
            {currentLocationLoading ? 'Finding you…' : 'Use current location'}
          </Text>
        </TouchableOpacity>
      </View>
      <HomeSearch palette={palette} onPress={onSearch} />
    </View>
  );
}
function IconButton({ onPress, children, label, style }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[s.iconButton, style]}
    >
      {children}
    </TouchableOpacity>
  );
}
export function HomeSearch({ palette, onPress }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Search for restaurants, salons, services and shops"
      onPress={onPress}
      style={[
        s.search,
        s.searchFloating,
        {
          backgroundColor: palette.dark ? 'rgba(18,27,23,0.88)' : 'rgba(255,255,255,0.9)',
          borderColor: palette.dark ? 'rgba(255,255,255,0.16)' : palette.border,
        },
      ]}
    >
      <GlassView
        androidBlurEnabled={false}
        pointerEvents="none"
        intensity={32}
        style={[
          StyleSheet.absoluteFill,
          s.searchGlass,
          { borderColor: palette.dark ? 'rgba(255,255,255,0.12)' : 'rgba(16,24,23,0.08)' },
        ]}
      />
      <Search size={20} color={palette.text} />
      <Text numberOfLines={1} ellipsizeMode="tail" style={[s.searchText, { color: palette.text2 }]}>
        Search for restaurants, salons, services, shops...
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
export function HomeHero({ palette, mode, image, images = [], location = '', onPress }) {
  const { width } = useWindowDimensions();
  const focused = useIsFocused();
  const { foreground, reducedMotion } = useMotionPreferences();
  const heroHeight = Math.min(250, Math.max(220, (Math.min(width, 840) - 36) * 0.55));
  const city = String(location || '').trim();
  const [activeImage, setActiveImage] = React.useState(0);
  React.useEffect(() => {
    if (images.length < 2 || !focused || !foreground || reducedMotion) return undefined;
    const timer = setInterval(() => setActiveImage((index) => (index + 1) % images.length), 5000);
    return () => clearInterval(timer);
  }, [images.length, focused, foreground, reducedMotion]);
  const warm = mode === 'warm';
  const eyebrow = warm ? 'GOOD PLACES   BRIGHTER DAYS' : `DISCOVER ${city || 'NEAR YOU'}`;
  const firstLine = warm ? 'Explore' : 'Find what';
  const secondLine = warm ? 'your neighborhood' : 'you love nearby';
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={s.hero}>
      <HeroBackdrop
        sources={images.length ? images : [image]}
        active={activeImage}
        style={[s.heroImage, { height: heroHeight, justifyContent: 'center' }]}
      >
        <View
          style={[s.overlay, { backgroundColor: warm ? 'rgba(251,245,234,.72)' : palette.overlay }]}
        />
        <View style={[s.heroCopy, { padding: 20, maxWidth: '88%' }]}>
          <Text style={[s.heroEyebrow, { color: warm ? palette.textSecondary : '#FFFFFFD1' }]}>
            {eyebrow}
          </Text>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.82}
            numberOfLines={2}
            style={[
              s.heroTitle,
              { color: warm ? palette.text : '#FFFFFF', fontSize: width < 420 ? 27 : 30 },
            ]}
          >
            {firstLine}
            {`\n`}
            <Text style={{ color: warm ? palette.primary : '#FFFFFF' }}>{secondLine}</Text>
          </Text>
          <Text
            numberOfLines={1}
            style={[s.heroBody, { color: warm ? palette.textSecondary : '#F2F5F3' }]}
          >
            Discover places you’ll love, close to home.
          </Text>
          <View
            style={[
              s.heroButton,
              {
                backgroundColor: getMelaPalette().primary,
                height: 34,
              },
            ]}
          >
            <Text style={{ color: getMelaPalette().onPrimary, fontWeight: '800' }}>
              Explore now
            </Text>
            <ChevronRight size={18} color={getMelaPalette().onPrimary} />
          </View>
        </View>
        {images.length > 1 && (
          <View style={s.heroPagination} pointerEvents="none">
            {images.map((_, index) => (
              <View key={index} style={[s.heroDot, index === activeImage && s.heroDotActive]} />
            ))}
          </View>
        )}
      </HeroBackdrop>
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
export function HomeFeaturedCategories({ palette, categories, providers = [], onCategory }) {
  return (
    <View style={s.featuredCategoriesRow}>
      {categories.map((category) => (
        <TouchableOpacity
          key={category.id}
          onPress={() => onCategory(category)}
          style={[
            s.featuredCategory,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}
        >
          <Text numberOfLines={2} style={[s.featuredCategoryName, { color: palette.text }]}>
            {category.name}
          </Text>
          {providers.filter((provider) => provider.categoryId === category.id).length > 0 && (
            <Text style={[s.featuredCategoryCount, { color: palette.text2 }]}>
              {providers.filter((provider) => provider.categoryId === category.id).length} places
            </Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}
export function HomeSectionHeader({ palette, title, subtitle, onPress, actionLabel = 'See all' }) {
  return (
    <View style={s.sectionHead}>
      <View style={s.sectionCopy}>
        <Text style={[s.sectionTitle, { color: palette.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[s.sectionSubtitle, { color: palette.text2 }]}>{subtitle}</Text>
        ) : null}
      </View>
      <TouchableOpacity onPress={onPress} style={s.viewAll}>
        <Text style={[s.viewAllText, { color: palette.primary }]}>{actionLabel}</Text>
        <ChevronRight size={15} color={palette.primary} />
      </TouchableOpacity>
    </View>
  );
}
export function HomeCategory({ palette, category, onPress, more = false, active = false }) {
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
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={
        more ? 'See more categories' : `Browse ${category?.name || 'all categories'}`
      }
      accessibilityState={{ selected: active }}
      style={s.category}
      onPress={onPress}
    >
      <View
        style={[
          s.categoryIcon,
          {
            backgroundColor: active
              ? palette.primary
              : palette.dark
                ? 'rgba(255,255,255,0.055)'
                : palette.primaryTint,
            borderColor: active
              ? palette.primary
              : palette.dark
                ? 'rgba(255,255,255,0.1)'
                : palette.border,
            shadowColor: palette.primary,
            shadowOpacity: active ? 0.2 : 0,
            elevation: active ? 2 : 0,
          },
        ]}
      >
        <Icon size={21} color={active ? palette.onPrimary : palette.primary} strokeWidth={2} />
      </View>
      <Text
        numberOfLines={2}
        ellipsizeMode="tail"
        style={[s.categoryLabel, { color: active ? palette.primary : palette.text }]}
      >
        {more ? 'More' : category.name}
      </Text>
    </TouchableOpacity>
  );
}
export function HomeBusinessCard({ palette, provider, saved, onSave, onPress, onCategory }) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityLabel={`View ${provider.name}`}
      style={[s.business, { backgroundColor: palette.surface, borderColor: palette.border }]}
    >
      <View style={s.businessMedia}>
        {provider.image ? (
          <Image
            resizeMethod="resize"
            source={imageSource(
              provider.image,
              categoryFallback(provider.category, provider.categoryId),
            )}
            style={s.businessImage}
          />
        ) : (
          <View
            style={[
              s.businessImage,
              s.businessImageEmpty,
              { backgroundColor: palette.surfaceMuted },
            ]}
          >
            <View style={[s.businessPlaceholderIcon, { backgroundColor: palette.primarySoft }]}>
              <Icons.Store size={24} color={palette.primary} />
            </View>
            <Text numberOfLines={1} style={[s.businessPlaceholderText, { color: palette.text2 }]}>
              {provider.category}
            </Text>
          </View>
        )}
        {provider.distance && (
          <View style={s.distanceBadge}>
            <MapPin size={10} color="#FFFFFF" />
            <Text style={s.statusText}>{provider.distance}</Text>
          </View>
        )}
        {typeof provider.openNow === 'boolean' && (
          <View
            style={[
              s.status,
              {
                backgroundColor: provider.openNow ? '#E7F8EF' : palette.surfaceMuted,
              },
            ]}
          >
            <Text style={[s.statusText, { color: provider.openNow ? '#087A3D' : palette.text2 }]}>
              {provider.openNow ? 'Open' : 'Closed'}
            </Text>
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
      <Text numberOfLines={1} onPress={onCategory} style={[s.meta, { color: palette.text2 }]}>
        {provider.category}
      </Text>
      <View style={s.rating}>
        {provider.reviewCount > 0 && (
          <Star size={12} color={palette.saffron} fill={palette.saffron} />
        )}
        {provider.reviewCount > 0 && Number.isFinite(provider.rating) && (
          <Text style={[s.ratingText, { color: palette.text }]}>
            {provider.rating.toFixed(1)} ({provider.reviewCount})
          </Text>
        )}
      </View>
    </PressableScale>
  );
}

export function HomeQuickActions({ palette, onNearby, onTopRated, onOpenNow }) {
  const items = [
    {
      title: 'Nearby',
      subtitle: 'See what’s around you',
      Icon: MapPin,
      mode: 'nearby',
      onPress: onNearby,
    },
    {
      title: 'Top rated',
      subtitle: 'Best reviewed nearby',
      Icon: Icons.Crown,
      mode: 'topRated',
      onPress: onTopRated,
    },
    {
      title: 'Open now',
      subtitle: 'Places currently open',
      Icon: Icons.Clock3,
      mode: 'open',
      onPress: onOpenNow,
    },
  ];
  return (
    <View style={s.quickRow}>
      {items.map(({ title, subtitle, Icon, onPress }) => (
        <TouchableOpacity
          key={title}
          accessibilityRole="button"
          accessibilityLabel={`${title}: ${subtitle}`}
          onPress={onPress}
          style={[s.quickCard, { backgroundColor: palette.surfaceAlt }]}
        >
          <Icon size={15} color={palette.primary} strokeWidth={2.2} />
          <Text numberOfLines={1} style={[s.quickTitle, { color: palette.text }]}>
            {title}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function HomeCommunityCTA({ palette, onPress }) {
  return (
    <View style={[s.communityCta, { backgroundColor: palette.primarySoft }]}>
      <View style={[s.communityIcon, { backgroundColor: palette.surface }]}>
        <Icons.UsersRound size={21} color={palette.primary} />
      </View>
      <View style={s.communityCopy}>
        <Text style={[s.communityTitle, { color: palette.text }]}>Join the community</Text>
        <Text numberOfLines={2} style={[s.communitySubtitle, { color: palette.text2 }]}>
          Ask, recommend and share real experiences.
        </Text>
      </View>
      <TouchableOpacity
        onPress={onPress}
        style={[s.communityButton, { backgroundColor: palette.primary }]}
      >
        <Text style={s.communityButtonText}>Create a post</Text>
        <ChevronRight size={16} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
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
      <Image resizeMethod="resize" source={imageSource(item.image)} style={s.creatorImage} />
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
      <Image resizeMethod="resize" source={imageSource(item.image)} style={s.eventImage} />
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
        <Text style={{ color: palette.onPrimary, fontWeight: '800' }}>Open map</Text>
        <ChevronRight size={16} color={palette.onPrimary} />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    position: 'relative',
    marginHorizontal: -18,
    marginTop: -12,
    marginBottom: 10,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: '#101817',
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logo: { width: 112, height: 36 },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#FFFFFF70',
  },
  profileAvatar: { width: '100%', height: '100%' },
  profileAvatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF26',
  },
  headerLocationText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', flexShrink: 1 },
  headerCurrentLocation: {
    height: 34,
    maxWidth: '51%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 9,
    borderRadius: 20,
  },
  headerCurrentLocationText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
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
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -3,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: '#EB3E48',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#101817',
  },
  notificationBadgeText: { color: '#FFFFFF', fontSize: 8, lineHeight: 10, fontWeight: '900' },
  search: {
    position: 'relative',
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingLeft: 16,
    paddingRight: 8,
    borderRadius: 27,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 0,
    ...shadows.soft,
  },
  searchGlass: { borderWidth: 0, borderRadius: 27 },
  searchFloating: { marginTop: 8 },
  searchText: { flex: 1, fontSize: 14 },
  filter: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 8,
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
  hero: { marginTop: 8, borderRadius: 20, overflow: 'hidden', ...shadows.soft },
  heroImage: { width: '100%', justifyContent: 'center' },
  heroRadius: { borderRadius: 20 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,15,28,.42)' },
  heroCopy: { padding: 18, maxWidth: '69%', zIndex: 1 },
  heroEyebrow: { fontSize: 11, letterSpacing: 1.2, fontWeight: '700', marginBottom: 6 },
  heroTitle: { fontSize: 30, lineHeight: 33, letterSpacing: -0.6, fontWeight: '800' },
  heroBody: { fontSize: 12, lineHeight: 17, marginTop: 6 },
  heroButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    borderRadius: 18,
    marginTop: 12,
  },
  heroPagination: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  heroDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFFA8' },
  heroDotActive: { backgroundColor: '#16A34A', width: 10, height: 10, borderRadius: 5 },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 10,
  },
  sectionCopy: { flex: 1, minWidth: 0 },
  sectionTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.45 },
  sectionSubtitle: { fontSize: 11, marginTop: 2 },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  viewAllText: { fontSize: 12, fontWeight: '700' },
  category: {
    width: 82,
    height: 82,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    width: '100%',
    fontSize: 11,
    lineHeight: 14,
    height: 28,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
  categoryCard: {},
  business: {
    width: 168,
    borderWidth: 1,
    borderRadius: 16,
    padding: 7,
    marginRight: 7,
    ...shadows.soft,
  },
  businessMedia: { position: 'relative' },
  businessImage: {
    width: '100%',
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  businessImageEmpty: { alignItems: 'center', justifyContent: 'center', gap: 9 },
  businessPlaceholderIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  businessPlaceholderText: { fontSize: 10, fontWeight: '700' },
  featureRow: { flexDirection: 'row', gap: 10 },
  featuredCategoriesRow: { flexDirection: 'row', gap: 9 },
  featuredCategory: {
    width: 150,
    minHeight: 82,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 15,
    padding: 12,
  },
  featuredCategoryName: {
    fontSize: 12,
    lineHeight: 15,
    textAlign: 'left',
    fontWeight: '800',
  },
  featuredCategoryCount: { fontSize: 10, marginTop: 4, fontWeight: '600' },
  quickRow: { flexDirection: 'row', gap: 8, marginHorizontal: -2, marginTop: 14 },
  quickCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
    borderRadius: 15,
  },
  quickTitle: { fontSize: 11, fontWeight: '700', flexShrink: 1 },
  communityCta: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 10,
    borderRadius: 19,
    marginTop: 18,
  },
  communityIcon: {
    width: 39,
    height: 39,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  communityCopy: { flex: 1, minWidth: 0 },
  communityTitle: { fontSize: 12, fontWeight: '800' },
  communitySubtitle: { fontSize: 9, lineHeight: 13, marginTop: 2 },
  communityButton: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 9,
    borderRadius: 20,
  },
  communityButtonText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
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
  distanceBadge: {
    position: 'absolute',
    right: 7,
    bottom: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#111827B8',
  },
  statusText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
  businessName: { fontSize: 14, fontWeight: '800', marginTop: 10 },
  meta: { fontSize: 11, marginTop: 4 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 7 },
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
