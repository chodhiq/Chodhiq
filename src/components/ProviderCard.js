import { MotionTouchable as TouchableOpacity } from './Motion';
import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import Text from './AppText';
import { Heart, Star, MapPin, BadgeCheck, Crown } from 'lucide-react-native';
import { colors, radius, shadows, spacing, typography } from '../theme/theme';
import { PressableScale } from './Motion';
import { useChodhiQTheme } from '../context/ThemeContext';
import { categoryFallback, imageSource } from '../data/assetCatalog';
import StatusBadge from './StatusBadge';
import { features } from '../config/features';

const priceLabel = (n) => (n ? '£'.repeat(n) : null);

// Only derive labels supported by current provider data. Opening-hours labels
// must wait until provider_hours is exposed by providerRepository.
const deriveStatus = (provider) => {
  if (features.customAds && provider.sponsoredRank) return null;
  if (provider.rating >= 4.7 && provider.reviewCount >= 20) return 'topRated';
  return null;
};

// Horizontal card style (used on Home screen)
export function ProviderCardCompact({ provider, onPress, onSave, saved }) {
  const { palette } = useChodhiQTheme();
  return (
    <PressableScale
      style={[styles.compactCard, provider.isDataVerified && styles.dataVerifiedGlow]}
      onPress={onPress}
    >
      <View
        style={[
          styles.compactInner,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
        <View>
          <Image
            resizeMethod="resize"
            source={imageSource(
              provider.image,
              categoryFallback(provider.category, provider.categoryId),
            )}
            style={styles.compactImage}
            resizeMode="cover"
          />
          {provider.isVerified && (
            <View style={styles.verifiedBadge}>
              <BadgeCheck size={12} color={colors.primary} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
          {!provider.isVerified && provider.isDataVerified && (
            <View style={styles.dataCheckedBadge}>
              <BadgeCheck size={12} color="#08724F" />
              <Text style={styles.dataCheckedText}>Data checked</Text>
            </View>
          )}
          {features.customAds && !!provider.sponsoredRank && (
            <View style={styles.promotedBadge}>
              <Crown size={11} color="#2A1708" />
              <Text style={styles.promotedText}>Promoted</Text>
            </View>
          )}
          {!!deriveStatus(provider) && (
            <View style={styles.statusBadgeSlot}>
              <StatusBadge status={deriveStatus(provider)} size="sm" />
            </View>
          )}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={
              saved ? `Remove ${provider.name} from saved` : `Save ${provider.name}`
            }
            accessibilityState={{ selected: saved }}
            style={styles.heartButton}
            onPress={onSave}
          >
            <Heart
              size={16}
              color={saved ? colors.accentHalal : colors.textSecondary}
              fill={saved ? colors.accentHalal : 'none'}
            />
          </TouchableOpacity>
        </View>
        <Text
          style={[typography.label, { marginTop: spacing.sm, color: palette.text }]}
          numberOfLines={1}
        >
          {provider.name}
        </Text>
        <Text style={[typography.caption, { color: palette.text2 }]}>{provider.category}</Text>
        <View style={styles.ratingRow}>
          <Star
            size={12}
            color={provider.reviewCount > 0 ? colors.star : palette.muted}
            fill={provider.reviewCount > 0 ? colors.star : 'transparent'}
          />
          <Text style={[styles.ratingText, { color: palette.text2 }]}>
            {provider.reviewCount > 0 ? `${provider.rating} (${provider.reviewCount})` : 'New'}
          </Text>
          {!!priceLabel(provider.priceRange) && (
            <>
              <Text style={styles.dot}>·</Text>
              <Text style={[styles.ratingText, { color: palette.text2 }]}>
                {priceLabel(provider.priceRange)}
              </Text>
            </>
          )}
        </View>
      </View>
    </PressableScale>
  );
}

// Full-width list row style (used on Explore/Search results)
export function ProviderCardRow({ provider, onPress, onSave, saved }) {
  const { palette } = useChodhiQTheme();
  return (
    <PressableScale
      style={[styles.rowCard, provider.isDataVerified && styles.dataVerifiedGlow]}
      onPress={onPress}
    >
      <View
        style={[styles.rowInner, { backgroundColor: palette.surface, borderColor: palette.border }]}
      >
        <Image
          resizeMethod="resize"
          source={imageSource(
            provider.image,
            categoryFallback(provider.category, provider.categoryId),
          )}
          style={styles.rowImage}
          resizeMode="cover"
        />
        <View style={{ flex: 1, minWidth: 0, marginLeft: spacing.md }}>
          <View style={styles.rowHeader}>
            <Text style={[typography.label, { flex: 1, color: palette.text }]} numberOfLines={1}>
              {provider.name}
            </Text>
            {provider.isVerified && <BadgeCheck size={15} color={colors.primary} />}
            {!provider.isVerified && provider.isDataVerified && (
              <View style={styles.rowDataCheckedBadge}>
                <BadgeCheck size={12} color="#08724F" />
                <Text style={styles.dataCheckedText}>Data checked</Text>
              </View>
            )}
          </View>
          <Text style={[typography.caption, { color: palette.text2 }]}>{provider.category}</Text>
          <View style={styles.addressRow}>
            <MapPin size={12} color={colors.textMuted} />
            <Text style={[styles.addressText, { color: palette.muted }]} numberOfLines={1}>
              {provider.baseCity}
              {provider.serviceAreas?.length > 1
                ? ` · covers ${provider.serviceAreas.slice(0, 2).join(', ')}`
                : ''}
            </Text>
          </View>
          <View style={styles.ratingRow}>
            <Star
              size={12}
              color={provider.reviewCount > 0 ? colors.star : palette.muted}
              fill={provider.reviewCount > 0 ? colors.star : 'transparent'}
            />
            <Text style={[styles.ratingText, { color: palette.text2 }]}>
              {provider.reviewCount > 0 ? `${provider.rating} (${provider.reviewCount})` : 'New'}
            </Text>
            {!!priceLabel(provider.priceRange) && (
              <>
                <Text style={styles.dot}>·</Text>
                <Text style={[styles.ratingText, { color: palette.text2 }]}>
                  {priceLabel(provider.priceRange)}
                </Text>
              </>
            )}
          </View>
          {!!deriveStatus(provider) && (
            <View style={styles.rowStatus}>
              <StatusBadge status={deriveStatus(provider)} size="sm" />
            </View>
          )}
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={
            saved ? `Remove ${provider.name} from saved` : `Save ${provider.name}`
          }
          accessibilityState={{ selected: saved }}
          style={styles.heartButtonRow}
          onPress={onSave}
        >
          <Heart
            size={18}
            color={saved ? colors.accentHalal : colors.textSecondary}
            fill={saved ? colors.accentHalal : 'none'}
          />
        </TouchableOpacity>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  compactCard: { width: 190, marginRight: spacing.md, borderRadius: radius.lg, ...shadows.soft },
  compactInner: {
    padding: 7,
    paddingBottom: 14,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  compactImage: { width: '100%', height: 118, borderRadius: 13, backgroundColor: colors.border },
  imageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },
  imageInitial: { color: colors.primary, fontSize: 30, fontWeight: '700' },
  verifiedBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F7F5FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  verifiedText: { fontSize: 10, fontWeight: '600', color: colors.primary },
  dataCheckedBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E6FFF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#5EE0AD',
  },
  rowDataCheckedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E6FFF4',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  dataCheckedText: { fontSize: 9, fontWeight: '800', color: '#08724F' },
  dataVerifiedGlow: {
    borderColor: '#5EE0AD',
    shadowColor: '#16A36A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.32,
    shadowRadius: 12,
    elevation: 7,
  },
  promotedBadge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E7B86D',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  promotedText: { fontSize: 9, fontWeight: '900', color: '#2A1708', letterSpacing: 0.3 },
  statusBadgeSlot: { position: 'absolute', right: 8, bottom: 8 },
  rowStatus: { marginTop: 5 },
  heartButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#F7F5FF',
    padding: 7,
    borderRadius: radius.pill,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  ratingText: { fontSize: 12, color: colors.textSecondary },
  dot: { color: colors.textMuted, marginHorizontal: 2 },

  rowCard: { borderRadius: radius.lg, marginBottom: 12, ...shadows.soft },
  rowInner: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowImage: { width: 94, height: 94, borderRadius: 14, backgroundColor: colors.border },
  rowHeader: { flexWrap: 'wrap', flexDirection: 'row', alignItems: 'center', gap: 6 },
  addressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 4 },
  addressText: { fontSize: 12, color: colors.textMuted, flexShrink: 1 },
  heartButtonRow: { padding: spacing.sm, alignSelf: 'flex-start' },
});
