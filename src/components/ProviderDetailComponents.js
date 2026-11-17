import { MotionTouchable as TouchableOpacity } from './Motion';
import React from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Text from './AppText';
import {
  ArrowLeft,
  BadgeCheck,
  Bookmark,
  ChevronRight,
  Globe,
  Heart,
  MapPin,
  Navigation,
  Phone,
  Share2,
  Star,
  Store,
} from 'lucide-react-native';
import { categoryIconName, imageSource, isPlaceholderImage } from '../data/assetCatalog';
import { GlowListItem, GlowMapInfoCard, GlowProfileCard } from '../../components/ui/GlowSurfaces';
import GlowIconButton from '../../components/ui/GlowIconButton';
import CategoryChip from '../../components/CategoryChip';
import PulseDot from '../../components/PulseDot';
import GlowButton from '../../components/ui/GlowButton';
import useEffectsLevel from '../hooks/useEffectsLevel';
import { theme } from '../../theme';
import ChodhiQMap from './ChodhiQMap';
import { summarizeReviews } from '../lib/reviewStats';

export function ProviderHero({ provider, saved, onBack, onShare, onSave, scrollOffset }) {
  const source = imageSource(provider.image);
  const PlaceholderIcon = require('lucide-react-native')[categoryIconName(provider.category, provider.categoryId)] || Store;
  const effectsLevel = useEffectsLevel();
  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: effectsLevel === 'full' ? Math.max(0, scrollOffset.value) * 0.3 : 0,
      },
      {
        scale:
          effectsLevel === 'full' && scrollOffset.value < 0
            ? 1 + Math.min(-scrollOffset.value / 1000, 0.12)
            : 1,
      },
    ],
  }));
  return (
    <View style={s.hero}>
      {source ? (
        <Animated.Image
          pointerEvents="none"
          source={source}
          resizeMode="cover"
          style={[s.heroImage, imageStyle]}
        />
      ) : (
        <View pointerEvents="none" style={[s.heroImage, s.heroPlaceholder]}>
          <PlaceholderIcon size={72} color={theme.colors.primary} />
        </View>
      )}
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', `${theme.colors.primary}14`, theme.colors.background]}
        locations={[0.38, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={s.heroShade} />
      <View style={s.heroButtons}>
        <GlowIconButton
          accessibilityRole="button"
          accessibilityLabel="Go back"
          icon={<ArrowLeft size={21} color={theme.colors.textPrimary} />}
          size={48}
          variant="secondary"
          onPress={onBack}
        />
        <View style={s.heroRight}>
          <GlowIconButton
            accessibilityRole="button"
            accessibilityLabel="Share provider"
            icon={<Share2 size={20} color={theme.colors.textPrimary} />}
            size={48}
            variant="secondary"
            onPress={onShare}
          />
          <GlowIconButton
            testID="btn-save-provider"
            accessibilityRole="button"
            accessibilityLabel={saved ? 'Remove provider from saved' : 'Save provider'}
            accessibilityState={{ selected: saved }}
            icon={
              <Heart
                size={20}
                color={saved ? theme.colors.primary : theme.colors.textPrimary}
                fill={saved ? theme.colors.primary : 'transparent'}
              />
            }
            size={48}
            variant="secondary"
            actionFeedback={false}
            onPress={onSave}
          />
        </View>
      </View>
    </View>
  );
}
export const formatReviewCount = (count) => `${count} ${count === 1 ? 'review' : 'reviews'}`;

export function getProviderReviewDisplay(reviews) {
  const { average, count } = summarizeReviews(reviews);
  return {
    average,
    count,
    label:
      count > 0 ? `${Number(average).toFixed(1)} (${formatReviewCount(count)})` : 'No reviews yet',
  };
}

export function ProviderIdentity({ provider, reviews }) {
  const { average, count, label } = getProviderReviewDisplay(reviews);
  const hasReviews = count > 0;
  const normalizedRating = Number(average) || 0;
  const location = [provider.baseCity, provider.basePostcode, provider.distance]
    .filter(Boolean)
    .join(' · ');
  return (
    <View style={s.identityWrap}>
      <GlowProfileCard
        style={{ width: '100%', maxWidth: 840, alignSelf: 'center' }}
        contentStyle={{ padding: 18, gap: 11 }}
      >
        <View style={s.nameRow}>
          <Text numberOfLines={2} style={[s.name, { color: theme.colors.textPrimary }]}>
            {provider.name}
          </Text>
          {provider.isVerified && <BadgeCheck size={18} color={theme.colors.primary} />}
        </View>
        <View style={s.identityMeta}>
          <CategoryChip label={provider.category || 'Business'} />
          {!hasReviews && (
            <View style={s.newBadge}>
              <Text style={s.newBadgeText}>New</Text>
            </View>
          )}
          {provider.isDataVerified && provider.dataVerificationStatus !== 'unchecked' && (
            <View style={s.dataCheckedBadge}>
              <BadgeCheck size={13} color={theme.colors.primary} />
              <Text style={s.dataCheckedText}>Data checked</Text>
            </View>
          )}
        </View>
        <View style={s.metaRow}>
          <View style={s.ratingStars}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Star
                key={value}
                size={13}
                color={
                  hasReviews && normalizedRating >= value
                    ? theme.colors.primary
                    : theme.colors.textSecondary
                }
                fill={
                  hasReviews && normalizedRating >= value ? theme.colors.primary : 'transparent'
                }
              />
            ))}
          </View>
          <Text style={[s.metaStrong, { color: theme.colors.textPrimary }]}>{label}</Text>
          {typeof provider.openNow === 'boolean' && (
            <View style={s.openStatus}>
              {provider.openNow && <PulseDot size={8} />}
              <Text
                style={[
                  s.openStatusText,
                  { color: provider.openNow ? theme.colors.primary : theme.colors.textSecondary },
                ]}
              >
                {provider.openNow ? 'Open now' : 'Closed'}
              </Text>
            </View>
          )}
        </View>
        {location ? (
          <View style={s.locationRow}>
            <MapPin size={14} color={theme.colors.textSecondary} />
            <Text numberOfLines={1} style={[s.meta, { color: theme.colors.textSecondary }]}>
              {location}
            </Text>
          </View>
        ) : null}
      </GlowProfileCard>
    </View>
  );
}
const actionIcons = {
  Call: Phone,
  Directions: Navigation,
  'Search on Google Maps': Navigation,
  Website: Globe,
  Save: Bookmark,
};
export function ProviderActions({ palette, items }) {
  return (
    <View style={s.actions}>
      {items.map((item, index) => {
        const Icon = actionIcons[item.label] || Navigation;
        return (
          <TouchableOpacity
            key={item.label}
            disabled={item.disabled}
            onPress={item.onPress}
            style={[
              s.action,
              {
                backgroundColor: palette.surfaceAlt,
                borderColor: index === 0 ? palette.primary : palette.border,
                borderRadius: palette.id === 'warm' ? 16 : 14,
              },
              item.disabled && { opacity: 0.4 },
            ]}
          >
            <Icon size={20} color={item.active ? palette.primary : palette.text} />
            <Text style={[s.actionLabel, { color: palette.text }]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
export function ProviderMapPreview({ provider, onPress, location, palette }) {
  const hasCoordinates =
    Number.isFinite(provider?.baseLatitude) &&
    Number.isFinite(provider?.baseLongitude) &&
    Math.abs(provider.baseLatitude) <= 90 &&
    Math.abs(provider.baseLongitude) <= 180;
  const mapLocation = hasCoordinates
    ? {
        latitude: provider.baseLatitude,
        longitude: provider.baseLongitude,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      }
    : null;

  return (
    <GlowMapInfoCard style={s.mapPreview} contentStyle={{ gap: 12, padding: 12 }}>
      <View testID="provider-map-preview" style={s.mapCanvas}>
        {hasCoordinates ? (
          <ChodhiQMap
            providers={[provider]}
            selected={provider}
            location={mapLocation}
            onSelect={() => {}}
            palette={palette}
            compact
            forceOpenStreetMap
          />
        ) : (
          <View style={s.mapFallback}>
            <MapPin size={22} color={theme.colors.textSecondary} />
            <Text style={s.mapFallbackText}>
              Map preview unavailable because this business has no verified coordinates.
            </Text>
          </View>
        )}
      </View>
      {location ? (
        <Text numberOfLines={1} style={s.mapLocation}>
          {location}
        </Text>
      ) : null}
      <View style={s.mapButtons}>
        {onPress && (
          <GlowButton
            accessibilityRole="button"
            label="View on map"
            leftIcon={<MapPin size={17} color={theme.colors.primary} />}
            variant="secondary"
            size="sm"
            buttonStyle={s.mapAction}
            onPress={onPress}
          />
        )}
      </View>
    </GlowMapInfoCard>
  );
}
export function ProviderVerified({ palette }) {
  return (
    <View
      style={[
        s.verified,
        {
          backgroundColor: palette.dark ? palette.lavenderSoft : palette.goldSoft,
          borderColor: palette.dark ? palette.indigo : palette.saffron,
        },
      ]}
    >
      <BadgeCheck size={23} color={palette.dark ? palette.indigo : palette.primary} />
      <View style={{ flex: 1 }}>
        <Text style={[s.verifiedTitle, { color: palette.dark ? palette.indigo : palette.primary }]}>
          Verified Business
        </Text>
        <Text style={[s.meta, { color: palette.text2 }]}>Business verified</Text>
      </View>
      <ChevronRight size={18} color={palette.text2} />
    </View>
  );
}
export function ProviderTabs({ palette, value, onChange, isRestaurant }) {
  const tabs = ['Overview', isRestaurant ? 'Menu' : 'Services', 'Offers', 'Reviews', 'Photos'];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab}
          onPress={() => onChange(tab)}
          style={[s.tab, value === tab && { borderBottomColor: palette.primary }]}
        >
          <Text style={[s.tabText, { color: value === tab ? palette.primary : palette.text2 }]}>
            {tab}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
export function DetailSectionHeader({ palette, title, onPress }) {
  return (
    <View style={s.sectionHead}>
      <Text style={[s.sectionTitle, { color: palette.text }]}>{title}</Text>
      {onPress && (
        <TouchableOpacity onPress={onPress}>
          <Text style={[s.viewAll, { color: palette.primary }]}>View all</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
export function InfoChip({ palette, title, value, Icon }) {
  return (
    <GlowListItem
      style={[s.infoChip, { backgroundColor: palette.surface, borderColor: palette.border }]}
      contentStyle={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9, padding: 11 }}
    >
      {Icon && <Icon size={18} color={palette.primary} />}
      <View style={{ flex: 1 }}>
        <Text style={[s.infoTitle, { color: palette.text }]}>{title}</Text>
        <Text numberOfLines={2} style={[s.infoValue, { color: palette.text2 }]}>
          {value}
        </Text>
      </View>
    </GlowListItem>
  );
}
export function PhotoGallery({ palette, photos, onPressPhoto }) {
  const approved = (photos || []).filter((url) => !isPlaceholderImage(url));
  if (!approved.length)
    return <EmptyBlock palette={palette} text="No verified business photos have been added yet." />;
  return (
    <View style={s.photoGrid}>
      {approved.map((url, index) => (
        <TouchableOpacity
          key={`${url}-${index}`}
          accessibilityRole="button"
          accessibilityLabel={`Open business photo ${index + 1}`}
          onPress={() => onPressPhoto?.(index, url)}
          style={s.photoTile}
        >
          <Image resizeMethod="resize" source={{ uri: url }} style={s.photo} />
        </TouchableOpacity>
      ))}
    </View>
  );
}
export function ReviewSummary({ palette, rating, count, distribution }) {
  const average = count > 0 && Number.isFinite(rating) ? rating : null;
  return (
    <View
      style={[s.reviewSummary, { backgroundColor: palette.surface, borderColor: palette.border }]}
    >
      <View style={s.score}>
        <Text style={[s.scoreText, { color: palette.text }]}>
          {average === null ? '—' : average.toFixed(1)}
        </Text>
        <View style={s.stars}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              size={14}
              color={palette.saffron}
              fill={average !== null && n <= Math.round(average) ? palette.saffron : 'transparent'}
            />
          ))}
        </View>
        <Text style={[s.meta, { color: palette.text2 }]}> {formatReviewCount(count)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        {[5, 4, 3, 2, 1].map((star) => (
          <View key={star} style={s.barRow}>
            <Text style={[s.barLabel, { color: palette.text2 }]}>{star} ★</Text>
            <View style={[s.barTrack, { backgroundColor: palette.surfaceAlt }]}>
              <View
                testID={`review-distribution-${star}`}
                style={[
                  s.barFill,
                  {
                    backgroundColor: palette.saffron,
                    width: count ? `${((distribution?.[star] || 0) / count) * 100}%` : '0%',
                  },
                ]}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
export function ReviewCard({ palette, review, onEdit }) {
  return (
    <View style={[s.reviewCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={s.nameRow}>
        <View style={[s.avatar, { backgroundColor: palette.primarySoft }]}>
          <Text style={{ color: palette.primary, fontWeight: '800' }}>C</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.infoTitle, { color: palette.text }]}>Community member</Text>
          <Text style={[s.meta, { color: palette.text2 }]}>{review.date || 'Recently'}</Text>
        </View>
        <View style={s.stars}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              size={12}
              color={palette.saffron}
              fill={n <= (review.rating || 0) ? palette.saffron : 'transparent'}
            />
          ))}
        </View>
      </View>
      <Text style={[s.reviewBody, { color: palette.text2 }]}>{review.text || review.body}</Text>
      {onEdit && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Edit your review"
          hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
          onPress={onEdit}
          style={{ alignSelf: 'flex-start', marginTop: 9 }}
        >
          <Text style={{ color: palette.primary, fontSize: 12, fontWeight: '800' }}>
            Edit review
          </Text>
        </TouchableOpacity>
      )}
      {review.reply && (
        <View
          style={{
            marginTop: 12,
            padding: 11,
            borderRadius: 12,
            backgroundColor: palette.surfaceAlt,
          }}
        >
          <Text style={[s.infoTitle, { color: palette.text }]}>Response from the business</Text>
          <Text style={[s.reviewBody, { color: palette.text2 }]}>{review.reply}</Text>
        </View>
      )}
    </View>
  );
}
export function EmptyBlock({ palette, text }) {
  return (
    <View style={[s.empty, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Text style={[s.emptyText, { color: palette.text2 }]}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  hero: {
    height: 280,
    overflow: 'hidden',
  },
  heroImage: {
    position: 'absolute',
    top: -42,
    left: 0,
    width: '100%',
    height: '120%',
  },
  heroPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primaryDeep,
  },
  heroShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.background,
    opacity: 0.1,
  },
  heroButtons: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroRight: { flexDirection: 'row', gap: 10 },
  identityWrap: { marginTop: -38, paddingHorizontal: 16 },
  nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  identityMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  newBadge: {
    minHeight: 30,
    justifyContent: 'center',
    paddingHorizontal: 11,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primaryDeep,
  },
  newBadgeText: { color: theme.colors.primary, fontSize: 13, fontWeight: '700' },
  dataCheckedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 30,
    backgroundColor: theme.colors.primaryDeep,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 9,
  },
  dataCheckedText: { color: theme.colors.primary, fontSize: 11, fontWeight: '700' },
  name: { fontSize: 28, lineHeight: 34, fontWeight: '800', flexShrink: 1 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  ratingStars: { flexDirection: 'row', gap: 1 },
  metaStrong: { fontSize: 14, fontWeight: '700' },
  meta: { fontSize: 12 },
  openStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8 },
  openStatusText: { fontSize: 13, fontWeight: '600' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 17 },
  action: {
    flex: 1,
    minHeight: 76,
    minWidth: 0,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  actionLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
  mapPreview: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },
  mapCanvas: {
    height: 120,
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
  },
  mapFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  mapFallbackText: { color: theme.colors.textSecondary, fontSize: 12, textAlign: 'center' },
  mapLocation: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  mapButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mapAction: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 12,
    flexGrow: 1,
  },
  mapPreviewButton: {
    position: 'absolute',
    right: 14,
    height: 44,
    minWidth: 44,
    borderRadius: 18,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPreviewText: { fontSize: 12, fontWeight: '700' },
  verified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 15,
    padding: 13,
    marginTop: 16,
  },
  verifiedTitle: { fontSize: 13, fontWeight: '800' },
  tabs: { borderBottomWidth: 1, borderBottomColor: 'transparent', marginTop: 17 },
  tab: {
    paddingHorizontal: 13,
    paddingVertical: 13,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: { fontSize: 12, fontWeight: '700' },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 23,
    marginBottom: 11,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  viewAll: { fontSize: 12, fontWeight: '700' },
  infoChip: {
    minWidth: 145,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1,
    borderRadius: 14,
    padding: 11,
  },
  infoTitle: { fontSize: 12, fontWeight: '800' },
  infoValue: { fontSize: 10, marginTop: 3 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoTile: { width: '31%', minHeight: 44, aspectRatio: 1, borderRadius: 12, overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  reviewSummary: { flexDirection: 'row', gap: 18, borderWidth: 1, borderRadius: 17, padding: 15 },
  score: { width: 100, alignItems: 'center', justifyContent: 'center' },
  scoreText: { fontSize: 38, fontWeight: '900' },
  stars: { flexDirection: 'row', gap: 2, marginTop: 5 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginVertical: 3 },
  barLabel: { fontSize: 10, width: 22 },
  barTrack: { height: 6, flex: 1, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  reviewCard: { borderWidth: 1, borderRadius: 16, padding: 13, marginTop: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewBody: { fontSize: 12, lineHeight: 18, marginTop: 10 },
  empty: { borderWidth: 1, borderRadius: 15, padding: 22, alignItems: 'center' },
  emptyText: { fontSize: 12, textAlign: 'center' },
});
