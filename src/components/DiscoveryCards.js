import { MotionTouchable as TouchableOpacity } from './Motion';
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Text from './AppText';
import { CalendarDays, MapPin } from 'lucide-react-native';
import { radius, shadows, spacing } from '../theme/theme';
import { useChodhiQTheme } from '../context/ThemeContext';
import { imageSource } from '../data/assetCatalog';

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
      <Image
        resizeMethod="resize"
        source={imageSource(item.image)}
        style={styles.offerImage}
        resizeMode="cover"
      />
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

export function EventCard({ item, onPress }) {
  const { palette } = useChodhiQTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[styles.event, { backgroundColor: palette.surface, borderColor: palette.border }]}
    >
      <Image
        resizeMethod="resize"
        source={imageSource(item.image)}
        style={styles.eventImage}
        resizeMode="cover"
      />
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
});
