import { AppAlert as Alert } from '../AppDialog';
import { useIsFocused } from '@react-navigation/native';
import { useMotionPreferences } from '../../hooks/useMotionPreferences';
import { MotionTouchable as TouchableOpacity } from '../Motion';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Modal, Platform, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';
import {
  Bookmark,
  Check,
  MessageCircle,
  MoreHorizontal,
  Share2,
  Store,
  ThumbsUp,
} from 'lucide-react-native';
import Text from './MelaText';
import { addBreadcrumb } from '../../lib/sentryUtils';
import { imageSource } from '../../data/assetCatalog';
import { REGION_LABELS } from '../RegionEmblem';
import { offerProgress, phoneParts, postVariant } from './melaFeedUtils';
import useReducedMotion from './useReducedMotion';

function PhonePill({ number, palette }) {
  const [revealed, setRevealed] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={
        revealed ? `Phone number: ${number}` : 'Hidden phone number. Tap to reveal'
      }
      onPress={() => {
        if (revealed) return;
        setRevealed(true);
        Animated.timing(opacity, {
          toValue: 1,
          duration: reduced ? 0 : 200,
          useNativeDriver: true,
        }).start();
        addBreadcrumb('Community phone revealed', 'community.phone_reveal');
      }}
      style={[styles.phone, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}
    >
      {revealed ? (
        <Animated.View style={{ opacity }}>
          <Text style={{ color: palette.text }}>{number}</Text>
        </Animated.View>
      ) : (
        <Text style={{ color: palette.text2 }}>•••• · Tap to reveal</Text>
      )}
    </TouchableOpacity>
  );
}

function OfferRing({ post, palette }) {
  const focused = useIsFocused();
  const { foreground } = useMotionPreferences();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!focused || !foreground || !post.offer_expires_at) return undefined;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, [focused, foreground, post.offer_expires_at]);
  const offer = offerProgress(post.created_at, post.offer_expires_at, now);
  if (!offer) return null;
  const circumference = 2 * Math.PI * 19;
  const from = [244, 161, 37];
  const to = [197, 57, 43];
  const color = `rgb(${from.map((value, index) => Math.round(value + (to[index] - value) * offer.urgency)).join(',')})`;
  return (
    <View
      accessible
      accessibilityLabel={`Offer ${offer.remaining ? `expires in ${offer.label}` : 'expired'}`}
      style={styles.ring}
    >
      <Svg width={48} height={48} viewBox="0 0 48 48">
        <Circle cx={24} cy={24} r={19} stroke={palette.border} strokeWidth={3} fill="none" />
        <Circle
          cx={24}
          cy={24}
          r={19}
          stroke={color}
          strokeWidth={3}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - offer.progress)}
          rotation={-90}
          origin="24,24"
        />
      </Svg>
      <Text style={[styles.ringLabel, { color: palette.text }]}>{offer.label}</Text>
    </View>
  );
}

