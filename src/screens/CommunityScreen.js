import ScrollView from '../components/KeyboardAwareScrollView';
import { AppAlert as Alert } from '../components/AppDialog';
import useLiveCallback from '../hooks/useLiveCallback';
import ImageBackground from '../components/RevealImageBackground';
import { MotionModal as Modal } from '../components/Motion';
import { MotionTouchable as TouchableOpacity } from '../components/Motion';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MelaInput as AppTextInput } from '../components/community/MelaText';
import {
  ActivityIndicator,
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
import { canReportContent, reportFailureMessage } from '../components/community/communitySafety';
import EmptySpace from '../components/community/EmptySpace';
import SpaceTray, { SpaceAccentBar } from '../components/community/SpaceTray';
import { isNewMember } from '../components/community/melaFeedUtils';
import { melaHeadingFont } from '../theme/mela';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell,
  Check,
  ChevronDown,
  Flag,
  LayoutGrid,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Send,
  Star,
  Store,
  ThumbsUp,
  X,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { showPermissionRecovery } from '../lib/permissionRecovery';
import {
  uploadCommunityImage,
  removeCommunityImage,
  resolveCommunityImages,
} from '../data/communityImages';
import {
  cacheCommunityPosts,
  createLocalPost,
  enqueuePendingOperation,
  loadLocalPosts,
  updateLocalPost,
} from '../data/localDatabase';
import { supabase } from '../lib/supabase';
import { useAppState } from '../context/AppStateContext';
import { useChodhiQTheme } from '../context/ThemeContext';
import { imageSource } from '../data/assetCatalog';
import { devicePerformance } from '../lib/devicePerformance';
import { mergeCommunityPage } from '../lib/communityPaging';
import { shadows } from '../theme/theme';
import { REGION_KEYWORDS } from '../components/RegionEmblem';

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
}) {
  return (
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
    />
  );
});

