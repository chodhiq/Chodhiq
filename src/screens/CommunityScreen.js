import ScrollView from '../components/KeyboardAwareScrollView';
import { AppAlert as Alert } from '../components/AppDialog';
import useLiveCallback from '../hooks/useLiveCallback';
import { MotionModal as Modal } from '../components/Motion';
import { MotionTouchable as TouchableOpacity } from '../components/Motion';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MelaInput as AppTextInput } from '../components/community/MelaText';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  RefreshControl,
  StyleSheet,
  View,
  Share,
} from 'react-native';

import Text from '../components/community/MelaText';
import CommunityPostCard from '../components/community/PostCard';
import EmptySpace from '../components/community/EmptySpace';
import SpaceTray from '../components/community/SpaceTray';
import { isNewMember } from '../components/community/melaFeedUtils';
import { melaHeadingFont } from '../theme/mela';
import GlassView from '../components/GlassView';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell,
  Check,
  ChevronDown,
  Clock3,
  Flag,
  LayoutGrid,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  ThumbsUp,
  X,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { showPermissionRecovery } from '../lib/permissionRecovery';
import { updateLocalPost } from '../data/localDatabase';
import { formatDate } from '../lib/dateTime';
import { supabase } from '../lib/supabase';
import { useAppState } from '../context/AppStateContext';
import { useChodhiQTheme } from '../context/ThemeContext';
import { imageSource } from '../data/assetCatalog';
import { LinearGradient } from 'expo-linear-gradient';
import { devicePerformance } from '../lib/devicePerformance';
import { shadows } from '../theme/theme';
import { REGION_KEYWORDS } from '../components/RegionEmblem';
import useEffectsLevel from '../hooks/useEffectsLevel';
import useCommunityFeed from '../hooks/useCommunityFeed';
import GlowButton from '../../components/ui/GlowButton';

const POST_TYPES = [
  ['discussion', 'Discussion', MessageCircle],
  ['experience', 'Experience', Star],
  ['recommendation', 'Recommend', ThumbsUp],
  ['complaint', 'Complaint', Flag],
];
const EMPTY_COUNTS = {};
const CommunityPostRow = React.memo(function CommunityPostRow({
  post,
  palette,
  provider,
  session,
  counts,
  saved,
  canBlock,
  newHere,
  like,
  comment,
  save,
  share,
  report,
  edit,
  block,
  openProvider,
  openAuthor,
  transitionKey,
  index,
  visible,
}) {
  const effectsLevel = useEffectsLevel();
  const reducedMotion = effectsLevel !== 'full';
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  useEffect(() => {
    if (reducedMotion) {
      opacity.setValue(1);
      translateY.setValue(0);
      return undefined;
    }
    opacity.setValue(0);
    translateY.setValue(24);
    const delay = Math.min(index * 32, 160);
    const animation = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 260,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay,
        stiffness: 125,
        damping: 17,
        mass: 0.8,
        useNativeDriver: true,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [transitionKey, index, reducedMotion, opacity, translateY]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <CommunityPostCard
        post={post}
        palette={palette}
        providers={provider ? [provider] : []}
        session={session}
        engagement={{ counts: { [post.id]: counts }, saves: saved ? [{ post_id: post.id }] : [] }}
        onLike={() => like(post)}
        onComment={() => comment(post)}
        onSave={() => save(post)}
        onShare={() => share(post)}
        onReport={post.author_id === session?.user?.id ? undefined : () => report(post)}
        onEdit={post.author_id === session?.user?.id ? () => edit(post) : undefined}
        onBlock={canBlock ? () => block(post.author_id) : undefined}
        onAuthor={() => openAuthor(post)}
        onProvider={() => openProvider(post)}
        newHere={newHere}
        visible={visible}
      />
    </Animated.View>
  );
});

function FeedTabButton({ tab, Icon, active, palette, onPress }) {
  const effectsLevel = useEffectsLevel();
  const reducedMotion = effectsLevel !== 'full';
  const selectionProgress = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    const animation = Animated.spring(selectionProgress, {
      toValue: active ? 1 : 0,
      stiffness: 210,
      damping: 19,
      mass: 0.7,
      isInteraction: false,
      useNativeDriver: true,
    });
    if (reducedMotion) selectionProgress.setValue(active ? 1 : 0);
    else animation.start();
    return () => animation.stop();
  }, [active, reducedMotion, selectionProgress]);

  return (
    <TouchableOpacity
      testID="btn-open-composer"
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={styles.feedTab}
    >
      <Animated.View
        style={[
          styles.feedTabContent,
          {
            transform: [
              {
                scale: selectionProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.96, 1],
                }),
              },
            ],
            opacity: selectionProgress.interpolate({
              inputRange: [0, 1],
              outputRange: [0.72, 1],
            }),
          },
        ]}
      >
        <Icon size={14} color={active ? palette.actionText : palette.text2} />
        <Text
          style={{
            color: active ? palette.actionText : palette.text2,
            fontWeight: active ? '800' : '600',
          }}
        >
          {tab === 'Recommended' ? 'For you' : tab}
        </Text>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.feedTabAccent,
          {
            backgroundColor: palette.primary,
            opacity: selectionProgress,
            transform: [
              {
                scaleX: selectionProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.35, 1],
                }),
              },
            ],
          },
        ]}
      />
    </TouchableOpacity>
  );
}

