import React from 'react';
import {
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
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
} from 'lucide-react-native';
import { categoryFallback, imageSource, isPlaceholderImage } from '../data/assetCatalog';
import { shadows } from '../theme/theme';

export function ProviderHero({ provider, palette, saved, onBack, onShare, onSave }) {
  const source = imageSource(
    provider.image,
    categoryFallback(provider.category, provider.categoryId),
  );
  return (
    <ImageBackground source={source} style={s.hero} imageStyle={s.heroImage}>
      <View style={s.heroShade} />
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={s.heroButton}
        onPress={onBack}
      >
        <ArrowLeft size={21} color="#FFFFFF" />
      </TouchableOpacity>
      <View style={s.heroRight}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Share provider"
          style={s.heroButton}
          onPress={onShare}
        >
          <Share2 size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Remove provider from saved' : 'Save provider'}
          accessibilityState={{ selected: saved }}
          style={s.heroButton}
          onPress={onSave}
        >
          <Heart
            size={20}
            color={saved ? '#FF5C68' : '#FFFFFF'}
            fill={saved ? '#FF5C68' : 'transparent'}
          />
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
}
export function ProviderIdentity({ provider, palette }) {
  return (
    <View style={[s.identity, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Image
        source={imageSource(
          provider.logo || provider.image,
          categoryFallback(provider.category, provider.categoryId),
        )}
        style={s.logo}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={s.nameRow}>
          <Text numberOfLines={2} style={[s.name, { color: palette.text }]}>
            {provider.name}
          </Text>
          {provider.isVerified && <BadgeCheck size={18} color="#4C8DFF" />}
          {!provider.isVerified && provider.isDataVerified && (
            <View style={s.dataCheckedBadge}>
              <BadgeCheck size={14} color="#08724F" />
              <Text style={s.dataCheckedText}>Data checked</Text>
            </View>
          )}
        </View>
        <Text style={[s.category, { color: palette.text2 }]}>{provider.category}</Text>
        <View style={s.metaRow}>
          <Star size={14} color={palette.saffron} fill={palette.saffron} />
          <Text style={[s.metaStrong, { color: palette.text }]}>
            {provider.reviewCount > 0 ? `${provider.rating} (${provider.reviewCount})` : 'New'}
          </Text>
          {provider.distance && (
            <Text style={[s.meta, { color: palette.text2 }]}>· {provider.distance}</Text>
          )}
          {typeof provider.openNow === 'boolean' && (
            <View
              style={[
                s.status,
                { backgroundColor: provider.openNow ? palette.success : palette.muted },
              ]}
            >
              <Text style={s.statusText}>{provider.openNow ? 'Open' : 'Closed'}</Text>
            </View>
          )}
        </View>
        <View style={s.metaRow}>
          <MapPin size={13} color={palette.text2} />
          <Text numberOfLines={1} style={[s.meta, { color: palette.text2 }]}>
            {provider.baseCity}, UK
          </Text>
        </View>
      </View>
    </View>
  );
}
const actionIcons = { Call: Phone, Directions: Navigation, Website: Globe, Save: Bookmark };
export function ProviderActions({ palette, items }) {
  return (
    <View style={s.actions}>
      {items.map((item, index) => {
        const Icon = actionIcons[item.label];
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
export function ProviderMapPreview({ palette, onPress }) {
  return (
    <View
      style={[s.mapPreview, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}
    >
      <View style={[s.mapRoad, s.mapRoadOne, { backgroundColor: palette.surface }]} />
      <View style={[s.mapRoad, s.mapRoadTwo, { backgroundColor: palette.surface }]} />
      <View style={[s.mapPark, { backgroundColor: palette.primaryTint }]} />
      <MapPin size={30} color={palette.primary} fill={palette.primary} />
      <TouchableOpacity
        onPress={onPress}
        style={[s.mapPreviewButton, { backgroundColor: palette.surfaceRaised }]}
      >
        <Text style={[s.mapPreviewText, { color: palette.text }]}>View on map</Text>
      </TouchableOpacity>
    </View>
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
    <View style={[s.infoChip, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      {Icon && <Icon size={18} color={palette.primary} />}
      <View style={{ flex: 1 }}>
        <Text style={[s.infoTitle, { color: palette.text }]}>{title}</Text>
        <Text numberOfLines={2} style={[s.infoValue, { color: palette.text2 }]}>
          {value}
        </Text>
      </View>
    </View>
  );
}
export function PhotoGallery({ palette, photos }) {
  const approved = (photos || []).filter((url) => !isPlaceholderImage(url));
  if (!approved.length)
    return <EmptyBlock palette={palette} text="No verified business photos have been added yet." />;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {approved.map((url, index) => (
        <Image key={`${url}-${index}`} source={{ uri: url }} style={s.photo} />
      ))}
    </ScrollView>
  );
}
export function ReviewSummary({ palette, rating, count }) {
  return (
    <View
      style={[s.reviewSummary, { backgroundColor: palette.surface, borderColor: palette.border }]}
    >
      <View style={s.score}>
        <Text style={[s.scoreText, { color: palette.text }]}>{rating || '—'}</Text>
        <View style={s.stars}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              size={14}
              color={palette.saffron}
              fill={n <= Math.round(rating || 0) ? palette.saffron : 'transparent'}
            />
          ))}
        </View>
        <Text style={[s.meta, { color: palette.text2 }]}>({count || 0} reviews)</Text>
      </View>
      <View style={{ flex: 1 }}>
        {[5, 4, 3, 2, 1].map((star) => (
          <View key={star} style={s.barRow}>
            <Text style={[s.barLabel, { color: palette.text2 }]}>{star} ★</Text>
            <View style={[s.barTrack, { backgroundColor: palette.surfaceAlt }]}>
              <View
                style={[
                  s.barFill,
                  {
                    backgroundColor: palette.saffron,
                    width: count ? `${Math.max(8, star === 5 ? 65 : star === 4 ? 25 : 5)}%` : '0%',
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
export function ReviewCard({ palette, review }) {
  return (
    <View style={[s.reviewCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={s.nameRow}>
        <View style={[s.avatar, { backgroundColor: palette.primarySoft }]}>
          <Text style={{ color: palette.primary, fontWeight: '800' }}>
            {review.author?.[0] || 'U'}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.infoTitle, { color: palette.text }]}>
            {review.author || 'Community member'}
          </Text>
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
    height: 252,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  heroImage: { resizeMode: 'cover' },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(3,10,18,.18)' },
  heroButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(8,18,30,.62)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroRight: { flexDirection: 'row', gap: 10 },
  identity: {
    marginTop: -28,
    marginHorizontal: 16,
    borderWidth: 1,
    borderRadius: 24,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    ...shadows.soft,
  },
  logo: { width: 82, height: 82, borderRadius: 20 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dataCheckedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E6FFF4',
    borderColor: '#5EE0AD',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  dataCheckedText: { color: '#08724F', fontSize: 9, fontWeight: '800' },
  name: { fontSize: 23, lineHeight: 27, fontWeight: '800', flexShrink: 1 },
  category: { fontSize: 13, marginTop: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  metaStrong: { fontSize: 12, fontWeight: '800' },
  meta: { fontSize: 11 },
  status: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  statusText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 17 },
  action: {
    flex: 1,
    height: 76,
    borderWidth: 1,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  actionLabel: { fontSize: 10, fontWeight: '700' },
  mapPreview: {
    height: 96,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapRoad: { position: 'absolute', width: '120%', height: 9 },
  mapRoadOne: { transform: [{ rotate: '12deg' }] },
  mapRoadTwo: { transform: [{ rotate: '-28deg' }] },
  mapPark: { position: 'absolute', left: 18, top: 12, width: 76, height: 48, borderRadius: 14 },
  mapPreviewButton: {
    position: 'absolute',
    right: 14,
    height: 36,
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
  photo: { width: 126, height: 100, borderRadius: 14, marginRight: 10 },
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