export default function CommunityScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { session, profile, providers, unreadCount } = useAppState();
  const { communityPalette: palette } = useChodhiQTheme();
  const [posts, setPosts] = useState([]);
  const [generalPosts, setGeneralPosts] = useState([]);
  const [spaces, setSpaces] = useState([{ id: null, slug: 'general', name: 'General' }]);
  const [selectedSpace, setSelectedSpace] = useState('general');
  const [communityReady, setCommunityReady] = useState(false);
  const activeSpace = spaces.find((space) => space.slug === selectedSpace) || spaces[0];

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
  const [reportingPostId, setReportingPostId] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const loadSequence = useRef(0);
  const loadedPosts = useRef([]);
  const likeRequests = useRef(new Set());
  const [hasMore, setHasMore] = useState(false);
  const composerRef = useRef(null);

  const [composeOpen, setComposeOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState(null);
  const [postOptionsOpen, setPostOptionsOpen] = useState(false);

  const loadPosts = useCallback(async () => {
    const request = ++loadSequence.current;
    try {
      if (supabase) {
        const fields =
          'id,author_id,provider_id,post_type,body,image_url,offer_expires_at,region_key,location_city,created_at,providers(id,business_name,is_verified,categories(name,slug))' +
          (communityReady ? ',community_id' : '');
        let query = supabase
          .from('community_posts')
          .select(fields)
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range((page - 1) * 30, page * 30 - 1);
        if (communityReady && activeSpace?.id) query = query.eq('community_id', activeSpace.id);
        const [{ data, error }, saveResult, generalResult] = await Promise.all([
          query,
          session
            ? supabase
                .from('community_saved_posts')
                .select('post_id')
                .eq('user_id', session.user.id)
            : Promise.resolve({ data: [] }),
          communityReady && activeSpace?.slug !== 'general' && spaces[0]?.id
            ? supabase
                .from('community_posts')
                .select(fields)
                .eq('status', 'published')
                .eq('community_id', spaces[0].id)
                .order('created_at', { ascending: false })
                .limit(3)
            : Promise.resolve({ data: [] }),
        ]);
        if (request !== loadSequence.current) return;
        if (error) throw error;
        const countResult = data?.length
          ? await supabase.rpc('community_post_engagement_for_posts', {
              requested_posts: data.map((post) => post.id),
            })
          : { data: [], error: null };
        setLoadError(
          countResult.error ? 'Posts loaded, but reactions could not refresh. Tap to retry.' : '',
        );
        const [resolvedPosts, resolvedGeneral] = await Promise.all([
          resolveCommunityImages(data || []),
          resolveCommunityImages(generalResult.error ? [] : generalResult.data || []),
        ]);
        if (request !== loadSequence.current) return;
        const merged = mergeCommunityPage(loadedPosts.current, resolvedPosts, page === 1);
        loadedPosts.current = merged;
        setPosts(merged);
        setHasMore((data || []).length === 30);
        setGeneralPosts(resolvedGeneral);
        setEngagement((current) => ({
          counts: countResult.error
            ? current.counts
            : {
                ...(page > 1 ? current.counts : {}),
                ...Object.fromEntries((countResult.data || []).map((row) => [row.post_id, row])),
              },
          saves: saveResult.error ? current.saves : saveResult.data || [],
        }));
        if (activeSpace?.slug === 'general')
          await cacheCommunityPosts(
            merged.map((post) => ({
              ...post,
              image_url: post.storage_image_ref || post.image_url,
            })),
          );
      } else {
        setPosts(activeSpace?.slug === 'general' ? await loadLocalPosts(providers) : []);
        setLoadError('');
      }
    } catch (error) {
      if (request !== loadSequence.current) return;
      console.warn('Community sync failed; using the local cache.', error.message);
      setHasMore(false);
      setLoadError('Could not refresh the community feed. Showing saved posts if available.');
      try {
        const cached = activeSpace?.slug === 'general' ? await loadLocalPosts(providers) : [];
        if (request === loadSequence.current) setPosts(cached);
      } catch {
        setPosts([]);
      }
    } finally {
      if (request === loadSequence.current) setLoading(false);
    }
  }, [activeSpace?.id, activeSpace?.slug, communityReady, page, providers, session, spaces]);

  useEffect(() => {
    setLoading(page === 1);
    if (page === 1) {
      setPosts([]);
      loadedPosts.current = [];
    }
    loadPosts();
  }, [loadPosts, page]);
  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedProviderSearch(providerSearch.trim().toLowerCase()),
      250,
    );
    return () => clearTimeout(timer);
  }, [providerSearch]);

  const refresh = async () => {
    if (page > 1) {
      setPage(1);
      return;
    }
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
    let uploadedImage = null;
    const payload = {
      ...(communityReady && activeSpace?.id ? { community_id: activeSpace.id } : {}),
      author_id: session.user.id,
      provider_id: providerId,
      post_type: postType,
      body: safeBody,
      region_key: selectedRegion,
      location_city: shareLocation ? profile?.location || null : null,
    };
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
        await loadPosts();
        return;
      }
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
        if (postImage) {
          uploadedImage = await uploadCommunityImage(session.user.id, postImage);
          payload.image_url = uploadedImage.imageUrl;
        }
        const { error } = await supabase.from('community_posts').insert(payload);
        if (error) throw error;
        uploadedImage = null;
      }

      setComposeOpen(false);
      setBody('');
      setPostImage(null);
      setProviderId(null);
      setPostType('discussion');
      setPage(1);
      await loadPosts();
    } catch (error) {
      if (uploadedImage) await removeCommunityImage(uploadedImage.path).catch(() => {});
      Alert.alert('Could not publish', error.message || 'Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  const toggleLike = async (post) => {
    if (!session) return navigation.navigate('Welcome');
    if (!supabase)
      return Alert.alert('Likes unavailable', 'Connect to the community service to like posts.');
    if (likeRequests.current.has(post.id)) return;
    likeRequests.current.add(post.id);
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
          is_updating: true,
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
      setEngagement((current) => ({
        ...current,
        counts: { ...current.counts, [post.id]: counts },
      }));
      Alert.alert('Could not update like', 'Please try again.');
    } finally {
      likeRequests.current.delete(post.id);
      setEngagement((current) => ({
        ...current,
        counts: {
          ...current.counts,
          [post.id]: { ...current.counts[post.id], is_updating: false },
        },
      }));
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
    if (commentBusy || !commentsPost) return;
    if (!session) return navigation.navigate('Welcome');
    if (!supabase)
      return Alert.alert('Comments unavailable', 'Connect to the community service to comment.');
    if (commentBody.trim().length < 1 || commentBody.trim().length > 1000) return;
    setCommentBusy(true);
    try {
      const { data, error } = await supabase
        .from('community_comments')
        .insert({ post_id: commentsPost.id, author_id: session.user.id, body: commentBody.trim() })
        .select('id,author_id,body,created_at')
        .single();
      if (error) throw error;
      setComments((current) => [...current, data]);
      setCommentBody('');
      await loadPosts();
    } catch (error) {
      Alert.alert(
        'Could not comment',
        error.message || 'Please try again. Your draft is still here.',
      );
    } finally {
      setCommentBusy(false);
    }
  };

  const reportPost = async (post, reason, comment = null) => {
    if (!session) return navigation.navigate('Welcome');
    if (!supabase)
      return Alert.alert(
        'Reporting unavailable',
        'Connect to the community service to report a post.',
      );
    if (!canReportContent(session.user.id, post, comment))
      return Alert.alert('Your own content', 'You can report content shared by other members.');
    if (!reason) {
      if (commentsPost) setCommentsPost(null);
      setReportTarget({ post, comment });
      return;
    }
    const targetId = comment?.id || post.id;
    if (reportingPostId === targetId) return;
    setReportingPostId(targetId);
    try {
      const { error } = await supabase.from('community_post_reports').insert({
        post_id: post.id,
        ...(comment ? { comment_id: comment.id } : {}),
        reporter_id: session.user.id,
        reason,
      });
      if (error?.code === '23505')
        return Alert.alert(
          'Already reported',
          'Our team has already received a report for this content.',
        );
      if (error) {
        const message = reportFailureMessage(error.code);
        return Alert.alert('Could not send report', message, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => reportPost(post, reason, comment) },
        ]);
      }
      Alert.alert('Report sent', 'Thanks. Our moderation team will review this content.');
    } catch {
      Alert.alert(
        'Could not send report',
        'Your report was not sent. Check your connection and retry.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => reportPost(post, reason, comment) },
        ],
      );
    } finally {
      setReportingPostId(null);
    }
  };

  const blockAuthor = (authorId) => {
    if (!session) return navigation.navigate('Welcome');
    if (!communityReady || !supabase || authorId === session.user.id) return;
    Alert.alert('Block this author?', 'Their posts and comments will be hidden from your feed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('community_user_blocks')
              .upsert(
                { blocker_id: session.user.id, blocked_id: authorId },
                { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true },
              );
            if (error) throw error;
            setComments((current) => current.filter((comment) => comment.author_id !== authorId));
            if (commentsPost?.author_id === authorId) setCommentsPost(null);
            await loadPosts();
          } catch {
            Alert.alert('Could not block author', 'Please check your connection and try again.');
          }
        },
      },
    ]);
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
  const savedPostIds = useMemo(
    () => new Set(engagement.saves.map((save) => save.post_id)),
    [engagement.saves],
  );
  const like = useLiveCallback(toggleLike);
  const comment = useLiveCallback(openComments);
  const save = useLiveCallback(toggleSave);
  const share = useLiveCallback(sharePost);
  const report = useLiveCallback(reportPost);
  const edit = useLiveCallback(beginEditPost);
  const block = useLiveCallback(blockAuthor);
  const openAuthor = useLiveCallback(
    (post) =>
      post.author_id && navigation.navigate('CommunityProfile', { authorId: post.author_id }),
  );
  const openProvider = useLiveCallback(
    (post) => post.provider_id && navigation.navigate('ProviderDetail', { id: post.provider_id }),
  );
  const renderPost = useCallback(
    ({ item: post }) => (
      <CommunityPostRow
        post={post}
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
    <SafeAreaView style={[styles.page, { backgroundColor: palette.background }]} edges={['top']}>
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
        keyExtractor={(post) => String(post.id)}
        renderItem={renderPost}
        initialNumToRender={devicePerformance.initialRows}
        maxToRenderPerBatch={devicePerformance.renderBatch}
        windowSize={devicePerformance.listWindow}
        removeClippedSubviews={false}
        keyboardDismissMode="none"
        ListHeaderComponent={
          <>
            <SpaceAccentBar style={styles.topBar} accent={palette.primary}>
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
                <Bell size={22} color={palette.text} />
                {unreadCount > 0 && <View style={styles.bellDot} />}
              </TouchableOpacity>
            </SpaceAccentBar>
            <SpaceTray
              spaces={spaces}
              selected={activeSpace.slug}
              palette={palette}
              onSelect={(slug) => {
                setPage(1);
                setSelectedSpace(slug);
              }}
            />
            <ImageBackground
              source={require('../../assets/generated/onboarding-london.webp')}
              resizeMode="cover"
              imageStyle={styles.heroImage}
              style={styles.hero}
            >
              <View style={styles.heroShade} />
              <Text style={[styles.heroEyebrow, { color: palette.saffron }]}>OUR SHARED SPACE</Text>
              <Text style={[styles.heroTitle, { fontFamily: melaHeadingFont }]}>Mela Feed</Text>
              <Text style={styles.heroSubtitle}>
                Ask, recommend and share genuine experiences. Customer posts are free and can
                include images.
              </Text>
              <TouchableOpacity
                onPress={jumpToComposer}
                style={[styles.heroButton, { backgroundColor: palette.primary }]}
              >
                <Plus size={21} color={palette.onPrimary} />
                <Text style={[styles.heroButtonText, { color: palette.onPrimary }]}>
                  Create post
                </Text>
              </TouchableOpacity>
            </ImageBackground>
            <View
              style={[
                styles.safetyNote,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ]}
            >
              <Text style={{ color: palette.text, fontWeight: '800', fontSize: 13 }}>
                Keep the community safe
              </Text>
              <Text style={{ color: palette.text2, fontSize: 12, lineHeight: 18, marginTop: 4 }}>
                Be respectful. Don’t post private information, send money to strangers, or share
                verification codes. Report suspicious or harmful posts so our team can review them.
              </Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Create a community post"
              onPress={jumpToComposer}
              style={[
                styles.composer,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                  minHeight: 60,
                  justifyContent: 'center',
                },
              ]}
            >
              <Text style={{ color: palette.text2 }}>What's happening in your community?</Text>
            </TouchableOpacity>
            <View style={styles.feedHeader}>
              <View style={styles.feedTabs}>
                {['Latest', 'Recommended', 'Nearby'].map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    accessibilityRole="button"
                    accessibilityState={{ selected: feedTab === tab }}
                    onPress={() => setFeedTab(tab)}
                    style={[
                      styles.feedTab,
                      feedTab === tab && {
                        borderBottomColor: palette.primary,
                        borderBottomWidth: 2,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: feedTab === tab ? palette.text : palette.text2,
                        fontWeight: feedTab === tab ? '800' : '600',
                      }}
                    >
                      {tab === 'Recommended' ? 'For you' : tab}
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
                <Text style={{ color: palette.coral, fontSize: 12 }}>
                  {loadError} Tap to retry.
                </Text>
              </TouchableOpacity>
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
                onPress={() => setPage((current) => current + 1)}
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
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.popupBackdrop}
        >
          <View style={[styles.composePopup, { backgroundColor: palette.surface }]}>
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
                        style={[
                          styles.providerSearchInput,
                          { fontFamily: 'Poppins_400Regular' },
                          { color: palette.text },
                        ]}
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
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={
                    editingPostId ? 'Save community post changes' : 'Publish community post'
                  }
                  disabled={publishing || choosingImage || body.trim().length < 2}
                  onPress={publish}
                  style={[
                    styles.publish,
                    {
                      backgroundColor: palette.primary,
                      opacity: publishing || choosingImage || body.trim().length < 2 ? 0.5 : 1,
                    },
                  ]}
                >
                  {publishing ? (
                    <ActivityIndicator color={palette.onPrimary} />
                  ) : (
                    <>
                      <Send size={18} color={palette.onPrimary} />
                      <Text style={[styles.publishText, { color: palette.onPrimary }]}>
                        {editingPostId
                          ? 'Save changes'
                          : session
                            ? 'Post to ' + activeSpace.name
                            : 'Sign in to publish'}
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
            </ScrollView>
          </View>
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
        visible={!!reportTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setReportTarget(null)}
      >
        <View style={styles.modalBackdrop}>
          <View
            accessibilityViewIsModal
            style={[styles.commentsSheet, { backgroundColor: palette.surface }]}
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
          </View>
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
          <View style={[styles.commentsSheet, { backgroundColor: palette.surface }]}>
            <View style={styles.commentHeading}>
              <Text style={{ color: palette.text, fontSize: 18, fontWeight: '800' }}>Comments</Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close comments"
                style={styles.bell}
                onPress={() => setCommentsPost(null)}
              >
                <X size={22} color={palette.text2} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled">
              {comments.map((item) => (
                <View
                  key={item.id}
                  style={[styles.commentRow, { borderBottomColor: palette.border }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: palette.text, fontSize: 13, flex: 1 }}>{item.body}</Text>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Comment options"
                      style={styles.bell}
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
                      <MoreHorizontal size={22} color={palette.text2} />
                    </TouchableOpacity>
                  </View>
                  <Text style={{ color: palette.muted, fontSize: 10, marginTop: 3 }}>
                    {relativeDate(item.created_at)}
                  </Text>
                </View>
              ))}
            </ScrollView>
            <View style={styles.commentComposer}>
              <AppTextInput
                accessibilityLabel="Write a comment"
                multiline
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
                  <Send size={17} color={palette.onPrimary} />
                )}
              </TouchableOpacity>
            </View>
          </View>
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
  return new Date(value).toLocaleDateString();
}
function sharePost(post) {
  Share.share({ message: post.body }).catch(() => {});
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { width: '100%', maxWidth: 840, alignSelf: 'center', paddingBottom: 110, gap: 0 },
  topBar: {
    height: 70,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandLogo: { width: 130, height: 43 },
  brand: { color: '#FFFFFF', fontSize: 27, letterSpacing: -1.2, fontWeight: '900' },
  bell: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
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
    marginTop: 20,
    padding: 14,
    borderRadius: 22,
    borderWidth: 1,
    ...shadows.lift,
  },
  safetyNote: {
    marginHorizontal: 18,
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
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
  feedHeader: {
    marginHorizontal: 18,
    marginTop: 22,
    marginBottom: 7,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  feedTabs: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginRight: 8,
  },
  feedTab: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterButton: {
    alignSelf: 'flex-end',
    maxWidth: 220,
    flexShrink: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
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
    maxHeight: '90%',
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
  commentInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    textAlignVertical: 'top',
  },
  commentSend: {
    width: 44,
    height: 44,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
