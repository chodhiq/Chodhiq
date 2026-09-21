import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  Bookmark,
  CalendarDays,
  CheckCircle2,
  MapPin,
  Navigation,
  Star,
} from 'lucide-react-native';
import { radius, shadows, spacing } from '../theme/theme';
import { useChodhiQTheme } from '../context/ThemeContext';
import { categoryFallback, imageSource } from '../data/assetCatalog';

export function VerifiedBadge() {
  const { palette } = useChodhiQTheme();
  return (
    <View style={[styles.badge, { backgroundColor: `${palette.indigo}22` }]}>
      <CheckCircle2 size={12} color={palette.indigo} />
      <Text style={[styles.badgeText, { color: palette.indigo }]}>Verified</Text>
    </View>
  );
}
export function SponsoredBadge() {
  const { palette } = useChodhiQTheme();
  return (
    <View style={[styles.badge, { backgroundColor: `${palette.saffron}20` }]}>
      <Text style={[styles.badgeText, { color: palette.saffron }]}>PROMOTED</Text>
    </View>
  );
}

export function OfferCard({ item, onPress }) {
  const { palette } = useChodhiQTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[styles.offer, { backgroundColor: item.tone || palette.surface }]}
    >
      <Image source={imageSource(item.image)} style={styles.offerImage} resizeMode="cover" />
      <View style={styles.shade} />
      <View style={styles.offerCopy}>
        <SponsoredBadge />
        <Text style={styles.offerTitle}>{item.title}</Text>
        <Text style={styles.offerSubtitle}>{item.subtitle}</Text>
        <Text style={styles.meta}>
          {item.provider} · {item.city}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export function CreatorCard({ item, onPress }) {
  const { palette } = useChodhiQTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[styles.creator, { backgroundColor: palette.surface, borderColor: palette.border }]}
    >
      <Image source={imageSource(item.image)} style={styles.avatar} resizeMode="cover" />
      <View style={{ flex: 1 }}>
        <View style={styles.inline}>
          <Text numberOfLines={1} style={[styles.name, { color: palette.text }]}>
            {item.name}
          </Text>
          {item.verified && <CheckCircle2 size={14} color={palette.indigo} />}
        </View>
        <Text numberOfLines={1} style={[styles.secondary, { color: palette.text2 }]}>
          {item.profession}
        </Text>
        <Text style={[styles.metaDark, { color: palette.muted }]}>
          {item.city} · {item.languages.join(' · ')}
        </Text>
      </View>
      <Bookmark size={18} color={palette.muted} />
    </TouchableOpacity>
  );
}

export function EventCard({ item, onPress }) {
  const { palette } = useChodhiQTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[styles.event, { backgroundColor: palette.surface, borderColor: palette.border }]}
    >
      <Image source={imageSource(item.image)} style={styles.eventImage} resizeMode="cover" />
      <View style={styles.eventBody}>
        <View style={[styles.date, { backgroundColor: palette.primarySoft }]}>
          <CalendarDays size={14} color={palette.primary} />
          <Text style={[styles.dateText, { color: palette.primary }]}>{item.date}</Text>
        </View>
        <Text numberOfLines={2} style={[styles.name, { color: palette.text }]}>
          {item.title}
        </Text>
        <Text style={[styles.secondary, { color: palette.text2 }]}>{item.organiser}</Text>
        <View style={styles.inline}>
          <MapPin size={12} color={palette.primary} />
          <Text style={[styles.metaDark, { color: palette.muted }]}>{item.city}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function MapProviderCard({ provider, onPress }) {
  const { palette } = useChodhiQTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.mapCard, { backgroundColor: palette.surface }]}
    >
      <Image
        source={imageSource(
          provider.image,
          categoryFallback(provider.category, provider.categoryId),
        )}
        style={styles.mapImage}
      />
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={[styles.name, { color: palette.text }]}>
          {provider.name}
        </Text>
        <Text style={[styles.secondary, { color: palette.text2 }]}>{provider.category}</Text>
        <View style={styles.inline}>
          <Star
            size={12}
            fill={provider.reviewCount > 0 ? palette.saffron : 'transparent'}
            color={provider.reviewCount > 0 ? palette.saffron : palette.muted}
          />
          <Text style={[styles.metaDark, { color: palette.text2 }]}>
            {provider.reviewCount > 0 ? provider.rating : 'New'} · {provider.baseCity}
          </Text>
        </View>
      </View>
      <Navigation size={18} color={palette.primary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  badgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  offer: {
    width: 248,
    height: 154,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 12,
    ...shadows.lift,
  },
  offerImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  shade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(7,10,24,.57)' },
  offerCopy: { flex: 1, justifyContent: 'flex-end', padding: spacing.md },
  offerTitle: { fontSize: 24, fontWeight: '900', color: '#F7F4EF', marginTop: 7 },
  offerSubtitle: { fontSize: 12, fontWeight: '700', color: '#F7F4EF', marginTop: 2 },
  meta: { fontSize: 10, color: '#CFD5DF', marginTop: 5 },
  creator: {
    width: 280,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 18,
    borderWidth: 1,
    marginRight: 12,
    ...shadows.soft,
  },
  avatar: { width: 62, height: 62, borderRadius: 17 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { fontSize: 14, fontWeight: '900', flexShrink: 1 },
  secondary: { fontSize: 11, marginTop: 3 },
  metaDark: { fontSize: 10, marginTop: 5 },
  event: {
    width: 240,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginRight: 12,
    ...shadows.soft,
  },
  eventImage: { width: '100%', height: 112 },
  eventBody: { padding: 13 },
  date: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.pill,
    marginBottom: 8,
  },
  dateText: { fontSize: 9, fontWeight: '900' },
  mapCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 12,
    borderRadius: 20,
    ...shadows.lift,
  },
  mapImage: { width: 62, height: 62, borderRadius: 15 },
});
