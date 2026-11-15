import { memo } from 'react';
import { Image, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { BadgeCheck, Heart, MapPin, Navigation, Star } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import GlowCard from '../GlowCard';
import GlowIconButton from './GlowIconButton';
import PressableScale from './PressableScale';
import PulseDot from '../PulseDot';
import useEffectsLevel from '../../src/hooks/useEffectsLevel';
import { categoryFallback, imageSource } from '../../src/data/assetCatalog';
import { theme } from '../../theme';

export interface GlowProvider {
  id?: string | number;
  name: string;
  category?: string;
  categoryId?: string;
  image?: string | number | { uri: string } | null;
  isVerified?: boolean;
  isDataVerified?: boolean;
  rating?: number;
  reviewCount?: number;
  distance?: string | null;
  distanceKm?: number | null;
  openNow?: boolean | null;
  priceRange?: number | string | null;
  baseCity?: string | null;
  serviceAreas?: string[];
  address?: string | null;
}

export interface ProviderCardGlowProps {
  provider: GlowProvider;
  variant: 'row' | 'compact' | 'map';
  mapMode?: 'selected' | 'nearby';
  saved?: boolean;
  selected?: boolean;
  index?: number;
  testID?: string;
  saveTestID?: string;
  directionsTestID?: string;
  glowIntensity?: number;
  onPress?: () => void;
  onSave?: () => void;
  onCategory?: () => void;
  onDirections?: () => void;
}

function priceLabel(value: GlowProvider['priceRange']) {
  if (typeof value === 'string' && /^£{1,4}$/.test(value)) return value;
  const level = Number(value);
  return Number.isInteger(level) && level > 0 ? '£'.repeat(Math.min(level, 4)) : '';
}

function ProviderCardGlow({
  provider,
  variant,
  mapMode = 'selected',
  saved = false,
  selected = false,
  index = 0,
  testID,
  saveTestID,
  directionsTestID = 'btn-map-directions',
  glowIntensity = 1,
  onPress,
  onSave,
  onCategory,
  onDirections,
}: ProviderCardGlowProps) {
  const canAnimate = useEffectsLevel() === 'full';
  const isNearbyMap = variant === 'map' && mapMode === 'nearby';
  const cardVariant = variant === 'row' ? 'row' : variant === 'map' ? 'map' : 'card';
  const titleTestID =
    testID ??
    (variant === 'compact'
      ? 'btn-home-provider'
      : variant === 'map' && !isNearbyMap
        ? 'btn-map-provider'
        : undefined);
  const resolvedSaveTestID =
    saveTestID ??
    (isNearbyMap
      ? 'btn-map-nearby-save'
      : variant === 'map'
        ? 'btn-map-save'
        : 'btn-save-business');
  const source = imageSource(
    provider.image,
    categoryFallback(provider.category, provider.categoryId),
  );
  const reviews = Number(provider.reviewCount) || 0;
  const rating = Number(provider.rating);
  const price = priceLabel(provider.priceRange);
  const city = provider.baseCity || '';
  const distanceKm =
    typeof provider.distanceKm === 'number' && Number.isFinite(provider.distanceKm)
      ? provider.distanceKm
      : null;
  const distance =
    provider.distance ||
    (distanceKm !== null
      ? `${distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm)} km`
      : '');
  const cityText = city
    ? `${city}${
        provider.serviceAreas && provider.serviceAreas.length > 1
          ? ` · covers ${provider.serviceAreas.slice(0, 2).join(', ')}`
          : ''
      }`
    : '';
  const locationText = isNearbyMap ? cityText || distance : distance || cityText;
  const imageStyle = [styles.image, styles[`${variant}Image`], isNearbyMap && styles.nearbyImage];
  const cardStyle: ViewStyle[] = [
    styles[`${variant}Card`],
    isNearbyMap && styles.nearbyCard,
    selected && styles.selectedCard,
    variant === 'map' && {
      borderColor: selected ? 'rgba(31,229,160,0.6)' : 'rgba(46,230,160,0.15)',
      borderWidth: selected ? 1.2 : 1,
    },
  ].filter(Boolean) as ViewStyle[];
  const contentStyle: ViewStyle[] = [
    styles[`${variant}Content`],
    isNearbyMap && styles.nearbyContent,
  ].filter(Boolean) as ViewStyle[];
  const detailsStyle = [styles.details, isNearbyMap && styles.nearbyDetails];

  return (
    <Animated.View
      entering={canAnimate ? FadeInDown.delay(Math.min(index, 8) * 36).duration(230) : undefined}
    >
      <GlowCard
        variant={cardVariant}
        glowIntensity={variant === 'map' ? Math.min(glowIntensity, 0.6) : glowIntensity}
        style={cardStyle}
        contentStyle={contentStyle}
        swooshStyle={variant === 'row' ? styles.rowSwoosh : undefined}
      >
        <PressableScale
          testID={titleTestID}
          accessibilityLabel={`View ${provider.name}`}
          onPress={onPress}
          style={[
            styles.main,
            variant === 'compact' && styles.compactMain,
            variant === 'row' && styles.flexMain,
            variant === 'map' && !isNearbyMap && styles.flexMain,
            isNearbyMap && styles.nearbyMain,
          ]}
        >
          <Image resizeMethod="resize" source={source} resizeMode="cover" style={imageStyle} />
          <View style={detailsStyle}>
            <View style={styles.nameRow}>
              <Text numberOfLines={1} style={[styles.name, isNearbyMap && styles.nearbyName]}>
                {provider.name}
              </Text>
              {provider.isVerified ? (
                <View style={styles.badge}>
                  <BadgeCheck size={13} color={theme.colors.primary} />
                  <Text style={styles.badgeText}>Verified</Text>
                </View>
              ) : provider.isDataVerified ? (
                <View style={styles.badge}>
                  <BadgeCheck size={13} color={theme.colors.primary} />
                  <Text style={styles.badgeText}>Data checked</Text>
                </View>
              ) : null}
            </View>
            {!onCategory && provider.category ? (
              <Text numberOfLines={1} style={[styles.category, isNearbyMap && styles.nearbyMeta]}>
                {provider.category}
              </Text>
            ) : null}
            <View style={styles.metadata}>
              <Star
                size={13}
                color={reviews > 0 ? theme.colors.primary : theme.colors.textSecondary}
                fill={reviews > 0 ? theme.colors.primary : 'transparent'}
              />
              <Text numberOfLines={1} style={[styles.metaText, isNearbyMap && styles.nearbyMeta]}>
                {reviews > 0 && Number.isFinite(rating)
                  ? `${rating.toFixed(1)} (${reviews})`
                  : 'New'}
              </Text>
              {locationText ? (
                <>
                  <MapPin size={12} color={theme.colors.textSecondary} />
                  <Text numberOfLines={1} style={[styles.metaText, styles.location]}>
                    {locationText}
                  </Text>
                </>
              ) : null}
              {price ? <Text style={styles.metaText}>{price}</Text> : null}
            </View>
            {typeof provider.openNow === 'boolean' ? (
              <View style={styles.openStatus}>
                {provider.openNow ? <PulseDot size={7} /> : null}
                <Text
                  style={[
                    styles.statusText,
                    provider.openNow ? styles.openText : styles.closedText,
                  ]}
                >
                  {provider.openNow ? 'Open' : 'Closed'}
                </Text>
              </View>
            ) : null}
            {provider.address && variant === 'map' && !isNearbyMap ? (
              <Text numberOfLines={1} style={styles.metaText}>
                {provider.address}
              </Text>
            ) : null}
          </View>
        </PressableScale>
        <View style={styles.actions}>
          {onCategory ? (
            <PressableScale
              accessibilityLabel={`Browse ${provider.category || 'businesses'}`}
              onPress={onCategory}
              haptic={false}
              style={styles.categoryAction}
            >
              <Text numberOfLines={1} style={styles.category}>
                {provider.category}
              </Text>
            </PressableScale>
          ) : null}
          {onSave ? (
            <GlowIconButton
              testID={resolvedSaveTestID}
              accessibilityRole="button"
              accessibilityLabel={`${saved ? `Remove ${provider.name} from saved` : `Save ${provider.name}`}${
                isNearbyMap ? ' in nearby results' : ''
              }`}
              accessibilityState={{ selected: saved }}
              onPress={onSave}
              size={40}
              variant="secondary"
              actionFeedback={false}
              haptic={false}
              style={styles.actionButton}
              icon={
                <Heart
                  size={17}
                  color={saved ? theme.colors.primary : theme.colors.textSecondary}
                  fill={saved ? theme.colors.primary : 'transparent'}
                />
              }
            />
          ) : null}
          {onDirections ? (
            <GlowIconButton
              testID={directionsTestID}
              accessibilityRole="button"
              accessibilityLabel={`Directions to ${provider.name}`}
              onPress={onDirections}
              size={40}
              variant="secondary"
              haptic={false}
              style={styles.actionButton}
              icon={<Navigation size={17} color={theme.colors.primary} />}
            />
          ) : null}
        </View>
      </GlowCard>
    </Animated.View>
  );
}

export default memo(ProviderCardGlow);

const styles = StyleSheet.create({
  rowCard: { width: '100%' },
  compactCard: { width: 190, marginRight: theme.spacing.md },
  mapCard: { width: '100%' },
  nearbyCard: { width: 176, height: 196 },
  selectedCard: { borderColor: theme.colors.primary, borderWidth: 2 },
  rowContent: { padding: theme.spacing.md, gap: theme.spacing.sm },
  compactContent: { padding: theme.spacing.sm, gap: theme.spacing.sm },
  mapContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  nearbyContent: {
    flexDirection: 'column',
    alignItems: 'stretch',
    padding: theme.spacing.xs,
    gap: theme.spacing.xs,
  },
  main: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, minWidth: 0 },
  flexMain: { flex: 1 },
  compactMain: { flexDirection: 'column', alignItems: 'stretch', gap: theme.spacing.sm },
  nearbyMain: { flexDirection: 'column', alignItems: 'stretch', gap: theme.spacing.xs },
  image: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.spacing.sm,
  },
  rowImage: { width: 76, height: 76 },
  compactImage: { width: '100%', height: 94 },
  mapImage: { width: 76, height: 76 },
  nearbyImage: { width: '100%', height: 58 },
  details: { flex: 1, minWidth: 0, gap: theme.spacing.xs },
  nearbyDetails: { gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  name: {
    flexShrink: 1,
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  nearbyName: { fontSize: 12, color: theme.colors.textPrimary },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  badgeText: { color: theme.colors.primary, fontSize: 10, fontWeight: '700' },
  category: { color: theme.colors.textSecondary, fontSize: 12, opacity: 1 },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    minWidth: 0,
  },
  metaText: { color: theme.colors.textSecondary, fontSize: 11, opacity: 1 },
  nearbyMeta: { fontSize: 10, color: theme.colors.textSecondary },
  location: { flexShrink: 1 },
  openStatus: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  statusText: { fontSize: 11, fontWeight: '700' },
  openText: { color: theme.colors.primary },
  closedText: { color: theme.colors.textSecondary, opacity: 1 },
  rowSwoosh: { right: 46 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 2 },
  categoryAction: { flex: 1, minWidth: 0, justifyContent: 'center', minHeight: 40 },
  actionButton: { borderRadius: theme.radius.pill },
});
