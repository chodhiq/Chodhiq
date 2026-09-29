import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AppTextInput from '../components/AppTextInput';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Share,
} from 'react-native';

import Text from '../components/AppText';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell,
  Bookmark,
  Check,
  ChevronDown,
  ChevronRight,
  Flag,
  Heart,
  LayoutGrid,
  MapPin,
  MessageCircle,
  Plus,
  Send,
  Share2,
  Star,
  Store,
  ThumbsUp,
  X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import {
  cacheCommunityPosts,
  createLocalPost,
  enqueuePendingOperation,
  loadLocalPosts,
} from '../data/localDatabase';
import { supabase } from '../lib/supabase';
import { useAppState } from '../context/AppStateContext';
import { useChodhiQTheme } from '../context/ThemeContext';
import { categoryAssets, imageSource } from '../data/assetCatalog';
import { spacing, shadows } from '../theme/theme';
import { REGION_KEYS, REGION_LABELS, REGION_KEYWORDS } from '../components/RegionEmblem';

const POST_TYPES = [
  ['discussion', 'Discussion', MessageCircle],
  ['experience', 'Experience', Star],
  ['recommendation', 'Recommend', ThumbsUp],
  ['complaint', 'Complaint', Flag],
];
const TYPE_COLORS = {
  discussion: '#16A34A',
  experience: '#F59E0B',
  recommendation: '#3188C8',
  complaint: '#E97865',
};
const REGION_ART = {
  kerala: categoryAssets.travel,
  tamilnadu: categoryAssets.restaurants,
  karnataka: categoryAssets.property,
  andhratelangana: categoryAssets.photography,
};

