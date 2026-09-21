import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  RefreshControl,
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
  BadgeCheck,
  Camera,
  Heart,
  MessageCircle,
  Plus,
  Send,
} from 'lucide-react-native';
import {
  cacheCommunityPosts,
  createLocalPost,
  enqueuePendingOperation,
  loadLocalPosts,
} from '../data/localDatabase';
import { supabase } from '../lib/supabase';
import { useAppState } from '../context/AppStateContext';
import { colors, radius, shadows, spacing, typography } from '../theme/theme';
import { FadeInView } from '../components/Motion';
import { useChodhiQTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import RegionEmblem, {
  REGION_KEYS,
  REGION_KEYWORDS,
  REGION_LABELS,
} from '../components/RegionEmblem';

const postTypes = [
  ['discussion', 'Discussion'],
  ['experience', 'Experience'],
  ['recommendation', 'Recommend'],
  ['complaint', 'Complaint'],
];

const labelFor = (type) => postTypes.find(([value]) => value === type)?.[1] || 'Offer';

export default function CommunityScreen({ navigation, route }) {
  const { session, providers } = useAppState();
  const { palette } = useChodhiQTheme();
  const [posts, setPosts] = useState([]);
  const [body, setBody] = useState('');
  const [postType, setPostType] = useState('discussion');
  const [providerId, setProviderId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const composerRef = useRef(null);

  const activityItems = useMemo(() => {
    const recent = posts.slice(0, 7).map((post, index) => {
      const name =
        post.providers?.business_name || (index === 0 ? 'Your community' : 'ChodhiQ member');
      return {
        id: post.id,
        name,
        initial: name.charAt(0).toUpperCase(),
        image: post.image_url,
        isNew: index < 4,
      };
    });
    return recent;
  }, [posts]);

  // This is explicitly a mention filter until a structured region field is
  // available in the database; it never claims to represent a member's origin.
  const visiblePosts = selectedRegion
    ? posts.filter((post) => {
        const haystack = `${post.body || ''} ${post.providers?.business_name || ''}`.toLowerCase();
        return REGION_KEYWORDS[selectedRegion].some((keyword) => haystack.includes(keyword));
      })
    : posts;

  const loadPosts = useCallback(async () => {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('community_posts')
          .select(
            'id,author_id,provider_id,post_type,body,image_url,offer_expires_at,created_at,providers(business_name,is_verified)',
          )
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(100);
        if (error) throw error;
        await cacheCommunityPosts(data || []);
        setPosts(data || []);
      } else setPosts(await loadLocalPosts(providers));
    } catch (error) {
      console.warn('Community sync failed; using the local cache.', error.message);
      try {
        setPosts(await loadLocalPosts(providers));
      } catch (localError) {
        console.warn('Local community cache failed.', localError.message);
      }
    }
  }, [providers]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const refresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };
  const publish = async () => {
    if (!session) return navigation.navigate('Welcome');
    if (body.trim().length < 2)
      return Alert.alert('Write a post', 'Please add a little more detail.');
    try {
      setPublishing(true);
      if (!supabase) {
        const payload = {
          author_id: session.user.id,
          provider_id: providerId,
          post_type: postType,
          body: body.trim(),
        };
        const localPost = await createLocalPost(session.user.id, {
          providerId,
          postType,
          body: body.trim(),
        });
        await enqueuePendingOperation('community_post', { remote: payload, localId: localPost.id });
      } else {
        const { error } = await supabase.from('community_posts').insert({
          author_id: session.user.id,
          provider_id: providerId,
          post_type: postType,
          body: body.trim(),
        });
        if (error) throw error;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setBody('');
      setProviderId(null);
      setPostType('discussion');
      await loadPosts();
    } catch (error) {
      const payload = {
        author_id: session.user.id,
        provider_id: providerId,
        post_type: postType,
        body: body.trim(),
      };
      const localPost = await createLocalPost(session.user.id, {
        providerId,
        postType,
        body: body.trim(),
      });
      await enqueuePendingOperation('community_post', { remote: payload, localId: localPost.id });
      setBody('');
      setProviderId(null);
      setPostType('discussion');
      await loadPosts();
      Alert.alert(
        'Saved offline',
        'Your post will publish automatically after the connection returns.',
      );
    } finally {
      setPublishing(false);
    }
  };

  return (
    <SafeAreaView style={[styles.page, { backgroundColor: palette.background }]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        contentContainerStyle={styles.content}
      >
        <FadeInView
          style={[
            styles.communityHero,
            { backgroundColor: palette.hero, borderColor: palette.border },
          ]}
        >
          <View style={[styles.heroOrb, { backgroundColor: palette.surfaceAlt }]} />
          <View style={styles.heroRow}>
            <View style={styles.communityTitleRow}>
              {route?.name !== 'CommunityTab' ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                  onPress={() => navigation.goBack()}
                  style={[
                    styles.communityBack,
                    { backgroundColor: palette.surfaceAlt, borderColor: palette.border },
                  ]}
                >
                  <ArrowLeft size={19} color={palette.text} />
                </TouchableOpacity>
              ) : null}
              <View>
                <Text style={[styles.heroEyebrow, { color: palette.saffron }]}>
                  OUR SHARED SPACE
                </Text>
                <Text style={[styles.heroTitle, { color: palette.text }]}>Community</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.createButton,
                { backgroundColor: `${palette.saffron}22`, borderColor: `${palette.saffron}66` },
              ]}
              onPress={() => navigation.navigate('CreatePost')}
            >
              <Plus size={15} color={palette.saffron} />
              <Text style={[styles.createText, { color: palette.saffron }]}>Create post</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.heroSubtitle, { color: palette.text2 }]}>
            Ask, recommend and share genuine experiences. Customer posts are always free and
            text-only.
          </Text>
        </FadeInView>

        <FadeInView delay={40} style={styles.activitySection}>
          <View style={styles.sectionHeading}>
            <View>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Community activity</Text>
              <Text style={[styles.sectionSubtitle, { color: palette.text2 }]}>
                Stories and fresh updates
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('CreatePost')}>
              <Text style={[styles.link, { color: palette.saffron }]}>Share yours</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activityRow}
          >
            <TouchableOpacity
              style={styles.activityItem}
              onPress={() => navigation.navigate('CreatePost')}
              accessibilityRole="button"
              accessibilityLabel="Add a new community update"
            >
              <View style={[styles.storyRing, { borderColor: palette.border }]}>
                <View style={[styles.storyAvatar, { backgroundColor: palette.primarySoft }]}>
                  <Camera size={21} color={palette.primary} />
                </View>
                <View
                  style={[
                    styles.storyAdd,
                    { backgroundColor: palette.primary, borderColor: palette.background },
                  ]}
                >
                  <Plus size={11} color="#fff" strokeWidth={3} />
                </View>
              </View>
              <Text numberOfLines={1} style={[styles.activityName, { color: palette.text }]}>
                Add update
              </Text>
            </TouchableOpacity>
            {activityItems.map((item) => (
              <View key={item.id} style={styles.activityItem}>
                <View
                  style={[
                    styles.storyRing,
                    { borderColor: item.isNew ? palette.saffron : palette.border },
                  ]}
                >
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.storyImage} />
                  ) : (
                    <View
                      style={[
                        styles.storyAvatar,
                        { backgroundColor: item.isNew ? palette.goldSoft : palette.surfaceAlt },
                      ]}
                    >
                      <Text
                        style={[
                          styles.storyInitial,
                          { color: item.isNew ? palette.saffron : palette.text2 },
                        ]}
                      >
                        {item.initial}
                      </Text>
                    </View>
                  )}
                </View>
                <Text numberOfLines={1} style={[styles.activityName, { color: palette.text }]}>
                  {item.name}
                </Text>
              </View>
            ))}
          </ScrollView>
        </FadeInView>

        <FadeInView delay={60}>
          <Text
            style={[typography.h2, { fontSize: 15, marginTop: spacing.lg, color: palette.text }]}
          >
            Posts mentioning a region
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.regionRow}
          >
            {REGION_KEYS.map((key) => (
              <RegionEmblem
                key={key}
                region={key}
                selected={selectedRegion === key}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setSelectedRegion((current) => (current === key ? null : key));
                }}
              />
            ))}
          </ScrollView>
        </FadeInView>

        <FadeInView
          delay={80}
          style={[
            styles.composer,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <View style={styles.composerHeading}>
            <View style={[styles.composerAvatar, { backgroundColor: palette.primarySoft }]}>
              <Text style={[styles.composerInitial, { color: palette.primary }]}>S</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.statusPrompt,
                { backgroundColor: palette.surfaceAlt, borderColor: palette.border },
              ]}
              onPress={() => composerRef.current?.focus()}
            >
              <Text style={[styles.statusPromptText, { color: palette.text2 }]}>
                What’s happening in your community?
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {postTypes.map(([value, label]) => (
              <TouchableOpacity
                key={value}
                onPress={() => setPostType(value)}
                style={[
                  styles.chip,
                  { backgroundColor: palette.surfaceAlt },
                  postType === value && { backgroundColor: palette.primary },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color:
                        postType === value ? (palette.dark ? '#081B2C' : '#FFFFFF') : palette.text2,
                    },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TextInput
            ref={composerRef}
            multiline
            value={body}
            onChangeText={setBody}
            style={[styles.input, { color: palette.text }]}
            placeholder="Share something with the community…"
            placeholderTextColor={palette.muted}
          />
          <Text style={[styles.fieldLabel, { color: palette.text2 }]}>
            Mention a provider (optional)
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {providers.map((provider) => (
              <TouchableOpacity
                key={provider.id}
                onPress={() =>
                  setProviderId((current) => (current === provider.id ? null : provider.id))
                }
                style={[
                  styles.providerChip,
                  {
                    backgroundColor: palette.primarySoft,
                    borderColor: providerId === provider.id ? palette.saffron : 'transparent',
                    borderWidth: 1,
                  },
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.providerChipText,
                    { color: palette.dark ? palette.saffron : palette.primary },
                  ]}
                >
                  {provider.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            disabled={publishing}
            onPress={publish}
            style={[styles.publish, { backgroundColor: palette.primary }]}
          >
            <Send size={17} color={palette.dark ? '#081B2C' : '#FFFFFF'} />
            <Text style={[styles.publishText, { color: palette.dark ? '#081B2C' : '#FFFFFF' }]}>
              {session ? 'Publish free' : 'Sign in to publish'}
            </Text>
          </TouchableOpacity>
        </FadeInView>

        <Text style={[typography.h2, { marginTop: spacing.lg, color: palette.text }]}>
          Activity feed
        </Text>
        <Text style={[styles.feedSubtitle, { color: palette.text2 }]}>
          Updates, recommendations and local conversations
        </Text>
        {!posts.length && (
          <View style={styles.empty}>
            <MessageCircle size={30} color={palette.muted} />
            <Text style={[styles.cardBody, { color: palette.text2 }]}>
              No community posts yet. Start the conversation.
            </Text>
          </View>
        )}
        {!!posts.length && !visiblePosts.length && (
          <View style={styles.empty}>
            <MessageCircle size={30} color={palette.muted} />
            <Text style={[styles.cardBody, { color: palette.text2 }]}>
              No posts mentioning {REGION_LABELS[selectedRegion]} yet.
            </Text>
          </View>
        )}
        {visiblePosts.map((post) => (
          <View
            key={post.id}
            style={[
              styles.post,
              {
                backgroundColor: palette.surface,
                borderColor: post.post_type === 'promotion' ? palette.saffron : palette.border,
              },
            ]}
          >
            <View style={styles.postHeader}>
              <Text style={[styles.type, { color: palette.indigo }]}>
                {labelFor(post.post_type)}
              </Text>
              {post.post_type === 'promotion' && (
                <Text
                  style={[
                    styles.sponsoredLabel,
                    {
                      color: palette.dark ? palette.saffron : palette.primary,
                      backgroundColor: palette.goldSoft,
                    },
                  ]}
                >
                  Sponsored
                </Text>
              )}
              <Text style={[styles.date, { color: palette.muted }]}>
                {new Date(post.created_at).toLocaleDateString()}
              </Text>
            </View>
            {!!post.providers && (
              <View style={styles.business}>
                <Text style={[styles.cardTitle, { color: palette.text }]}>
                  {post.providers.business_name}
                </Text>
                {post.providers.is_verified && <BadgeCheck size={15} color={palette.indigo} />}
              </View>
            )}
            {!!post.image_url && (
              <Image source={{ uri: post.image_url }} style={styles.poster} resizeMode="cover" />
            )}
            <Text style={[styles.postBody, { color: palette.text }]}>{post.body}</Text>
            <View style={[styles.postActions, { borderTopColor: palette.border }]}>
              <TouchableOpacity style={styles.reply}>
                <Heart size={16} color={palette.text2} />
                <Text style={[styles.actionText, { color: palette.text2 }]}>Support</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.reply}>
                <MessageCircle size={16} color={palette.saffron} />
                <Text style={[styles.link, { color: palette.saffron }]}>Reply</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: {
    width: '100%',
    maxWidth: 840,
    alignSelf: 'center',
    padding: spacing.lg,
    paddingBottom: 120,
  },
  communityHero: {
    backgroundColor: colors.primaryDark,
    borderRadius: 26,
    padding: spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,.25)',
    ...shadows.lift,
  },
  heroOrb: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(139,92,246,0.30)',
    right: -35,
    top: -60,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  communityTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  communityBack: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEyebrow: { color: '#C4B5FD', letterSpacing: 1.7, fontWeight: '900', fontSize: 9 },
  heroTitle: { color: '#fff', fontSize: 32, fontWeight: '900', marginTop: 6, letterSpacing: -0.8 },
  heroSubtitle: { color: '#CDD0E2', fontSize: 13, lineHeight: 19, marginTop: 8, maxWidth: '88%' },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(139,92,246,.28)',
    borderWidth: 1,
    borderColor: 'rgba(196,181,253,.35)',
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 12,
  },
  createText: { color: '#fff', fontWeight: '900', fontSize: 11 },
  activitySection: { marginTop: spacing.lg },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },
  sectionSubtitle: { fontSize: 12, marginTop: 2 },
  activityRow: { gap: 14, paddingTop: 13, paddingBottom: 4 },
  activityItem: { width: 68, alignItems: 'center' },
  storyRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2.5,
    padding: 3,
    position: 'relative',
  },
  storyAvatar: { flex: 1, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  storyImage: { width: '100%', height: '100%', borderRadius: 27 },
  storyInitial: { fontSize: 20, fontWeight: '900' },
  storyAdd: {
    position: 'absolute',
    width: 21,
    height: 21,
    borderRadius: 11,
    right: -3,
    bottom: -1,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityName: { width: 68, textAlign: 'center', fontSize: 10, fontWeight: '700', marginTop: 6 },
  subtitle: { ...typography.caption, marginTop: 4, lineHeight: 19 },
  regionRow: { flexDirection: 'row', gap: spacing.md, paddingTop: spacing.sm, paddingBottom: 6 },
  composer: {
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: 20,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.lift,
  },
  composerHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 13 },
  composerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerInitial: { fontSize: 16, fontWeight: '900' },
  statusPrompt: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderRadius: radius.pill,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  statusPromptText: { fontSize: 12.5 },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    marginRight: 7,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  input: {
    minHeight: 90,
    color: colors.textPrimary,
    fontSize: 14,
    textAlignVertical: 'top',
    paddingVertical: spacing.md,
  },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, marginBottom: 7 },
  providerChip: {
    maxWidth: 150,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    marginRight: 7,
  },
  providerChipActive: { borderWidth: 1, borderColor: colors.primary },
  providerChipText: { fontSize: 11, color: colors.primary },
  publish: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
    marginTop: spacing.md,
  },
  publishText: { color: '#fff', fontWeight: '700' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  cardBody: { fontSize: 12, color: colors.textSecondary, lineHeight: 17, marginTop: 2 },
  link: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  empty: { alignItems: 'center', gap: 8, padding: spacing.xl },
  feedSubtitle: { fontSize: 12, marginTop: 2, marginBottom: 3 },
  post: {
    padding: 18,
    backgroundColor: colors.card,
    borderRadius: 18,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  sponsored: { borderColor: colors.star },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  type: { fontSize: 11, color: colors.primary, fontWeight: '700', textTransform: 'uppercase' },
  sponsoredLabel: {
    fontSize: 10,
    color: '#8A641B',
    backgroundColor: '#FFF4CF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  date: { marginLeft: 'auto', fontSize: 11, color: colors.textMuted },
  business: { flexDirection: 'row', gap: 5, alignItems: 'center', marginTop: 8 },
  poster: {
    width: '100%',
    aspectRatio: 1.7,
    borderRadius: radius.md,
    marginTop: spacing.sm,
    backgroundColor: colors.border,
  },
  postBody: { fontSize: 15, color: colors.textPrimary, lineHeight: 23, marginTop: 12 },
  reply: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.md },
  postActions: { flexDirection: 'row', gap: 24, borderTopWidth: 1, marginTop: 16 },
  actionText: { fontSize: 12, fontWeight: '700' },
});