export default function CommunityScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { session, profile, providers, unreadCount } = useAppState();
  const { communityPalette: palette } = useChodhiQTheme();
  const [spaces, setSpaces] = useState([{ id: null, slug: 'general', name: 'General' }]);
  const [selectedSpace, setSelectedSpace] = useState('general');
  const [communityReady, setCommunityReady] = useState(false);
  const [commentsPost, setCommentsPost] = useState(null);
  const activeSpace = spaces.find((space) => space.slug === selectedSpace) || spaces[0];
  const feed = useCommunityFeed({
    activeSpace,
    communityReady,
    generalSpaceId: spaces[0]?.id,
    session,
    providers,
    navigation,
    onUserBlocked: (userId) =>
      setCommentsPost((current) => (current?.author_id === userId ? null : current)),
  });
  const {
    posts,
    generalPosts,
    loading,
    refreshing,
    error: loadError,
    hasMore,
    refresh,
    loadMore,
    publishPost,
    toggleLike: updateLike,
    toggleSave: updateSave,
    addComment,
    loadComments,
    reportPost: submitReport,
    blockUser,
    setPage,
    engagement,
    savedPostIds,
    comments,
    commentsLoading,
    commentAuthors,
    commentBusy,
  } = feed;

  useEffect(() => {
    let cancelled = false;
    setSelectedSpace('general');
    setCommunityReady(false);
    setSpaces([{ id: null, slug: 'general', name: 'General' }]);
    if (!supabase) return;
    Promise.all([
      supabase
        .from('community_spaces')
        .select('id,slug,name')
        .eq('slug', 'general')
        .eq('status', 'active')
        .maybeSingle(),
      session
        ? supabase
            .from('community_memberships')
            .select('community_spaces(id,slug,name,status)')
            .eq('user_id', session.user.id)
        : Promise.resolve({ data: [] }),
    ])
      .then(([general, memberships]) => {
        if (cancelled || general.error || !general.data) return;
        setCommunityReady(true);
        const joined = memberships.error
          ? []
          : (memberships.data || [])
              .map((row) => row.community_spaces)
              .filter((space) => space && space.status === 'active' && space.slug !== 'general');
        setSpaces([general.data, ...joined]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);
  useEffect(() => {
    if (!route?.params?.postId || !communityReady || !supabase) return;
    let cancelled = false;
    supabase
      .from('community_posts')
      .select('community_id')
      .eq('id', route.params.postId)
      .eq('status', 'published')
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        const destination = spaces.find((space) => space.id === data.community_id);
        if (destination) {
          setSelectedSpace(destination.slug);
          setPage(1);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [route?.params?.postId, communityReady, spaces]);
  const [body, setBody] = useState('');
  const [postImage, setPostImage] = useState(null);
  const [choosingImage, setChoosingImage] = useState(false);
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
  const [publishing, setPublishing] = useState(false);
  const [commentBody, setCommentBody] = useState('');
  const [reportingPostId, setReportingPostId] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const composerRef = useRef(null);

  const [composeOpen, setComposeOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState(null);
  const [postOptionsOpen, setPostOptionsOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedProviderSearch(providerSearch.trim().toLowerCase()),
      250,
    );
    return () => clearTimeout(timer);
  }, [providerSearch]);

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
    if (communityReady && activeSpace?.id) {
      result = result.filter(
        (post) =>
          post.community_id === activeSpace.id ||
          (activeSpace.slug === 'general' && !post.community_id),
      );
    }
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
  }, [
    activeSpace,
    categoryFilter,
    communityReady,
    engagement,
    feedTab,
    posts,
    profile?.location,
    selectedRegion,
  ]);

  const choosePostImage = async () => {
    if (!session) return navigation.navigate('Welcome');
    if (choosingImage || publishing) return;
    setChoosingImage(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showPermissionRecovery(
          'Photo access needed',
          'Allow photo access to attach an image to your post.',
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]) setPostImage(result.assets[0]);
    } catch (error) {
      Alert.alert('Could not choose photo', error.message || 'Please try again.');
    } finally {
      setChoosingImage(false);
    }
  };

  const publish = async () => {
    if (!session) return navigation.navigate('Welcome');
    const safeBody = body.trim();
    if (safeBody.length < 2 || safeBody.length > 2000)
      return Alert.alert('Check your post', 'Write between 2 and 2,000 characters.');
    if (publishing || choosingImage) return;
    if (postImage && !supabase)
      return Alert.alert(
        'Connection needed',
        'Connect to publish a post with a photo. Your draft is saved here.',
      );
    setPublishing(true);
    try {
      if (editingPostId) {
        if (String(editingPostId).startsWith('post-')) {
          const updated = await updateLocalPost(editingPostId, safeBody);
          if (!updated) throw new Error('This post is no longer available to edit.');
        } else {
          if (!supabase) throw new Error('Connect to the internet to edit this post.');
          const { data, error } = await supabase
            .from('community_posts')
            .update({ body: safeBody })
            .eq('id', editingPostId)
            .eq('author_id', session.user.id)
            .eq('status', 'published')
            .select('id')
            .maybeSingle();
          if (error) throw error;
          if (!data) throw new Error('This post can no longer be edited.');
        }
        setComposeOpen(false);
        setEditingPostId(null);
        setBody('');
        setPostOptionsOpen(false);
        setPage(1);
        await refresh();
        return;
      }
      await publishPost({
        text: safeBody,
        imageUri: postImage,
        category: postType,
        providerId,
        regionKey: selectedRegion,
        locationCity: shareLocation ? profile?.location || null : null,
      });

      setComposeOpen(false);
      setBody('');
      setPostImage(null);
      setProviderId(null);
      setPostType('discussion');
    } catch (error) {
      Alert.alert('Could not publish', error.message || 'Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  const openComments = async (post) => {
    setCommentsPost(post);
    try {
      await loadComments(post.id);
    } catch (error) {
      Alert.alert(
        'Comments unavailable',
        error?.message || 'Please check your connection and try again.',
      );
    }
  };
  const submitComment = async () => {
    if (commentBusy || !commentsPost) return;
    if (!session) return navigation.navigate('Welcome');
    if (!supabase)
      return Alert.alert('Comments unavailable', 'Connect to the community service to comment.');
    if (commentBody.trim().length < 1 || commentBody.trim().length > 1000) return;
    try {
      await addComment(commentsPost.id, commentBody.trim());
      setCommentBody('');
    } catch (error) {
      Alert.alert(
        'Could not comment',
        error.message || 'Please try again. Your draft is still here.',
      );
    }
  };

  const reportPost = async (post, reason, comment = null) => {
    if (!session) return navigation.navigate('Welcome');
    if (!supabase)
      return Alert.alert(
        'Reporting unavailable',
        'Connect to the community service to report a post.',
      );
    if (!reason) {
      try {
        await submitReport(post.id, null, comment);
      } catch (error) {
        if (error.message === 'You can report content shared by other members.')
          return Alert.alert('Your own content', error.message);
        return Alert.alert('Could not send report', error.message || 'Please try again.');
      }
      if (commentsPost) setCommentsPost(null);
      setReportTarget({ post, comment });
      return;
    }
    const targetId = comment?.id || post.id;
    if (reportingPostId === targetId) return;
    setReportingPostId(targetId);
    try {
      const result = await submitReport(post.id, reason, comment);
      if (result === 'queued') {
        Alert.alert("Report saved, will send when you're online");
      } else if (result === 'sent') {
        Alert.alert('Report sent', 'Thanks. Our moderation team will review this content.');
      }
    } catch (error) {
      if (error.message === 'You can report content shared by other members.')
        return Alert.alert('Your own content', error.message);
      if (error.message === 'Already reported.')
        return Alert.alert(
          'Already reported',
          'Our team has already received a report for this content.',
        );
      Alert.alert(
        'Could not send report',
        error.message || 'Your report was not sent. Check your connection and retry.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => reportPost(post, reason, comment) },
        ],
      );
    } finally {
      setReportingPostId(null);
    }
  };

  const selectedProvider = providers.find((provider) => provider.id === providerId);
  const jumpToComposer = () => {
    if (!session) return navigation.navigate('Welcome');
    setEditingPostId(null);
    setBody('');
    setComposeOpen(true);
  };
  const beginEditPost = useLiveCallback((post) => {
    if (!session || post.author_id !== session.user.id) return;
    if (post.post_type === 'promotion' || (post.status && post.status !== 'published')) return;
    setEditingPostId(post.id);
    setBody(post.body || '');
    setPostImage(null);
    setPostOptionsOpen(false);
    setComposeOpen(true);
  });
  useEffect(() => {
    if (route?.params?.compose && session) {
      setComposeOpen(true);
      navigation.setParams({ compose: undefined });
    }
  }, [route?.params?.compose, session, navigation]);

  const providersById = useMemo(
    () => new Map(providers.map((provider) => [provider.id, provider])),
    [providers],
  );
  const like = useLiveCallback((post) =>
    updateLike(post.id).catch(() => Alert.alert('Could not update like', 'Please try again.')),
  );
  const comment = useLiveCallback(openComments);
  const save = useLiveCallback((post) =>
    updateSave(post.id).catch(() => Alert.alert('Could not save post', 'Please try again.')),
  );
  const share = useLiveCallback(sharePost);
  const report = useLiveCallback(reportPost);
  const edit = useLiveCallback(beginEditPost);
  const block = useLiveCallback(blockUser);
  const blockAuthor = block;
  const openAuthor = useLiveCallback(
    (post) =>
      post.author_id && navigation.navigate('CommunityProfile', { authorId: post.author_id }),
  );
  const openProvider = useLiveCallback(
    (post) => post.provider_id && navigation.navigate('ProviderDetail', { id: post.provider_id }),
  );
  const feedTransitionKey = `${feedTab}:${categoryFilter}:${selectedRegion || ''}:${activeSpace?.slug || ''}`;
  const [visiblePostIds, setVisiblePostIds] = useState(() => new Set());
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 10 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    setVisiblePostIds(new Set(viewableItems.map(({ item }) => item.id)));
  }).current;
  const renderPost = useCallback(
    ({ item: post, index }) => (
      <CommunityPostRow
        post={post}
        index={index}
        visible={visiblePostIds.has(post.id)}
        transitionKey={feedTransitionKey}
        palette={palette}
        provider={providersById.get(post.provider_id)}
        session={session}
        counts={engagement.counts[post.id] || EMPTY_COUNTS}
        saved={savedPostIds.has(post.id)}
        canBlock={!!(communityReady && session && post.author_id !== session.user.id)}
        newHere={post.author_id === session?.user?.id && isNewMember(session?.user?.created_at)}
        like={like}
        comment={comment}
        save={save}
        share={share}
        report={report}
        edit={edit}
        block={block}
        openAuthor={openAuthor}
        openProvider={openProvider}
      />
    ),
    [
      feedTransitionKey,
      visiblePostIds,
      palette,
      providersById,
      session,
      engagement.counts,
      savedPostIds,
      communityReady,
      like,
      comment,
      save,
      share,
      report,
      edit,
      block,
      openProvider,
      openAuthor,
    ],
  );

  return (
    <SafeAreaView style={[styles.page, { backgroundColor: 'transparent' }]} edges={['top']}>
      <FlatList
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={palette.primary}
            colors={[palette.primary]}
          />
        }
        contentContainerStyle={[styles.content, { paddingBottom: 76 + insets.bottom }]}
        data={visiblePosts}
        keyExtractor={(post) => `${feedTransitionKey}:${post.id}`}
        renderItem={renderPost}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        initialNumToRender={devicePerformance.initialRows}
        maxToRenderPerBatch={devicePerformance.renderBatch}
        windowSize={devicePerformance.listWindow}
        removeClippedSubviews={false}
        keyboardDismissMode="none"
        ListHeaderComponent={
          <>
            <View style={styles.heroBlend}>
              <Image
                source={require('../../assets/hero/london-golden-hour-v2.webp')}
                resizeMode="cover"
                style={styles.heroBackdrop}
              />
              <LinearGradient
                pointerEvents="none"
                colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.58)', 'rgba(0,0,0,0)']}
                locations={[0, 0.44, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.heroTopGradient}
              />
              <LinearGradient
                pointerEvents="none"
                colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.12)', palette.background]}
                locations={[0, 0.46, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.heroBottomGradient}
              />
              <View style={styles.topBar}>
                <Image
                  source={require('../../assets/chodhiq-logo-white.png')}
                  resizeMode="contain"
                  accessibilityLabel="ChodhiQ"
                  style={styles.brandLogo}
                />
                <TouchableOpacity
                  testID="btn-open-composer"
                  accessibilityRole="button"
                  accessibilityLabel="Notifications"
                  onPress={() => navigation.navigate('Notifications')}
                  style={styles.heroNotification}
                >
                  <Bell size={20} color="#FFFFFF" />
                  {unreadCount > 0 && <View style={styles.bellDot} />}
                </TouchableOpacity>
              </View>
              <View style={styles.hero}>
                <View style={styles.heroCopy}>
                  <Text style={[styles.heroEyebrow, { color: palette.saffron }]}>
                    YOUR COMMUNITY · {activeSpace.name.toUpperCase()}
                  </Text>
                  <Text style={[styles.heroTitle, { fontFamily: melaHeadingFont }]}>Mela Feed</Text>
                  <Text numberOfLines={2} style={styles.heroSubtitle}>
                    Real conversations, recommendations and experiences from your community.
                  </Text>
                  <TouchableOpacity
                    testID="btn-close-composer"
                    accessibilityRole="button"
                    onPress={jumpToComposer}
                    style={[styles.heroButton, { backgroundColor: palette.primary }]}
                  >
                    <Plus size={18} color={palette.onPrimary} />
                    <Text style={[styles.heroButtonText, { color: palette.onPrimary }]}>
                      Create a post
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <SpaceTray
              spaces={spaces}
              selected={activeSpace.slug}
              palette={palette}
              onSelect={(slug) => {
                setPage(1);
                setSelectedSpace(slug);
              }}
            />
            <TouchableOpacity
              testID="btn-open-composer"
              accessibilityRole="button"
              accessibilityLabel="Create a community post"
              onPress={jumpToComposer}
              style={[
                styles.composer,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
              ]}
            >
              <View style={[styles.composerIcon, { backgroundColor: palette.primaryTint }]}>
                <Plus size={18} color={palette.actionText} />
              </View>
              <View style={styles.composerCopy}>
                <Text style={{ color: palette.text, fontSize: 13, fontWeight: '700' }}>
                  Start a conversation
                </Text>
                <Text style={{ color: palette.text2, fontSize: 11, marginTop: 3 }}>
                  Share with {activeSpace.name}
                </Text>
              </View>
              <View style={[styles.composerArrow, { backgroundColor: palette.primaryTint }]}>
                <MessageCircle size={18} color={palette.actionText} />
              </View>
            </TouchableOpacity>
            <View
              style={[
                styles.safetyNote,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ]}
            >
              <View
                accessible
                accessibilityLabel="Community safety"
                style={[styles.safetyIcon, { backgroundColor: palette.primaryTint }]}
              >
                <ShieldCheck size={17} color={palette.actionText} />
              </View>
              <View style={styles.safetyCopy}>
                <Text style={{ color: palette.text, fontWeight: '800', fontSize: 12 }}>
                  Keep this space safe
                </Text>
                <Text style={{ color: palette.text2, fontSize: 11, lineHeight: 16, marginTop: 3 }}>
                  Be respectful. Never share private details, send money to strangers, or share
                  verification codes. Report harmful or suspicious posts for review.
                </Text>
              </View>
            </View>
            <View style={styles.feedHeading}>
              <View style={styles.feedHeadingCopy}>
                <View style={[styles.feedHeadingIcon, { backgroundColor: palette.primaryTint }]}>
                  <MessageCircle size={17} color={palette.actionText} />
                </View>
                <View style={styles.feedHeadingText}>
                  <Text style={[styles.feedTitle, { color: palette.text }]}>Community feed</Text>
                  <Text style={[styles.feedSubtitle, { color: palette.text2 }]}>
                    Stories from people around you
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Filter community posts by category. Current category: ${categoryFilter}`}
                onPress={() => setCategoryMenu(true)}
                style={[
                  styles.filterButton,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                ]}
              >
                <Text numberOfLines={1} style={[styles.filterLabel, { color: palette.text }]}>
                  {categoryFilter}
                </Text>
                <ChevronDown size={15} color={palette.text2} />
              </TouchableOpacity>
            </View>
            <View style={styles.feedTabs}>
              {[
                ['Latest', Clock3],
                ['Recommended', Sparkles],
              ].map(([tab, Icon]) => (
                <FeedTabButton
                  key={tab}
                  tab={tab}
                  Icon={Icon}
                  active={feedTab === tab}
                  palette={palette}
                  onPress={() => setFeedTab(tab)}
                />
              ))}
            </View>
            <View style={styles.feedSummary}>
              <View style={[styles.feedSummaryDot, { backgroundColor: palette.primary }]} />
              <Text style={[styles.feedSummaryText, { color: palette.text2 }]}>
                {visiblePosts.length} {visiblePosts.length === 1 ? 'conversation' : 'conversations'}{' '}
                in {activeSpace.name}
              </Text>
              <View style={[styles.feedSummaryRule, { backgroundColor: palette.border }]} />
            </View>
            {loading ? <ActivityIndicator style={{ padding: 30 }} color={palette.primary} /> : null}
            {!!loadError && (
              <View
                accessibilityRole="alert"
                style={{
                  marginHorizontal: 18,
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: palette.surfaceAlt,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <Text style={{ color: palette.text, fontSize: 13, flex: 1 }}>{loadError}</Text>
                <TouchableOpacity
                  testID="btn-retry-community"
                  accessibilityRole="button"
                  accessibilityLabel="Retry loading posts"
                  onPress={refresh}
                  style={{ paddingVertical: 6, paddingHorizontal: 10 }}
                >
                  <Text style={{ color: palette.primary, fontWeight: '800' }}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}
            {!loading && visiblePosts.length === 0 && (
              <EmptySpace
                palette={palette}
                name={activeSpace.name}
                filtered={
                  !!selectedRegion || categoryFilter !== 'All categories' || feedTab === 'Nearby'
                }
                generalPosts={activeSpace.slug === 'general' ? posts : generalPosts}
                onCompose={jumpToComposer}
                onGeneral={() => {
                  setSelectedSpace('general');
                  setSelectedRegion(null);
                  setCategoryFilter('All categories');
                  setFeedTab('Latest');
                }}
              />
            )}
          </>
        }
        ListFooterComponent={
          <>
            {hasMore && (
              <TouchableOpacity
                onPress={loadMore}
                style={[styles.loadMore, { borderColor: palette.border }]}
              >
                <Text style={{ color: palette.actionText, fontWeight: '800' }}>Load more</Text>
              </TouchableOpacity>
            )}
          </>
        }
      />

      <Modal
        visible={composeOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!publishing) {
            setComposeOpen(false);
            setEditingPostId(null);
          }
        }}
        onShow={() => composerRef.current?.focus()}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.popupBackdrop}
        >
          <GlassView
            intensity={48}
            style={[
              styles.composePopup,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <ScrollView
              accessibilityViewIsModal
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="none"
              contentContainerStyle={{ paddingBottom: 18 }}
            >
              <View style={[styles.commentHeading, { paddingHorizontal: 20 }]}>
                <Text style={{ color: palette.text, fontFamily: melaHeadingFont, fontSize: 22 }}>
                  {editingPostId ? 'Edit post' : 'Create a post'}
                </Text>
                <TouchableOpacity
                  testID="btn-add-post-photo"
                  accessibilityRole="button"
                  accessibilityLabel="Close composer"
                  disabled={publishing}
                  onPress={() => {
                    setComposeOpen(false);
                    setEditingPostId(null);
                  }}
                  style={styles.bell}
                >
                  <X size={22} color={palette.text2} />
                </TouchableOpacity>
              </View>
              <View
                style={[
                  styles.composer,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                ]}
              >
                <View style={styles.composerTop}>
                  <View style={[styles.avatar, { backgroundColor: palette.primarySoft }]}>
                    <Text style={{ color: palette.actionText, fontSize: 18, fontWeight: '900' }}>
                      {profile?.name?.trim()?.[0]?.toUpperCase() || 'S'}
                    </Text>
                  </View>
                  <AppTextInput
                    ref={composerRef}
                    accessibilityLabel="Community post message"
                    editable={!publishing}
                    textAlignVertical="top"
                    value={body}
                    onChangeText={setBody}
                    multiline
                    maxLength={2000}
                    placeholder="What's happening in your community?"
                    placeholderTextColor={palette.muted}
                    style={[
                      styles.bodyInput,
                      { fontFamily: 'Poppins_400Regular' },
                      {
                        color: palette.text,
                        backgroundColor: palette.surfaceAlt,
                        borderColor: palette.border,
                      },
                    ]}
                  />
                </View>
                {!editingPostId && (
                  <TouchableOpacity
                    testID="btn-remove-post-photo"
                    accessibilityRole="button"
                    accessibilityLabel={postImage ? 'Change post photo' : 'Add photo to post'}
                    disabled={publishing || choosingImage}
                    onPress={choosePostImage}
                    style={styles.locationConsent}
                  >
                    <Plus size={18} color={palette.actionText} />
                    <Text style={{ color: palette.actionText }}>
                      {choosingImage ? 'Opening photos…' : postImage ? 'Change photo' : 'Add photo'}
                    </Text>
                  </TouchableOpacity>
                )}
                {!editingPostId && postImage && (
                  <View>
                    <Image
                      source={{ uri: postImage.uri }}
                      style={{ width: '100%', height: 180, borderRadius: 14 }}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Remove post photo"
                      disabled={publishing}
                      onPress={() => setPostImage(null)}
                      style={styles.locationConsent}
                    >
                      <X size={18} color={palette.text2} />
                      <Text style={{ color: palette.text2 }}>Remove photo</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {!editingPostId && (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Post options"
                    accessibilityState={{ expanded: postOptionsOpen }}
                    onPress={() => setPostOptionsOpen((value) => !value)}
                    style={styles.locationConsent}
                  >
                    <ChevronDown size={18} color={palette.text2} />
                    <Text style={{ color: palette.text2 }}>
                      {postOptionsOpen
                        ? 'Hide post options'
                        : 'Post options: topic, area, business'}
                    </Text>
                  </TouchableOpacity>
                )}
                {!editingPostId && postOptionsOpen && (
                  <View>
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
                            <Icon size={16} color={active ? palette.onPrimary : palette.text2} />
                            <Text
                              style={{
                                color: active ? palette.onPrimary : palette.text2,
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
                      <Text style={{ color: palette.actionText, fontWeight: '800', fontSize: 11 }}>
                        {shareLocation ? 'Added' : 'Add'}
                      </Text>
                    </TouchableOpacity>
                    <Text style={[styles.providerLabel, { color: palette.text }]}>
                      Mention a provider (optional)
                    </Text>
                    <GlassView intensity={44} style={styles.providerSearch}>
                      <Store size={17} color={palette.muted} />
                      <AppTextInput
                        value={providerSearch}
                        onChangeText={setProviderSearch}
                        placeholder="Search for a business..."
                        placeholderTextColor={palette.muted}
                        style={[
                          styles.providerSearchInput,
                          { fontFamily: 'Poppins_400Regular' },
                          { color: palette.text },
                        ]}
                      />
                    </GlassView>
                    <View style={styles.providerOptions}>
                      {providerOptions.map((provider) => (
                        <ProviderOption
                          key={provider.id}
                          provider={provider}
                          selected={providerId === provider.id}
                          palette={palette}
                          onPress={() =>
                            setProviderId((current) =>
                              current === provider.id ? null : provider.id,
                            )
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
                      <Text style={{ color: palette.actionText, fontSize: 11, marginTop: 4 }}>
                        Mentioning {selectedProvider.name}
                      </Text>
                    )}
                  </View>
                )}
                <GlowButton
                  testID="btn-post"
                  accessibilityRole="button"
                  accessibilityLabel={
                    editingPostId ? 'Save community post changes' : 'Publish community post'
                  }
                  disabled={publishing || choosingImage || body.trim().length < 2}
                  variant="primary"
                  size="lg"
                  label={
                    publishing
                      ? 'Posting…'
                      : editingPostId
                        ? 'Save changes'
                        : session
                          ? 'Post to ' + activeSpace.name
                          : 'Sign in to publish'
                  }
                  leftIcon={!publishing && <Send size={18} color={palette.onPrimary} />}
                  stretch
                  status={publishing ? 'loading' : 'idle'}
                  onPress={publish}
                  buttonStyle={[
                    styles.publish,
                    {
                      backgroundColor: palette.primary,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.charCount,
                    { color: body.length > 1900 ? palette.coral : palette.muted },
                  ]}
                >
                  {body.length}/2000
                </Text>
              </View>
            </ScrollView>
          </GlassView>
        </KeyboardAvoidingView>
      </Modal>

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
          <GlassView
            intensity={48}
            style={[
              styles.categoryMenu,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
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
          </GlassView>
        </TouchableOpacity>
      </Modal>
      <Modal
        visible={!!reportTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setReportTarget(null)}
      >
        <View style={styles.modalBackdrop}>
          <GlassView
            accessibilityViewIsModal
            intensity={48}
            style={[
              styles.commentsSheet,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <Text style={{ color: palette.text, fontFamily: melaHeadingFont, fontSize: 20 }}>
              Report {reportTarget?.comment ? 'comment' : 'post'}
            </Text>
            {[
              ['spam_or_scam', 'Spam or scam'],
              ['harassment_or_hate', 'Harassment or hate'],
              ['private_information', 'Private information'],
              ['other', 'Other concern'],
            ].map(([reason, label]) => (
              <TouchableOpacity
                key={reason}
                accessibilityRole="button"
                style={styles.menuItem}
                onPress={() => {
                  const target = reportTarget;
                  setReportTarget(null);
                  if (target) reportPost(target.post, reason, target.comment);
                }}
              >
                <Text style={{ color: palette.text }}>{label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.menuItem}
              onPress={() => setReportTarget(null)}
            >
              <Text style={{ color: palette.actionText }}>Cancel</Text>
            </TouchableOpacity>
          </GlassView>
        </View>
      </Modal>
      <Modal
        visible={!!commentsPost}
        transparent
        animationType="slide"
        onRequestClose={() => setCommentsPost(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBackdrop}
        >
          <GlassView
            intensity={48}
            style={[
              styles.commentsSheet,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <View style={[styles.commentsHandle, { backgroundColor: palette.border }]} />
            <View style={styles.commentHeading}>
              <View style={styles.commentHeadingCopy}>
                <Text style={[styles.commentEyebrow, { color: palette.actionText }]}>
                  COMMUNITY THREAD
                </Text>
                <View style={styles.commentTitleRow}>
                  <Text
                    style={{
                      color: palette.text,
                      fontSize: 21,
                      fontWeight: '800',
                      letterSpacing: -0.5,
                    }}
                  >
                    Conversation
                  </Text>
                  <View style={[styles.commentCount, { backgroundColor: palette.primaryTint }]}>
                    <Text style={{ color: palette.actionText, fontSize: 11, fontWeight: '800' }}>
                      {comments.length}
                    </Text>
                  </View>
                </View>
                <Text style={{ color: palette.text2, fontSize: 11, marginTop: 2 }}>
                  Keep it kind. Keep it helpful.
                </Text>
              </View>
              <TouchableOpacity
                testID="btn-close-comments"
                accessibilityRole="button"
                accessibilityLabel="Close comments"
                style={[styles.commentClose, { backgroundColor: palette.surfaceAlt }]}
                onPress={() => setCommentsPost(null)}
              >
                <X size={19} color={palette.text2} />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.commentList}
              contentContainerStyle={styles.commentListContent}
              keyboardShouldPersistTaps="handled"
            >
              {commentsLoading ? (
                <ActivityIndicator
                  style={styles.commentLoader}
                  color={palette.primary}
                  accessibilityLabel="Loading comments"
                />
              ) : comments.length === 0 ? (
                <View style={styles.commentEmpty}>
                  <View style={[styles.commentEmptyIcon, { backgroundColor: palette.primaryTint }]}>
                    <MessageCircle size={22} color={palette.actionText} />
                  </View>
                  <Text style={{ color: palette.text, fontSize: 14, fontWeight: '800' }}>
                    Start the conversation
                  </Text>
                  <Text
                    style={{
                      color: palette.text2,
                      fontSize: 12,
                      lineHeight: 18,
                      textAlign: 'center',
                      maxWidth: 250,
                    }}
                  >
                    Share a thoughtful reply and help this community feel a little closer.
                  </Text>
                </View>
              ) : null}
              {comments.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.commentRow,
                    item.author_id === session?.user?.id && styles.commentRowOwn,
                  ]}
                >
                  {item.author_id !== session?.user?.id && (
                    <View
                      style={[
                        styles.commentAvatar,
                        { backgroundColor: palette.primaryTint, borderColor: palette.surface },
                      ]}
                    >
                      {commentAuthors[item.author_id]?.avatar_url ? (
                        <Image
                          source={{ uri: commentAuthors[item.author_id].avatar_url }}
                          style={styles.commentAvatarImage}
                        />
                      ) : (
                        <Text
                          style={{ color: palette.actionText, fontSize: 11, fontWeight: '800' }}
                        >
                          {(commentAuthors[item.author_id]?.display_name || 'C')[0].toUpperCase()}
                        </Text>
                      )}
                    </View>
                  )}
                  <View
                    style={[
                      styles.commentBubble,
                      {
                        backgroundColor:
                          item.author_id === session?.user?.id
                            ? palette.primaryTint
                            : palette.surfaceAlt,
                      },
                    ]}
                  >
                    <View style={styles.commentMeta}>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.commentAuthor,
                          {
                            color:
                              item.author_id === session?.user?.id
                                ? palette.actionText
                                : palette.text,
                          },
                        ]}
                      >
                        {item.author_id === session?.user?.id
                          ? 'You'
                          : commentAuthors[item.author_id]?.display_name || 'Community member'}
                      </Text>
                      <Text style={{ color: palette.muted, fontSize: 10 }}>
                        {relativeDate(item.created_at)}
                      </Text>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Comment options"
                        style={styles.commentOptions}
                        onPress={() =>
                          Alert.alert('Comment options', 'Help keep the community safe.', [
                            {
                              text: communityReady ? 'Report comment' : 'Report post',
                              onPress: () =>
                                reportPost(commentsPost, undefined, communityReady ? item : null),
                            },
                            ...(communityReady && session && item.author_id !== session.user.id
                              ? [
                                  {
                                    text: 'Block author',
                                    style: 'destructive',
                                    onPress: () => blockAuthor(item.author_id),
                                  },
                                ]
                              : []),
                            { text: 'Cancel', style: 'cancel' },
                          ])
                        }
                      >
                        <MoreHorizontal size={17} color={palette.text2} />
                      </TouchableOpacity>
                    </View>
                    <Text
                      style={{
                        color:
                          item.author_id === session?.user?.id ? palette.actionText : palette.text,
                        fontSize: 13,
                        lineHeight: 19,
                      }}
                    >
                      {item.body}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            <View
              style={[
                styles.commentComposer,
                { backgroundColor: palette.surfaceAlt, borderColor: palette.border },
              ]}
            >
              <AppTextInput
                accessibilityLabel="Write a comment"
                multiline
                value={commentBody}
                onChangeText={setCommentBody}
                maxLength={1000}
                placeholder="Add something kind..."
                placeholderTextColor={palette.muted}
                style={[styles.commentInput, { color: palette.text }]}
              />
              <TouchableOpacity
                testID="btn-send-comment"
                accessibilityRole="button"
                accessibilityLabel="Send comment"
                disabled={commentBusy || !commentBody.trim()}
                onPress={submitComment}
                style={[
                  styles.commentSend,
                  {
                    backgroundColor:
                      commentBusy || !commentBody.trim() ? palette.surface : palette.primary,
                  },
                ]}
              >
                {commentBusy ? (
                  <ActivityIndicator color={palette.primary} />
                ) : (
                  <Send size={17} color={commentBody.trim() ? palette.onPrimary : palette.muted} />
                )}
              </TouchableOpacity>
            </View>
          </GlassView>
        </KeyboardAvoidingView>
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
          <Text style={{ color: palette.actionText, fontSize: 9, fontWeight: '800' }}>
            Selected
          </Text>
        )}
      </View>
    </TouchableOpacity>
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
  return formatDate(value);
}
function sharePost(post) {
  Share.share({ message: post.body }).catch((error) => {
    console.warn('Unable to share community post.', error);
    Alert.alert('Could not share post', 'Please try sharing this post again.');
  });
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { width: '100%', maxWidth: 840, alignSelf: 'center', paddingBottom: 110, gap: 0 },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
    elevation: 10,
  },
  brandLogo: { width: 116, height: 38 },
  heroNotification: {
    width: 40,
    height: 40,
    marginRight: 10,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
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
  heroBlend: {
    position: 'relative',
    overflow: 'hidden',
    marginHorizontal: -18,
    height: 296,
    backgroundColor: '#000000',
  },
  heroBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 296,
    width: '100%',
    opacity: 0.34,
    zIndex: 0,
  },
  heroTopGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    zIndex: 3,
    elevation: 3,
  },
  heroBottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 150,
    zIndex: 3,
    elevation: 3,
  },
  hero: {
    zIndex: 4,
    elevation: 4,
    height: 236,
    minHeight: 236,
    marginTop: 60,
    paddingHorizontal: 38,
    paddingTop: 12,
    paddingBottom: 24,
    justifyContent: 'flex-end',
  },
  heroCopy: { maxWidth: 400, alignItems: 'flex-start' },
  heroEyebrow: { fontSize: 9, letterSpacing: 1.35, fontWeight: '900' },
  heroTitle: { color: '#FFFFFF', fontSize: 34, lineHeight: 39, fontWeight: '900', marginTop: 5 },
  heroSubtitle: { color: '#F1F5F2', fontSize: 12, lineHeight: 18, maxWidth: 330, marginTop: 5 },
  heroButton: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 13,
    marginTop: 13,
  },
  heroButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  regionHeader: {
    marginHorizontal: 24,
    marginTop: 25,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: { fontSize: 18, fontWeight: '900', fontFamily: melaHeadingFont },
  regionRow: { paddingHorizontal: 22, gap: 10, paddingBottom: 6 },
  regionCard: {
    width: 106,
    minHeight: 105,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 12,
    gap: 10,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  regionIconSlot: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  regionLabelSlot: { width: '100%', minHeight: 32, justifyContent: 'center' },
  regionLabel: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '900',
  },
  composer: {
    marginHorizontal: 18,
    marginTop: 12,
    minHeight: 72,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    ...shadows.lift,
  },
  composerIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerCopy: { flex: 1, minWidth: 0 },
  composerArrow: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safetyNote: {
    marginHorizontal: 18,
    marginTop: 12,
    padding: 12,
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  safetyIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safetyCopy: { flex: 1, minWidth: 0 },
  feedHeading: {
    marginHorizontal: 18,
    marginTop: 24,
    marginBottom: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  feedHeadingCopy: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 9 },
  feedHeadingIcon: {
    width: 36,
    height: 36,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedHeadingText: { flex: 1, minWidth: 0 },
  feedTitle: { fontSize: 18, fontWeight: '900', letterSpacing: -0.4 },
  feedSubtitle: { fontSize: 11, marginTop: 3 },
  popupBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  composePopup: {
    maxHeight: '90%',
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    borderRadius: 22,
    overflow: 'hidden',
    paddingTop: 12,
  },
  composerTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyInput: {
    flex: 1,
    minHeight: 120,
    maxHeight: 180,
    borderWidth: 1,
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  typeRow: { gap: 7, paddingVertical: 13, paddingRight: 2 },
  typePill: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 24,
  },
  locationConsent: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 8,
  },
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
  feedTabs: {
    flexDirection: 'row',
    marginHorizontal: 22,
    marginBottom: 4,
    gap: 8,
  },
  feedTab: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 5,
    position: 'relative',
  },
  feedTabAccent: {
    position: 'absolute',
    bottom: 1,
    width: 24,
    height: 3,
    borderRadius: 2,
  },
  feedTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  feedSummary: {
    marginHorizontal: 23,
    marginTop: 10,
    marginBottom: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  feedSummaryDot: { width: 6, height: 6, borderRadius: 3 },
  feedSummaryText: { fontSize: 10, fontWeight: '600' },
  feedSummaryRule: { flex: 1, height: StyleSheet.hairlineWidth },
  filterButton: {
    maxWidth: 132,
    flexShrink: 1,
    minHeight: 34,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  filterLabel: { color: '#FFFFFF', fontSize: 10, fontWeight: '700', flexShrink: 1 },
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
    maxHeight: '90%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
  },
  commentsHandle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    marginBottom: 14,
  },
  commentHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  commentHeadingCopy: { flex: 1, minWidth: 0 },
  commentEyebrow: { fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  commentTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  commentCount: {
    minWidth: 23,
    height: 23,
    paddingHorizontal: 6,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentClose: {
    width: 36,
    height: 36,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentList: { flexShrink: 1 },
  commentListContent: { flexGrow: 1, paddingVertical: 4, gap: 12 },
  commentLoader: { flex: 1, paddingVertical: 48 },
  commentEmpty: {
    flex: 1,
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 24,
  },
  commentEmptyIcon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  commentRowOwn: { justifyContent: 'flex-end' },
  commentAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  commentAvatarImage: { width: 26, height: 26, borderRadius: 13 },
  commentBubble: {
    maxWidth: '88%',
    minWidth: '42%',
    paddingHorizontal: 12,
    paddingTop: 9,
    paddingBottom: 10,
    borderRadius: 16,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 5,
  },
  commentAuthor: { flexShrink: 1, fontSize: 11, fontWeight: '800' },
  commentOptions: {
    width: 24,
    height: 24,
    marginLeft: 'auto',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentComposer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    padding: 5,
    borderWidth: 1,
    borderRadius: 19,
  },
  commentInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 15,
    paddingHorizontal: 11,
    paddingVertical: 10,
    textAlignVertical: 'top',
  },
  commentSend: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