function Upvote({ liked, count, onPress, palette, disabled }) {
  const reduced = useReducedMotion();
  const fill = useRef(new Animated.Value(liked ? 1 : 0)).current;
  const pop = useRef(new Animated.Value(1)).current;
  const burst = useRef(new Animated.Value(1)).current;
  const previousLiked = useRef(liked);
  const roll = useRef(new Animated.Value(1)).current;
  const previous = useRef(count);
  const [oldCount, setOldCount] = useState(count);
  useEffect(() => {
    Animated.timing(fill, {
      toValue: liked ? 1 : 0,
      duration: reduced ? 0 : 180,
      useNativeDriver: true,
    }).start();
    pop.stopAnimation();
    burst.stopAnimation();
    if (liked && !previousLiked.current && !reduced) {
      Animated.sequence([
        Animated.timing(pop, { toValue: 1.25, duration: 100, useNativeDriver: true }),
        Animated.spring(pop, { toValue: 1, friction: 5, useNativeDriver: true }),
      ]).start();
      burst.setValue(0);
      Animated.timing(burst, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    } else {
      pop.setValue(1);
      burst.setValue(1);
    }
    previousLiked.current = liked;
    return () => {
      fill.stopAnimation();
      pop.stopAnimation();
      burst.stopAnimation();
    };
  }, [liked, reduced, fill, pop, burst]);
  useEffect(() => {
    if (previous.current === count) return;
    setOldCount(previous.current);
    previous.current = count;
    roll.stopAnimation();
    roll.setValue(0);
    Animated.timing(roll, {
      toValue: 1,
      duration: reduced ? 0 : 180,
      useNativeDriver: true,
    }).start();
  }, [count, reduced, roll]);
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${liked ? 'Remove upvote' : 'Upvote'}, ${count} votes`}
      disabled={disabled}
      accessibilityState={{ selected: !!liked, disabled: !!disabled }}
      onPress={() => {
        if (!liked && !reduced && Platform.OS !== 'web')
          void Haptics.selectionAsync().catch(() => {});
        onPress?.();
      }}
      style={styles.action}
    >
      <Animated.View style={[styles.voteIcon, { transform: [{ scale: pop }] }]}>
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            inset: -3,
            borderRadius: 20,
            borderWidth: 1.5,
            borderColor: palette.primary,
            opacity: burst.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
            transform: [
              { scale: burst.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] }) },
            ],
          }}
        />
        <ThumbsUp size={20} color={palette.text2} />
        <Animated.View
          pointerEvents="none"
          style={[styles.voteFill, { height: 22, opacity: fill }]}
        >
          <ThumbsUp size={20} color={palette.primary} fill={palette.primary} />
        </Animated.View>
      </Animated.View>
      <View
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={styles.digits}
      >
        <Animated.View
          style={{
            opacity: roll,
            transform: [
              { translateY: roll.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
            ],
          }}
        >
          <Text style={{ color: palette.text2, fontSize: 12 }}>{count}</Text>
        </Animated.View>
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            {
              opacity: roll.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
              transform: [
                { translateY: roll.interpolate({ inputRange: [0, 1], outputRange: [0, -16] }) },
              ],
            },
          ]}
        >
          <Text style={{ color: palette.text2, fontSize: 12 }}>{oldCount}</Text>
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
}

export default function PostCard({
  post,
  palette,
  providers,
  session,
  engagement,
  onLike,
  onComment,
  onSave,
  onShare,
  onReport,
  onEdit,
  onProvider,
  onAuthor,
  onBlock,
  newHere = false,
}) {
  const [imageOpen, setImageOpen] = useState(false);
  const [imageRatio, setImageRatio] = useState(1);
  const variant = postVariant(post);
  const provider = post.providers || providers.find((item) => item.id === post.provider_id);
  const counts = engagement.counts[post.id] || {};
  const liked = !!session && !!counts.is_liked;
  const saved = engagement.saves.some((item) => item.post_id === post.id);
  const name =
    post.author_id === session?.user?.id ? 'You' : post.author_name || 'Community member';
  const image = post.image_url ? (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Open full post image"
      onPress={() => setImageOpen(true)}
    >
      <Image
        resizeMethod="resize"
        source={imageSource(post.image_url)}
        accessibilityLabel={variant === 'marketplace' ? 'Item for sale' : 'Post image'}
        resizeMode="contain"
        onLoad={({ nativeEvent }) => {
          const source = nativeEvent.source;
          if (source?.width && source?.height) setImageRatio(source.width / source.height);
        }}
        style={[styles.image, { aspectRatio: imageRatio, backgroundColor: palette.surfaceAlt }]}
      />
      {variant === 'marketplace' && (
        <View style={[styles.saleChip, { backgroundColor: palette.accent }]}>
          <Text style={styles.saleLabel}>FOR SALE</Text>
        </View>
      )}
    </TouchableOpacity>
  ) : null;
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
          borderLeftWidth: variant === 'marketplace' ? 1 : 3,
          borderLeftColor:
            variant === 'provider_offer'
              ? palette.primary
              : variant === 'discussion'
                ? palette.secondary
                : palette.border,
        },
      ]}
    >
      {imageOpen && (
        <Modal
          transparent
          visible={imageOpen}
          animationType="fade"
          onRequestClose={() => setImageOpen(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: palette.background,
              paddingTop: 45,
              paddingBottom: 30,
            }}
          >
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close image"
              onPress={() => setImageOpen(false)}
              style={{ padding: 18, alignSelf: 'flex-end' }}
            >
              <Text style={{ color: palette.text, fontWeight: '700' }}>Close</Text>
            </TouchableOpacity>
            <Image
              source={imageSource(post.image_url)}
              resizeMode="contain"
              style={{ width: '100%', flex: 1 }}
              accessibilityLabel="Full post image"
            />
          </View>
        </Modal>
      )}
      {variant === 'marketplace' && image}
      <View style={styles.content}>
        <View style={styles.head}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`View ${name} profile`}
            onPress={onAuthor}
            style={[styles.avatar, { backgroundColor: palette.primarySoft }]}
          >
            <Text style={{ color: palette.text, fontWeight: '600' }}>{name[0]}</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={styles.nameRow}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`View ${name} profile`}
                onPress={onAuthor}
              >
                <Text style={{ color: palette.text, fontWeight: '600' }}>{name}</Text>
              </TouchableOpacity>
              {newHere && (
                <Text
                  style={[
                    styles.newBadge,
                    { color: palette.text2, backgroundColor: palette.surfaceAlt },
                  ]}
                >
                  New here
                </Text>
              )}
            </View>
            <Text style={{ color: palette.text2, fontSize: 11 }}>
              {relativeDate(post.created_at)}
              {post.region_key ? ` · ${REGION_LABELS[post.region_key] || post.region_key}` : ''}
            </Text>
          </View>
          {variant === 'provider_offer' && <OfferRing post={post} palette={palette} />}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Post options"
            style={styles.action}
            onPress={() =>
              Alert.alert('Post options', 'Help keep the community safe.', [
                ...(onEdit ? [{ text: 'Edit post', onPress: onEdit }] : []),
                ...(onReport ? [{ text: 'Report post', onPress: onReport }] : []),
                ...(onAuthor ? [{ text: 'View profile', onPress: onAuthor }] : []),
                ...(onBlock
                  ? [{ text: 'Block author', onPress: onBlock, style: 'destructive' }]
                  : []),
                { text: 'Cancel', style: 'cancel' },
              ])
            }
          >
            <MoreHorizontal size={22} color={palette.text2} />
          </TouchableOpacity>
        </View>
        {variant === 'marketplace' ? (
          <View style={styles.richBody}>
            {phoneParts(post.body).map((part, index) =>
              part.phone ? (
                <PhonePill key={index} number={part.text} palette={palette} />
              ) : (
                <Text key={index} style={[styles.body, { color: palette.text }]}>
                  {part.text}
                </Text>
              ),
            )}
          </View>
        ) : (
          <Text style={[styles.body, { color: palette.text }]}>{post.body}</Text>
        )}
        <Text style={[styles.type, { color: palette.actionText }]}>
          {variant === 'provider_offer'
            ? 'Provider offer'
            : variant === 'marketplace'
              ? 'For sale'
              : typeLabel(post.post_type)}
        </Text>
        {provider && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`View ${provider.business_name || provider.name}`}
            onPress={onProvider}
            style={[styles.provider, { backgroundColor: palette.surfaceAlt }]}
          >
            <Store size={16} color={palette.actionText} />
            <Text style={{ color: palette.actionText, fontSize: 12 }}>
              {provider.business_name || provider.name}
            </Text>
            {provider.is_verified && <Check size={14} color={palette.actionText} />}
          </TouchableOpacity>
        )}
      </View>
      {variant !== 'marketplace' && image}
      {!post.image_url && post.storage_image_ref && (
        <Text style={{ color: palette.text2, padding: 14 }}>
          Photo unavailable. Refresh the feed to retry.
        </Text>
      )}
      <View style={[styles.actions, { borderTopColor: palette.border }]}>
        <Upvote
          disabled={!!counts.is_updating}
          liked={liked}
          count={Number(counts.like_count || 0)}
          palette={palette}
          onPress={() => {
            onLike();
          }}
        />
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Comments, ${Number(counts.comment_count || 0)}`}
          onPress={onComment}
          style={styles.action}
        >
          <MessageCircle size={20} color={palette.text2} />
          <Text style={{ color: palette.text2, fontSize: 12 }}>
            {Number(counts.comment_count || 0)}
          </Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Remove saved post' : 'Save post'}
          accessibilityState={{ selected: saved }}
          onPress={onSave}
          style={styles.action}
        >
          <Bookmark
            size={20}
            color={saved ? palette.actionText : palette.text2}
            fill={saved ? palette.primary : 'transparent'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Share post"
          onPress={onShare}
          style={styles.action}
        >
          <Share2 size={20} color={palette.text2} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function typeLabel(type) {
  return (
    {
      discussion: 'Discussion',
      experience: 'Experience',
      recommendation: 'Recommendation',
      complaint: 'Concern',
    }[type] || 'Discussion'
  );
}
function relativeDate(value) {
  if (!value) return '';
  const days = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 86400000));
  return days === 0
    ? 'Today'
    : days === 1
      ? '1 day ago'
      : days < 30
        ? `${days} days ago`
        : new Date(value).toLocaleDateString();
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 18,
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  content: { padding: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  newBadge: { fontSize: 10, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8 },
  body: { fontSize: 14, lineHeight: 23, marginTop: 10, flexShrink: 1 },
  type: { fontSize: 11, marginTop: 9 },
  image: { width: '100%' },
  saleChip: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  saleLabel: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  richBody: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  phone: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    justifyContent: 'center',
    marginTop: 8,
  },
  ring: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  ringLabel: { position: 'absolute', fontSize: 9 },
  provider: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    padding: 10,
    minHeight: 44,
    marginTop: 10,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  action: {
    minWidth: 44,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  voteIcon: { width: 22, height: 22 },
  voteFill: {
    position: 'absolute',
    bottom: 0,
    width: 22,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  digits: { minWidth: 18, height: 20, overflow: 'hidden' },
});