export default function CommunityScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { session, profile, providers, unreadCount } = useAppState();
  const { palette } = useChodhiQTheme();
  const [posts, setPosts] = useState([]);
  const [body, setBody] = useState('');
  const [postType, setPostType] = useState('discussion');
  const [providerId, setProviderId] = useState(null);
  const [shareLocation, setShareLocation] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [feedTab, setFeedTab] = useState('Latest');
  const [categoryFilter, setCategoryFilter] = useState('All categories');
  const [categoryMenu, setCategoryMenu] = useState(false);
  const [providerSearch, setProviderSearch] = useState('');
  const [debouncedProviderSearch, setDebouncedProviderSearch] = useState('');
  const [providersExpanded, setProvidersExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [page, setPage] = useState(1);
  const [engagement, setEngagement] = useState({ counts: {}, saves: [] });
  const [commentsPost, setCommentsPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentBody, setCommentBody] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  const composerRef = useRef(null);

  const loadPosts = useCallback(async () => {
    try {
      if (supabase) {
        const [{ data, error }, countResult, saveResult] = await Promise.all([
          supabase
            .from('community_posts')
            .select(
              'id,author_id,provider_id,post_type,body,image_url,offer_expires_at,region_key,location_city,created_at,providers(id,business_name,is_verified,categories(name,slug))',
            )
            .eq('status', 'published')
            .order('created_at', { ascending: false })
            .range(0, page * 29),
          supabase.rpc('community_post_engagement'),
          session
            ? supabase
                .from('community_saved_posts')
                .select('post_id')
                .eq('user_id', session.user.id)
            : Promise.resolve({ data: [] }),
        ]);
        if (error) throw error;
        setLoadError('');
        setPosts(data || []);
        setEngagement({
          counts: Object.fromEntries((countResult.data || []).map((row) => [row.post_id, row])),
          saves: saveResult.data || [],
        });
        await cacheCommunityPosts(data || []);
      } else {
        setPosts(await loadLocalPosts(providers));
        setLoadError('');
      }
    } catch (error) {
      console.warn('Community sync failed; using the local cache.', error.message);
      setLoadError('Could not refresh the community feed. Showing saved posts if available.');
      try {
        setPosts(await loadLocalPosts(providers));
      } catch {
        setPosts([]);
      }
    } finally {
      setLoading(false);
    }
  }, [page, providers, session]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);
  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedProviderSearch(providerSearch.trim().toLowerCase()),
      250,
    );
    return () => clearTimeout(timer);
  }, [providerSearch]);

  const refresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  const matchingProviders = useMemo(() => {
    return providers.filter(
      (provider) =>
        !debouncedProviderSearch ||
        `${provider.name} ${provider.category} ${provider.baseCity || ''}`
          .toLowerCase()
          .includes(debouncedProviderSearch),
    );
  }, [debouncedProviderSearch, providers]);
  const providerOptions =
    providersExpanded || providerSearch
      ? matchingProviders.slice(0, 12)
      : matchingProviders.slice(0, 3);
  const categories = useMemo(
    () => [
      'All categories',
      ...new Set(
        posts
          .map((post) => POST_TYPES.find(([value]) => value === post.post_type)?.[1])
          .filter(Boolean),
      ),
    ],
    [posts],
  );
  const visiblePosts = useMemo(() => {
    let result = posts;
    if (selectedRegion)
      result = result.filter((post) =>
        post.region_key
          ? post.region_key === selectedRegion
          : REGION_KEYWORDS[selectedRegion].some((word) =>
              String(post.body || '')
                .toLowerCase()
                .includes(word),
            ),
      );
    if (categoryFilter !== 'All categories')
      result = result.filter(
        (post) => POST_TYPES.find(([value]) => value === post.post_type)?.[1] === categoryFilter,
      );
    if (feedTab === 'Recommended')
      result = [...result].sort((a, b) => scorePost(b, engagement) - scorePost(a, engagement));
    if (feedTab === 'Nearby')
      result = result.filter(
        (post) =>
          post.location_city &&
          profile?.location &&
          post.location_city.toLowerCase() === profile.location.toLowerCase(),
      );
    return result;
  }, [categoryFilter, engagement, feedTab, posts, profile?.location, selectedRegion]);

  const publish = async () => {
    if (!session) return navigation.navigate('Welcome');
    const safeBody = body.trim();
    if (safeBody.length < 2 || safeBody.length > 2000)
      return Alert.alert('Check your post', 'Write between 2 and 2,000 characters.');
    if (publishing) return;
    setPublishing(true);
    const payload = {
      author_id: session.user.id,
      provider_id: providerId,
      post_type: postType,
      body: safeBody,
      region_key: selectedRegion,
      location_city: shareLocation ? profile?.location || null : null,
    };
    try {
      if (!supabase) {
        const local = await createLocalPost(session.user.id, {
          providerId,
          postType,
          body: safeBody,
          regionKey: selectedRegion,
          locationCity: shareLocation ? profile?.location : null,
        });
        await enqueuePendingOperation('community_post', { remote: payload, localId: local.id });
      } else {
        const { error } = await supabase.from('community_posts').insert(payload);
        if (error) throw error;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setBody('');
      setProviderId(null);
      setPostType('discussion');
      setPage(1);
      await loadPosts();
    } catch (error) {
      Alert.alert('Could not publish', error.message || 'Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  const toggleLike = async (post) => {
    if (!session) return navigation.navigate('Welcome');
    if (!supabase)
      return Alert.alert('Likes unavailable', 'Connect to the community service to like posts.');
    const counts = engagement.counts[post.id] || {
      like_count: 0,
      comment_count: 0,
      is_liked: false,
    };
    const liked = counts.is_liked;
    setEngagement((current) => ({
      ...current,
      counts: {
        ...current.counts,
        [post.id]: {
          ...counts,
          like_count: Math.max(0, Number(counts.like_count) + (liked ? -1 : 1)),
          is_liked: !liked,
        },
      },
    }));
    try {
      const result = liked
        ? await supabase
            .from('community_post_likes')
            .delete()
            .eq('post_id', post.id)
            .eq('user_id', session.user.id)
        : await supabase
            .from('community_post_likes')
            .insert({ post_id: post.id, user_id: session.user.id });
      if (result.error) throw result.error;
    } catch {
      await loadPosts();
      Alert.alert('Could not update like', 'Please try again.');
    }
  };

  const toggleSave = async (post) => {
    if (!session) return navigation.navigate('Welcome');
    if (!supabase)
      return Alert.alert('Saves unavailable', 'Connect to the community service to save posts.');
    const saved = engagement.saves.some((row) => row.post_id === post.id);
    setEngagement((current) => ({
      ...current,
      saves: saved
        ? current.saves.filter((row) => row.post_id !== post.id)
        : [...current.saves, { post_id: post.id }],
    }));
    try {
      const result = saved
        ? await supabase
            .from('community_saved_posts')
            .delete()
            .eq('post_id', post.id)
            .eq('user_id', session.user.id)
        : await supabase
            .from('community_saved_posts')
            .insert({ post_id: post.id, user_id: session.user.id });
      if (result.error) throw result.error;
    } catch {
      await loadPosts();
      Alert.alert('Could not save post', 'Please try again.');
    }
  };

  const openComments = async (post) => {
    setCommentsPost(post);
    setComments([]);
    if (!supabase)
      return Alert.alert(
        'Comments unavailable',
        'Connect to the community service to read comments.',
      );
    if (supabase) {
      const { data, error } = await supabase
        .from('community_comments')
        .select('id,author_id,body,created_at')
        .eq('post_id', post.id)
        .order('created_at')
        .limit(100);
      if (error) Alert.alert('Comments unavailable', error.message);
      else setComments(data || []);
    }
  };
  const submitComment = async () => {
    if (!session) return navigation.navigate('Welcome');
    if (!supabase)
      return Alert.alert('Comments unavailable', 'Connect to the community service to comment.');
    if (commentBody.trim().length < 1 || commentBody.trim().length > 1000) return;
    setCommentBusy(true);
    const { data, error } = await supabase
      .from('community_comments')
      .insert({ post_id: commentsPost.id, author_id: session.user.id, body: commentBody.trim() })
      .select('id,author_id,body,created_at')
      .single();
    setCommentBusy(false);
    if (error) return Alert.alert('Could not comment', error.message);
    setComments((current) => [...current, data]);
    setCommentBody('');
    loadPosts();
  };

  const selectedProvider = providers.find((provider) => provider.id === providerId);
  const jumpToComposer = () => composerRef.current?.focus();

  return (
    <SafeAreaView style={[styles.page, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.primary} />
        }
        contentContainerStyle={[styles.content, { paddingBottom: 76 + insets.bottom }]}
      >
        <View style={[styles.topBar, { backgroundColor: palette.dark ? palette.bg : '#101817' }]}>
          <Image
            source={require('../../assets/chodhiq-official-logo.png')}
            resizeMode="contain"
            accessibilityLabel="ChodhiQ"
            style={styles.brandLogo}
          />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            onPress={() => navigation.navigate('Notifications')}
            style={styles.bell}
          >
            <Bell size={22} color="#FFFFFF" />
            {unreadCount > 0 && <View style={styles.bellDot} />}
          </TouchableOpacity>
        </View>
        <ImageBackground
          source={require('../../assets/generated/onboarding-london.webp')}
          resizeMode="cover"
          imageStyle={styles.heroImage}
          style={styles.hero}
        >
          <View style={styles.heroShade} />
          <Text style={[styles.heroEyebrow, { color: palette.saffron }]}>OUR SHARED SPACE</Text>
          <Text style={styles.heroTitle}>Community</Text>
          <Text style={styles.heroSubtitle}>
            Ask, recommend and share genuine experiences. Customer posts are always free and
            text-only.
          </Text>
          <TouchableOpacity
            onPress={jumpToComposer}
            style={[styles.heroButton, { backgroundColor: palette.primary }]}
          >
            <Plus size={21} color="#FFFFFF" />
            <Text style={styles.heroButtonText}>Create post</Text>
          </TouchableOpacity>
        </ImageBackground>

        <View style={styles.regionHeader}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Explore by region</Text>
          <TouchableOpacity onPress={() => setSelectedRegion(null)}>
            <Text style={{ color: palette.primary, fontWeight: '800' }}>See all ›</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.regionRow}
        >
          <RegionCard
            label="All"
            selected={!selectedRegion}
            image={categoryAssets.travel}
            palette={palette}
            onPress={() => setSelectedRegion(null)}
          />
          {REGION_KEYS.map((region) => (
            <RegionCard
              key={region}
              label={REGION_LABELS[region]}
              selected={selectedRegion === region}
              image={REGION_ART[region]}
              palette={palette}
              onPress={() => setSelectedRegion((current) => (current === region ? null : region))}
            />
          ))}
          <RegionCard
            label="Other Regions"
            selected={false}
            image={categoryAssets.grocery}
            palette={palette}
            onPress={() => setSelectedRegion(null)}
          />
        </ScrollView>

        <View
          style={[
            styles.composer,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <View style={styles.composerTop}>
            <View style={[styles.avatar, { backgroundColor: palette.primarySoft }]}>
              <Text style={{ color: palette.primary, fontSize: 18, fontWeight: '900' }}>
                {profile?.name?.trim()?.[0]?.toUpperCase() || 'S'}
              </Text>
            </View>
            <AppTextInput
              ref={composerRef}
              value={body}
              onChangeText={setBody}
              multiline
              maxLength={2000}
              placeholder="What's happening in your community?"
              placeholderTextColor={palette.muted}
              style={[
                styles.bodyInput,
                {
                  color: palette.text,
                  backgroundColor: palette.surfaceAlt,
                  borderColor: palette.border,
                },
              ]}
            />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.typeRow}
          >
            {POST_TYPES.map(([value, label, Icon]) => {
              const active = postType === value;
              return (
                <TouchableOpacity
                  key={value}
                  onPress={() => setPostType(value)}
                  style={[
                    styles.typePill,
                    { backgroundColor: active ? palette.primary : palette.surfaceAlt },
                  ]}
                >
                  <Icon size={16} color={active ? '#FFFFFF' : palette.text2} />
                  <Text
                    style={{
                      color: active ? '#FFFFFF' : palette.text2,
                      fontSize: 12,
                      fontWeight: '700',
                    }}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity
            onPress={() => setShareLocation((value) => !value)}
            style={styles.locationConsent}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: shareLocation }}
          >
            <MapPin size={15} color={shareLocation ? palette.primary : palette.muted} />
            <Text style={{ color: palette.text2, fontSize: 11, flex: 1 }}>
              {shareLocation
                ? `Sharing area: ${profile?.location || 'your area'}`
                : 'Add your area to Nearby feed (optional)'}
            </Text>
            <Text style={{ color: palette.primary, fontWeight: '800', fontSize: 11 }}>
              {shareLocation ? 'Added' : 'Add'}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.providerLabel, { color: palette.text }]}>
            Mention a provider (optional)
          </Text>
          <View
            style={[
              styles.providerSearch,
              { backgroundColor: palette.surfaceAlt, borderColor: palette.border },
            ]}
          >
            <Store size={17} color={palette.muted} />
            <AppTextInput
              value={providerSearch}
              onChangeText={setProviderSearch}
              placeholder="Search for a business..."
              placeholderTextColor={palette.muted}
              style={[styles.providerSearchInput, { color: palette.text }]}
            />
          </View>
          <View style={styles.providerOptions}>
            {providerOptions.map((provider) => (
              <ProviderOption
                key={provider.id}
                provider={provider}
                selected={providerId === provider.id}
                palette={palette}
                onPress={() =>
                  setProviderId((current) => (current === provider.id ? null : provider.id))
                }
              />
            ))}
            {!providerSearch && matchingProviders.length > 3 && (
              <TouchableOpacity
                onPress={() => setProvidersExpanded((value) => !value)}
                style={[styles.moreProvider, { borderColor: palette.border }]}
              >
                <LayoutGrid size={16} color={palette.muted} />
                <Text style={{ color: palette.text2, fontWeight: '700', fontSize: 12 }}>
                  {providersExpanded ? 'Less' : 'More'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {selectedProvider && (
            <Text style={{ color: palette.primary, fontSize: 11, marginTop: 4 }}>
              Mentioning {selectedProvider.name}
            </Text>
          )}
          <TouchableOpacity
            disabled={publishing}
            onPress={publish}
            style={[
              styles.publish,
              { backgroundColor: palette.primary, opacity: publishing ? 0.6 : 1 },
            ]}
          >
            {publishing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Send size={18} color="#FFFFFF" />
                <Text style={styles.publishText}>
                  {session ? 'Publish free' : 'Sign in to publish'}
                </Text>
              </>
            )}
          </TouchableOpacity>
          <Text
            style={[
              styles.charCount,
              { color: body.length > 1900 ? palette.coral : palette.muted },
            ]}
          >
            {body.length}/2000
          </Text>
        </View>

        <View style={styles.feedHeader}>
          <View style={styles.feedTabs}>
            {['Latest', 'Recommended', 'Nearby'].map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setFeedTab(tab)}
                style={[
                  styles.feedTab,
                  feedTab === tab && { borderBottomColor: palette.primary, borderBottomWidth: 2 },
                ]}
              >
                <Text
                  style={{
                    color: feedTab === tab ? palette.text : palette.text2,
                    fontWeight: feedTab === tab ? '800' : '600',
                  }}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            onPress={() => setCategoryMenu(true)}
            style={[
              styles.filterButton,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <Text
              numberOfLines={1}
              style={{ color: palette.text, fontSize: 11, fontWeight: '700' }}
            >
              {categoryFilter}
            </Text>
            <ChevronDown size={15} color={palette.text2} />
          </TouchableOpacity>
        </View>
        {loading ? <ActivityIndicator style={{ padding: 30 }} color={palette.primary} /> : null}
        {!!loadError && (
          <TouchableOpacity onPress={refresh} style={{ marginHorizontal: 18, padding: 10 }}>
            <Text style={{ color: palette.coral, fontSize: 12 }}>{loadError} Tap to retry.</Text>
          </TouchableOpacity>
        )}
        {!loading && visiblePosts.length === 0 && (
          <View
            style={[
              styles.empty,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <MessageCircle size={28} color={palette.muted} />
            <Text style={[styles.emptyText, { color: palette.text2 }]}>
              {feedTab === 'Nearby'
                ? 'Nearby posts need location-tagged community content.'
                : selectedRegion
                  ? `No posts for ${REGION_LABELS[selectedRegion]} yet.`
                  : categoryFilter !== 'All categories'
                    ? 'No posts in this category yet.'
                    : 'No community posts yet. Start the conversation.'}
            </Text>
            <TouchableOpacity
              onPress={jumpToComposer}
              style={[styles.emptyButton, { backgroundColor: palette.primary }]}
            >
              <Plus size={16} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Create post</Text>
            </TouchableOpacity>
          </View>
        )}
        {visiblePosts.map((post) => (
          <CommunityPostCard
            key={post.id}
            post={post}
            palette={palette}
            providers={providers}
            session={session}
            engagement={engagement}
            onLike={() => toggleLike(post)}
            onComment={() => openComments(post)}
            onSave={() => toggleSave(post)}
            onShare={() => sharePost(post)}
            onProvider={() =>
              post.provider_id && navigation.navigate('ProviderDetail', { id: post.provider_id })
            }
          />
        ))}
        {posts.length >= page * 30 && (
          <TouchableOpacity
            onPress={() => setPage((current) => current + 1)}
            style={[styles.loadMore, { borderColor: palette.border }]}
          >
            <Text style={{ color: palette.primary, fontWeight: '800' }}>Load more</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal
        visible={categoryMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryMenu(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setCategoryMenu(false)}
          style={styles.modalBackdrop}
        >
          <View style={[styles.categoryMenu, { backgroundColor: palette.surface }]}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                onPress={() => {
                  setCategoryFilter(category);
                  setCategoryMenu(false);
                }}
                style={styles.menuItem}
              >
                <Text style={{ color: palette.text }}>{category}</Text>
                {categoryFilter === category && <Check size={17} color={palette.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
      <Modal
        visible={!!commentsPost}
        transparent
        animationType="slide"
        onRequestClose={() => setCommentsPost(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.commentsSheet, { backgroundColor: palette.surface }]}>
            <View style={styles.commentHeading}>
              <Text style={{ color: palette.text, fontSize: 18, fontWeight: '800' }}>Comments</Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close comments"
                onPress={() => setCommentsPost(null)}
              >
                <X size={22} color={palette.text2} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 350 }}>
              {comments.map((item) => (
                <View
                  key={item.id}
                  style={[styles.commentRow, { borderBottomColor: palette.border }]}
                >
                  <Text style={{ color: palette.text, fontSize: 13 }}>{item.body}</Text>
                  <Text style={{ color: palette.muted, fontSize: 10, marginTop: 3 }}>
                    {relativeDate(item.created_at)}
                  </Text>
                </View>
              ))}
            </ScrollView>
            <View style={styles.commentComposer}>
              <AppTextInput
                value={commentBody}
                onChangeText={setCommentBody}
                maxLength={1000}
                placeholder="Write a comment..."
                placeholderTextColor={palette.muted}
                style={[
                  styles.commentInput,
                  { backgroundColor: palette.surfaceAlt, color: palette.text },
                ]}
              />
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Send comment"
                disabled={commentBusy || !commentBody.trim()}
                onPress={submitComment}
                style={[styles.commentSend, { backgroundColor: palette.primary }]}
              >
                {commentBusy ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Send size={17} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ProviderOption({ provider, selected, palette, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.providerOption, selected && { borderColor: palette.primary }]}
    >
      {provider.image ? (
        <Image source={imageSource(provider.image)} style={styles.providerImage} />
      ) : (
        <View
          style={[
            styles.providerImage,
            styles.providerPlaceholder,
            { backgroundColor: palette.primarySoft },
          ]}
        >
          <Store size={17} color={palette.primary} />
        </View>
      )}
      <View style={{ maxWidth: 110 }}>
        <Text numberOfLines={2} style={{ color: palette.text, fontSize: 11, fontWeight: '700' }}>
          {provider.name}
        </Text>
        {selected && (
          <Text style={{ color: palette.primary, fontSize: 9, fontWeight: '800' }}>Selected</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function RegionCard({ label, selected, image, palette, onPress }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Filter community posts: ${label}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.regionCard, selected && { borderColor: palette.primary, borderWidth: 2 }]}
    >
      <ImageBackground source={image} style={styles.regionImage} imageStyle={styles.regionRadius}>
        <View style={styles.regionShade} />
        {label === 'All' && <MapPin size={25} color="#FFFFFF" />}
        <Text numberOfLines={2} style={styles.regionLabel}>
          {label}
        </Text>
      </ImageBackground>
    </TouchableOpacity>
  );
}

function CommunityPostCard({
  post,
  palette,
  providers,
  session,
  engagement,
  onLike,
  onComment,
  onSave,
  onShare,
  onProvider,
}) {
  const provider = post.providers || providers.find((item) => item.id === post.provider_id);
  const type = POST_TYPES.find(([value]) => value === post.post_type);
  const TypeIcon = type?.[2];
  const counts = engagement.counts[post.id] || {};
  const likes = Number(counts.like_count || 0);
  const liked = session && counts.is_liked;
  const saved = engagement.saves.some((item) => item.post_id === post.id);
  const commentCount = Number(counts.comment_count || 0);
  const name = post.author_id === session?.user?.id ? 'You' : 'Community member';
  return (
    <View
      style={[styles.postCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
    >
      <View style={styles.postHead}>
        <View style={[styles.authorAvatar, { backgroundColor: palette.primarySoft }]}>
          <Text style={{ color: palette.primary, fontWeight: '900' }}>
            {name === 'You' ? 'Y' : 'C'}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.authorName, { color: palette.text }]}>{name}</Text>
          <Text style={[styles.postMeta, { color: palette.muted }]}>
            {relativeDate(post.created_at)}
            {post.region_key ? `  ·  ${REGION_LABELS[post.region_key]}` : ''}
          </Text>
        </View>
        <TouchableOpacity
          accessibilityLabel="Post options"
          onPress={() =>
            Alert.alert(
              'Post options',
              'Post reporting and moderation controls are not available here yet.',
            )
          }
        >
          <Text style={{ color: palette.text2, fontSize: 21 }}>···</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.postBody, { color: palette.text }]}>{post.body}</Text>
      {type && TypeIcon && (
        <View
          style={[styles.postTypeBadge, { backgroundColor: `${TYPE_COLORS[post.post_type]}18` }]}
        >
          <TypeIcon size={14} color={TYPE_COLORS[post.post_type]} />
          <Text style={{ color: TYPE_COLORS[post.post_type], fontSize: 11, fontWeight: '700' }}>
            {type[1]}
          </Text>
        </View>
      )}
      {provider && (
        <TouchableOpacity
          onPress={onProvider}
          style={[styles.mentionedProvider, { backgroundColor: palette.surfaceAlt }]}
        >
          <Store size={14} color={palette.primary} />
          <Text style={{ color: palette.primary, fontSize: 12, fontWeight: '800' }}>
            {provider.business_name || provider.name}
          </Text>
          {provider.is_verified && <Check size={14} color={palette.primary} />}
          {provider.categories?.name && (
            <Text style={{ color: palette.text2, fontSize: 10 }}>{provider.categories.name}</Text>
          )}
        </TouchableOpacity>
      )}
      <View style={[styles.postActions, { borderTopColor: palette.border }]}>
        <TouchableOpacity onPress={onLike} style={styles.action}>
          <Heart
            size={18}
            color={liked ? palette.danger : palette.text2}
            fill={liked ? palette.danger : 'transparent'}
          />
          <Text style={{ color: palette.text2, fontSize: 12 }}>{likes}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onComment} style={styles.action}>
          <MessageCircle size={18} color={palette.text2} />
          <Text style={{ color: palette.text2, fontSize: 12 }}>{commentCount}</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Remove saved post' : 'Save post'}
          onPress={onSave}
          style={styles.action}
        >
          <Bookmark
            size={18}
            color={saved ? palette.primary : palette.text2}
            fill={saved ? palette.primary : 'transparent'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Share post"
          onPress={onShare}
          style={styles.action}
        >
          <Share2 size={18} color={palette.text2} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function scorePost(post, engagement) {
  const counts = engagement.counts[post.id] || {};
  return Number(counts.like_count || 0) * 2 + Number(counts.comment_count || 0);
}
function relativeDate(value) {
  if (!value) return '';
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const day = Math.floor(elapsed / 86400000);
  if (day < 1) return 'Today';
  if (day === 1) return '1 day ago';
  if (day < 30) return `${day} days ago`;
  return new Date(value).toLocaleDateString();
}
function sharePost(post) {
  Share.share({ message: post.body }).catch(() => {});
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { paddingBottom: 110, gap: 0 },
  topBar: {
    height: 70,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandLogo: { width: 130, height: 43 },
  brand: { color: '#FFFFFF', fontSize: 27, letterSpacing: -1.2, fontWeight: '900' },
  bell: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  bellDot: {
    position: 'absolute',
    right: 5,
    top: 5,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  hero: {
    marginHorizontal: 18,
    marginTop: 14,
    minHeight: 230,
    borderRadius: 22,
    padding: 22,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroImage: { borderRadius: 22 },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(3,18,17,.62)' },
  heroEyebrow: { fontSize: 11, letterSpacing: 1.4, fontWeight: '900' },
  heroTitle: { color: '#FFFFFF', fontSize: 36, lineHeight: 42, fontWeight: '900', marginTop: 4 },
  heroSubtitle: { color: '#FFFFFF', fontSize: 14, lineHeight: 20, maxWidth: 330, marginTop: 6 },
  heroButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    borderRadius: 28,
    paddingVertical: 11,
    paddingHorizontal: 17,
    marginTop: 14,
  },
  heroButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  regionHeader: {
    marginHorizontal: 24,
    marginTop: 25,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: { fontSize: 18, fontWeight: '900' },
  regionRow: { paddingHorizontal: 22, gap: 10, paddingBottom: 6 },
  regionCard: {
    width: 106,
    height: 105,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  regionImage: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', padding: 7 },
  regionRadius: { borderRadius: 15 },
  regionShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,.25)' },
  regionLabel: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '900',
    textShadowColor: '#000',
    textShadowRadius: 3,
  },
  composer: {
    marginHorizontal: 18,
    marginTop: 20,
    padding: 14,
    borderRadius: 22,
    borderWidth: 1,
    ...shadows.lift,
  },
  composerTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyInput: {
    flex: 1,
    minHeight: 52,
    maxHeight: 125,
    borderWidth: 1,
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  typeRow: { gap: 7, paddingVertical: 13, paddingRight: 2 },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 24,
  },
  locationConsent: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 8 },
  providerLabel: { fontSize: 12, fontWeight: '800', marginBottom: 7 },
  providerSearch: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 24,
  },
  providerSearchInput: { flex: 1, minHeight: 40, fontSize: 13 },
  providerOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
  },
  providerOption: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    padding: 4,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 12,
  },
  providerImage: { width: 43, height: 43, borderRadius: 10 },
  providerPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  moreProvider: {
    height: 43,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  publish: {
    minHeight: 54,
    marginTop: 8,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  publishText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  charCount: { alignSelf: 'flex-end', fontSize: 10, marginTop: 5 },
  feedHeader: {
    marginHorizontal: 18,
    marginTop: 22,
    marginBottom: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  feedTabs: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginRight: 8,
  },
  feedTab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomColor: 'transparent' },
  filterButton: {
    maxWidth: 142,
    flexShrink: 1,
    minHeight: 38,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  postCard: {
    marginHorizontal: 18,
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 20,
    padding: 15,
    ...shadows.soft,
  },
  postHead: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  authorAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorName: { fontSize: 14, fontWeight: '900' },
  postMeta: { fontSize: 11, marginTop: 2 },
  postBody: { fontSize: 14, lineHeight: 21, marginTop: 10 },
  postTypeBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 18,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginTop: 9,
  },
  mentionedProvider: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    borderRadius: 12,
    padding: 8,
    marginTop: 9,
  },
  postActions: {
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 28, minHeight: 30 },
  empty: {
    margin: 18,
    padding: 24,
    alignItems: 'center',
    gap: 9,
    borderRadius: 18,
    borderWidth: 1,
  },
  emptyText: { textAlign: 'center', fontSize: 13 },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    marginTop: 5,
  },
  loadMore: { margin: 18, alignItems: 'center', borderWidth: 1, borderRadius: 18, padding: 13 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.4)' },
  categoryMenu: { margin: 18, padding: 8, borderRadius: 17 },
  menuItem: {
    minHeight: 45,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  commentsSheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 18,
    paddingBottom: 34,
  },
  commentHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  commentRow: { paddingVertical: 10, borderBottomWidth: 1 },
  commentComposer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  commentInput: { flex: 1, minHeight: 44, borderRadius: 22, paddingHorizontal: 14 },
  commentSend: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
