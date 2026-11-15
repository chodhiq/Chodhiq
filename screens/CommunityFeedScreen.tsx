import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  type FlatListProps,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Check,
  ChevronDown,
  Clock3,
  SlidersHorizontal,
  Sparkles,
  Users,
} from 'lucide-react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { default as AnimatedPressable } from '../components/ui/PressableScale';
import GlowButton from '../components/ui/GlowButton';
import GlassView from '../src/components/GlassView';
import Screen from '../components/ui/Screen';
import PostComposer from '../components/composer/PostComposer';
import type { Post } from '../components/composer/useComposerFlow';
import PostCard, { type PostCardProps } from '../components/PostCard';
import type { GlowSheetOption } from '../components/ui/GlowSheet';
import PulseDot from '../components/PulseDot';
import { formatDate } from '../src/lib/dateTime';
import TabPills from '../components/TabPills';
import type { TabPillOption } from '../components/TabPills';
import { theme } from '../theme';
import { AppAlert as Alert } from '../src/components/AppDialog';
import { useAppState } from '../src/context/AppStateContext';
import useCommunityFeed from '../src/hooks/useCommunityFeed';
import { isAuthSessionError } from '../src/data/syncPolicy';
import useEffectsLevel from '../src/hooks/useEffectsLevel';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTabBarContentPadding } from '../src/navigation/tabBarLayout';

interface CommunityPost {
  id: string;
  authorId: string;
  username: string;
  createdAt: string;
  text: string;
  imageUrl?: string;
  category: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  savedByMe: boolean;
}

interface FeedPost extends Omit<PostCardProps, 'index' | 'variant' | 'isNewCard'> {
  id: string;
  authorId: string;
  createdAt: string;
  liked: boolean;
  bookmarked: boolean;
  imageUri?: string;
}

const keyExtractor = (post: FeedPost) => post.id;
const viewabilityConfig = { itemVisiblePercentThreshold: 10 };
const COMMUNITY_CATEGORIES = [
  'Discussion',
  'Experience',
  'Recommend',
  'Complaint',
  'Promotion',
] as const;
const feedTabs: TabPillOption[] = [
  { id: 'latest', label: 'Latest', Icon: Clock3 },
  { id: 'forYou', label: 'For you', Icon: Sparkles },
];

export function filterCommunityPosts<T extends { category: string }>(
  posts: T[],
  category: string | null,
): T[] {
  return category === null ? posts : posts.filter((post) => post.category === category);
}

interface CommunityFeedScreenProps {
  navigation: {
    navigate: (route: string, params?: Record<string, unknown>) => void;
    setParams?: (params: Record<string, unknown>) => void;
  };
  route?: { params?: { compose?: boolean; postId?: string; openComments?: boolean } };
}

function hasErrorCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

export default function CommunityFeedScreen({ navigation, route }: CommunityFeedScreenProps) {
  const canAnimate = useEffectsLevel() === 'full';
  const { fontScale, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { session, providers, syncStatus, writeStatus, promptAuthWrite } = useAppState();
  const authOwnerId = (session as { user?: { id?: string } } | null)?.user?.id;
  const compact = width < 420 || fontScale > 1.25;
  const listRef = useRef<FlatList<FeedPost>>(null);
  const [visiblePostIds, setVisiblePostIds] = useState<Set<string>>(() => new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [feedTab, setFeedTab] = useState<'latest' | 'forYou'>('latest');
  const [sortOrder, setSortOrder] = useState<'latest' | 'mostLiked'>('latest');
  const [activeSheet, setActiveSheet] = useState<
    'category' | 'sort' | 'report' | 'post-options' | null
  >(null);
  const [optionsPostId, setOptionsPostId] = useState<string | null>(null);
  const [reportedPostId, setReportedPostId] = useState<string | null>(null);
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [commentsRequest, setCommentsRequest] = useState(0);
  const handledPostId = useRef<string | null>(null);
  const pendingReportPostId = useRef<string | null>(null);
  const authDraftBody = useRef<string | null>(null);
  const [composerInstance, setComposerInstance] = useState(0);
  const syncedOperations = (
    syncStatus as {
      syncedOperations?: {
        operation: string;
        payload?: { remote?: { body?: string }; body?: string; post_id?: string };
      }[];
    } | null
  )?.syncedOperations;
  useEffect(() => {
    const message = (writeStatus as { message?: string } | null)?.message;
    if (!message || message === 'Sent' || message === 'Saved item removed') return;
    Alert.alert('Write status', message);
  }, [writeStatus]);
  useEffect(() => {
    const confirmed = syncedOperations?.some(
      (operation) =>
        operation.operation === 'community_post' &&
        (operation.payload?.remote?.body || operation.payload?.body) === authDraftBody.current,
    );
    if (confirmed && authDraftBody.current) {
      authDraftBody.current = null;
      setComposerInstance((current) => current + 1);
      Alert.alert('Post sent', 'Your post was published.');
    }
  }, [syncedOperations]);
  useEffect(() => {
    const confirmedReport = syncedOperations?.some(
      (operation) =>
        operation.operation === 'community_post_report' &&
        operation.payload?.post_id === pendingReportPostId.current,
    );
    if (confirmedReport && pendingReportPostId.current) {
      pendingReportPostId.current = null;
      Alert.alert('Report sent');
    }
  }, [syncedOperations]);
  useEffect(() => {
    if (!route?.params?.compose) return undefined;
    const timer = setTimeout(() => navigation.setParams?.({ compose: undefined }), 500);
    return () => clearTimeout(timer);
  }, [navigation, route?.params?.compose]);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onViewableItemsChanged = useCallback<
    NonNullable<FlatListProps<FeedPost>['onViewableItemsChanged']>
  >(({ viewableItems }) => {
    setVisiblePostIds(new Set(viewableItems.map(({ item }) => item?.id).filter(Boolean)));
  }, []);
  const feed = useCommunityFeed({
    activeSpace: { id: null, slug: 'general' },
    communityReady: true,
    generalSpaceId: null,
    session,
    providers: providers || [],
    navigation,
    onUserBlocked: () => undefined,
  }) as {
    posts: CommunityPost[];
    loading: boolean;
    refreshing: boolean;
    error: string;
    hasMore: boolean;
    refresh: () => Promise<void>;
    loadMore: () => void;
    loadPostById: (postId: string) => Promise<CommunityPost | null>;
    publishPost: (input: { text: string; imageUri?: string; category: string }) => Promise<boolean>;
    deletePost: (postId: string) => Promise<boolean>;
    toggleLike: (postId: string) => Promise<boolean>;
    toggleSave: (postId: string) => Promise<boolean>;
    addComment: (postId: string, text: string) => Promise<boolean>;
    reconcileCommunityWrites: (operations: unknown[]) => Promise<void>;
    loadComments: (postId: string) => Promise<{ id: string; post_id: string; body: string }[]>;
    reportPost: (
      postId: string,
      reason: string,
    ) => Promise<false | 'validated' | 'sent' | 'queued'>;
    blockUser: (userId: string) => void;
    comments: { id: string; post_id: string; body: string }[];
    commentsLoading: boolean;
    commentedPostIds?: Set<string>;
    commentActivityError?: string | null;
  };
  const {
    posts,
    loading,
    refreshing,
    error,
    hasMore,
    refresh,
    loadMore,
    publishPost,
    toggleLike,
    toggleSave,
    addComment,
    reconcileCommunityWrites,
    loadComments,
    reportPost,
    blockUser,
    comments,
    commentsLoading,
    commentedPostIds = new Set<string>(),
    commentActivityError,
    loadPostById,
    deletePost,
  } = feed;
  const processedFailedWrites = useRef(new Set<string>());
  const finishedCommunityOperations = syncStatus as {
    failedOperations?: { id: string; operation: string; payload?: unknown }[];
    syncedOperations?: { id: string; operation: string; payload?: unknown }[];
  } | null;
  const failedCommunityOperations = finishedCommunityOperations?.failedOperations || [];
  const syncedCommunityOperations = finishedCommunityOperations?.syncedOperations || [];
  useEffect(() => {
    const writes = [
      ...failedCommunityOperations.map((item) => ({ ...item, state: 'failed' })),
      ...syncedCommunityOperations.map((item) => ({ ...item, state: 'synced' })),
    ];
    const activeKeys = new Set(
      writes.map(
        (item) =>
          `${item.id}:${item.state}:${(item.payload as { _sync?: { retryVersion?: number } })?._sync?.retryVersion || 0}`,
      ),
    );
    processedFailedWrites.current = new Set(
      [...processedFailedWrites.current].filter((key) => activeKeys.has(key)),
    );
    const newlyFinished = writes.filter((item) => {
      if (!['community_like', 'community_saved_post', 'community_comment'].includes(item.operation))
        return false;
      const key = `${item.id}:${item.state}:${(item.payload as { _sync?: { retryVersion?: number } })?._sync?.retryVersion || 0}`;
      if (processedFailedWrites.current.has(key)) return false;
      processedFailedWrites.current.add(key);
      return true;
    });
    if (newlyFinished.length) void reconcileCommunityWrites(newlyFinished);
  }, [failedCommunityOperations, syncedCommunityOperations, reconcileCommunityWrites]);

  useEffect(
    () => () => {
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
    },
    [],
  );

  const requireSignIn = useCallback(
    () =>
      Alert.alert('Sign in required', 'Sign in to interact with community posts.', [
        { text: 'Not now', style: 'ghost' },
        { text: 'Sign in', onPress: () => navigation.navigate('Welcome') },
      ]),
    [navigation],
  );
  const onRequireAuth = session ? undefined : requireSignIn;
  useEffect(() => {
    const postId = route?.params?.postId;
    if (!postId) {
      handledPostId.current = null;
      return undefined;
    }
    if (feed.loading || handledPostId.current === postId) return undefined;
    handledPostId.current = postId;
    let active = true;
    setSelectedCategory(null);
    const openTarget = (post: CommunityPost | null) => {
      if (!active) return;
      if (!post) {
        Alert.alert(
          'Post unavailable',
          'This post may have been deleted and is no longer available.',
        );
      } else {
        setHighlightedPostId(postId);
        if (route?.params?.openComments) {
          setCommentsPostId(postId);
          setCommentsRequest((request) => request + 1);
        }
      }
      navigation.setParams?.({ postId: undefined, openComments: undefined });
    };
    const loadedPost = posts.find((post) => post.id === postId);
    if (loadedPost) openTarget(loadedPost);
    else
      void loadPostById(postId)
        .then(openTarget)
        .catch((error: unknown) => {
          if (!active) return;
          Alert.alert(
            'Could not open post',
            error instanceof Error ? error.message : 'Please try again.',
          );
          navigation.setParams?.({ postId: undefined, openComments: undefined });
        });
    return () => {
      active = false;
    };
  }, [
    feed.loading,
    loadPostById,
    navigation,
    posts,
    route?.params?.openComments,
    route?.params?.postId,
  ]);

  const handlePosted = useCallback((_post: Post) => {
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      scrollTimer.current = null;
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, 50);
  }, []);
  const submitPost = useCallback(
    async (text: string, imageUri?: string): Promise<Post> => {
      try {
        const published = await publishPost({ text, imageUri, category: 'discussion' });
        if (!published) throw new Error('Post was not sent. Please try again.');
        return {
          id: `published-${Date.now()}`,
          username: 'You',
          timeAgo: 'Just now',
          text,
          category: 'Discussion',
          likes: 0,
          comments: 0,
          online: false,
          imageUri,
        };
      } catch (error) {
        if (
          isAuthSessionError(error) ||
          (typeof error === 'object' && error !== null && 'authRequired' in error) ||
          hasErrorCode(error, 'QUEUED_OFFLINE')
        )
          authDraftBody.current = text.trim();
        throw error;
      }
    },
    [publishPost],
  );
  const handleAuthRequired = useCallback(
    () =>
      Alert.alert('Please sign in again', 'Your post is saved and will resume after you sign in.', [
        { text: 'Sign in again', onPress: () => navigation.navigate('Welcome') },
        { text: 'Keep draft', style: 'cancel' },
      ]),
    [navigation],
  );
  const runAction = useCallback(
    (action: Promise<unknown>, title: string, successMessage?: string) => {
      void action
        .then(() => {
          if (successMessage) Alert.alert(successMessage);
        })
        .catch((actionError: unknown) => {
          Alert.alert(
            isAuthSessionError(actionError) ? 'Please sign in again' : title,
            isAuthSessionError(actionError)
              ? 'Your saved write will resume after you sign in.'
              : actionError instanceof Error
                ? actionError.message
                : 'Please try again.',
            isAuthSessionError(actionError)
              ? [
                  { text: 'Sign in again', onPress: () => navigation.navigate('Welcome') },
                  { text: 'Keep draft', style: 'cancel' },
                ]
              : undefined,
          );
        });
    },
    [navigation],
  );
  const runReport = useCallback(
    (postId: string, action: Promise<false | 'validated' | 'sent' | 'queued'>) => {
      void action
        .then((result) => {
          if (result === 'queued') {
            pendingReportPostId.current = postId;
            Alert.alert("Report saved, will send when you're online");
          } else if (result === 'sent') Alert.alert('Report sent');
        })
        .catch((actionError: unknown) => {
          Alert.alert(
            isAuthSessionError(actionError) ? 'Please sign in again' : 'Could not send report',
            isAuthSessionError(actionError)
              ? 'Your saved write will resume after you sign in.'
              : actionError instanceof Error
                ? actionError.message
                : 'Please try again.',
            isAuthSessionError(actionError)
              ? [
                  { text: 'Sign in again', onPress: () => navigation.navigate('Welcome') },
                  { text: 'Keep draft', style: 'cancel' },
                ]
              : undefined,
          );
        });
    },
    [navigation],
  );
  const handleReport = useCallback((postId: string) => {
    setReportedPostId(postId);
    setActiveSheet('report');
  }, []);
  const renderPost = useCallback(
    ({ item, index }: { item: FeedPost; index: number }) => {
      const postComments = comments
        .filter((comment) => comment.post_id === item.id)
        .map((comment) => comment.body);
      return (
        <PostCard
          {...item}
          postId={item.id}
          commentItems={postComments}
          ownerId={authOwnerId}
          onRequireAuth={onRequireAuth}
          openCommentsRequest={commentsPostId === item.id ? commentsRequest : undefined}
          highlighted={highlightedPostId === item.id}
          onAuthor={() => navigation.navigate('CommunityProfile', { authorId: item.authorId })}
          onAuthSessionExpired={promptAuthWrite}
          onLike={() => runAction(toggleLike(item.id), 'Could not update like')}
          onBookmark={() => runAction(toggleSave(item.id), 'Could not save post')}
          onLoadComments={() => loadComments(item.id)}
          onAddComment={(text) => addComment(item.id, text)}
          onReport={() => handleReport(item.id)}
          onBlock={() => blockUser(item.authorId)}
          onOpenMoreOptions={() => {
            setOptionsPostId(item.id);
            setActiveSheet('post-options');
          }}
          commentsLoading={commentsLoading}
          index={index}
          visible={visiblePostIds.has(item.id)}
          variant="compact"
        />
      );
    },
    [
      addComment,
      blockUser,
      comments,
      commentsLoading,
      authOwnerId,
      commentsPostId,
      commentsRequest,
      highlightedPostId,
      handleReport,
      loadComments,
      onRequireAuth,
      promptAuthWrite,
      runAction,
      toggleLike,
      toggleSave,
      visiblePostIds,
    ],
  );
  const feedPosts: FeedPost[] = useMemo(
    () =>
      posts.map((post) => ({
        id: post.id,
        authorId: post.authorId,
        username: post.username,
        createdAt: post.createdAt,
        timeAgo: formatTimeAgo(post.createdAt),
        text: post.text,
        category: post.category,
        likes: post.likeCount,
        comments: post.commentCount,
        liked: post.likedByMe,
        bookmarked: post.savedByMe,
        online: false,
        imageUri: post.imageUrl,
      })),
    [posts],
  );
  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    feedPosts.forEach((post) => counts.set(post.category, (counts.get(post.category) || 0) + 1));
    return [
      {
        id: '__all__',
        label: `All categories (${feedPosts.length})`,
        selected: selectedCategory === null,
      },
      ...COMMUNITY_CATEGORIES.map((category) => ({
        id: category,
        label: `${category} (${counts.get(category) || 0})`,
        selected: selectedCategory === category,
      })),
    ] satisfies GlowSheetOption[];
  }, [feedPosts, selectedCategory]);
  const optionsPost = feedPosts.find((post) => post.id === optionsPostId);
  const forYouPosts = feedPosts.filter(
    (post) => post.authorId === authOwnerId || post.liked || commentedPostIds.has(post.id),
  );
  const visiblePosts = filterCommunityPosts(
    feedTab === 'forYou' ? forYouPosts : feedPosts,
    selectedCategory,
  )
    .slice()
    .sort((left, right) =>
      sortOrder === 'mostLiked'
        ? right.likes - left.likes
        : (Date.parse(right.createdAt) || 0) - (Date.parse(left.createdAt) || 0),
    );
  useEffect(() => {
    if (!highlightedPostId) return undefined;
    const index = visiblePosts.findIndex((post) => post.id === highlightedPostId);
    if (index < 0) return undefined;
    listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.25 });
    const timer = setTimeout(() => setHighlightedPostId(null), 3000);
    return () => clearTimeout(timer);
  }, [highlightedPostId, visiblePosts]);
  const chooseCategory = useCallback(() => {
    setActiveSheet('category');
  }, []);
  const chooseSort = useCallback(() => {
    setActiveSheet('sort');
  }, []);
  const sheetOptions: GlowSheetOption[] =
    activeSheet === 'category'
      ? categoryOptions
      : activeSheet === 'sort'
        ? [
            { id: 'latest', label: 'Latest', selected: sortOrder === 'latest' },
            { id: 'mostLiked', label: 'Most liked', selected: sortOrder === 'mostLiked' },
          ]
        : activeSheet === 'report'
          ? [
              { id: 'spam_or_scam', label: 'Spam or scam' },
              { id: 'harassment_or_hate', label: 'Harassment or hate' },
              { id: 'private_information', label: 'Private information' },
              { id: 'other', label: 'Other concern' },
            ]
          : activeSheet === 'post-options' && optionsPost
            ? [
                {
                  id: 'bookmark',
                  label: optionsPost.bookmarked ? 'Remove bookmark' : 'Bookmark',
                  selected: optionsPost.bookmarked,
                },
                { id: 'share', label: 'Share' },
                ...(optionsPost.authorId === authOwnerId
                  ? [{ id: 'delete', label: 'Delete post' }]
                  : [
                      { id: 'report', label: 'Report' },
                      { id: 'block', label: 'Block author' },
                    ]),
              ]
            : [];
  const handleSheetSelect = useCallback(
    (option: GlowSheetOption) => {
      setActiveSheet(null);
      if (activeSheet === 'category')
        setSelectedCategory(option.id === '__all__' ? null : option.id);
      else if (activeSheet === 'sort')
        setSortOrder(option.id === 'mostLiked' ? 'mostLiked' : 'latest');
      else if (activeSheet === 'report' && reportedPostId) {
        runReport(reportedPostId, reportPost(reportedPostId, option.id));
      } else if (activeSheet === 'post-options' && optionsPost) {
        if (option.id === 'bookmark') {
          if (onRequireAuth) onRequireAuth();
          else runAction(toggleSave(optionsPost.id), 'Could not save post');
        } else if (option.id === 'share') {
          void Share.share({ message: `${optionsPost.text}\n\nShared from ChodhiQ` }).catch(
            (error: unknown) => {
              console.warn('Unable to share community post.', error);
              Alert.alert('Could not share post', 'Please try sharing this post again.');
            },
          );
        } else if (option.id === 'report') {
          if (onRequireAuth) onRequireAuth();
          else handleReport(optionsPost.id);
        } else if (option.id === 'block') {
          if (onRequireAuth) onRequireAuth();
          else blockUser(optionsPost.authorId);
        } else if (option.id === 'delete' && optionsPost.authorId === authOwnerId) {
          Alert.alert(
            'Delete this post?',
            'This will permanently remove your post and its comments.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () =>
                  runAction(deletePost(optionsPost.id), 'Could not delete post', 'Post deleted'),
              },
            ],
          );
        }
      }
    },
    [
      activeSheet,
      blockUser,
      authOwnerId,
      deletePost,
      handleReport,
      onRequireAuth,
      optionsPost,
      reportPost,
      reportedPostId,
      runAction,
      runReport,
      toggleSave,
    ],
  );
  const renderEmptyState = () => {
    if (loading) return <FeedLoadingSkeleton />;
    if (error)
      return (
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>{error}</Text>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="Retry loading posts"
            onPress={() => void refresh()}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Retry</Text>
          </AnimatedPressable>
        </View>
      );
    if (feedTab === 'forYou' && !authOwnerId)
      return (
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>
            Sign in to see posts you have shared, liked, or commented on.
          </Text>
          <AnimatedPressable
            accessibilityRole="button"
            onPress={onRequireAuth}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Sign in</Text>
          </AnimatedPressable>
        </View>
      );
    if (feedTab === 'forYou' && commentActivityError && forYouPosts.length === 0)
      return (
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>{commentActivityError}</Text>
          <AnimatedPressable
            accessibilityRole="button"
            onPress={() => void refresh()}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Retry</Text>
          </AnimatedPressable>
        </View>
      );
    return (
      <View style={styles.stateContainer}>
        {feedTab === 'forYou' ? (
          <Text style={styles.stateText}>
            Posts you share, like, or comment on will appear here.
          </Text>
        ) : selectedCategory !== null ? (
          <>
            <Text style={styles.stateText}>No posts in this category yet</Text>
            <AnimatedPressable
              accessibilityRole="button"
              onPress={() => setSelectedCategory(null)}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Show all categories</Text>
            </AnimatedPressable>
          </>
        ) : (
          <Text style={styles.stateText}>No posts yet. Be the first to share</Text>
        )}
      </View>
    );
  };
  const renderFooter = () => {
    if (loading && posts.length > 0) return <ActivityIndicator color={theme.colors.primary} />;
    if (error && posts.length > 0)
      return (
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>{error}</Text>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="Retry loading posts"
            onPress={() => void refresh()}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Retry</Text>
          </AnimatedPressable>
        </View>
      );
    if (hasMore) return <ActivityIndicator color={theme.colors.primary} />;
    return null;
  };

  return (
    <Screen edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.FlatList
          ref={listRef}
          data={visiblePosts}
          keyExtractor={keyExtractor}
          renderItem={renderPost}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          onScrollToIndexFailed={({ index }) => {
            setTimeout(() => listRef.current?.scrollToIndex({ index, animated: true }), 100);
          }}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          ItemSeparatorComponent={PostSeparator}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          ListHeaderComponent={
            <View style={[styles.listHeader, compact && styles.compactListHeader]}>
              <View style={[styles.header, compact && styles.compactHeader]}>
                <View style={[styles.identity, compact && styles.compactIdentity]}>
                  <LinearGradient
                    pointerEvents="none"
                    colors={[
                      theme.colors.primaryDark,
                      theme.colors.primary,
                      theme.colors.primaryDeep,
                    ]}
                    style={styles.logoBorder}
                  >
                    <View style={styles.logoTile}>
                      <Users color={theme.colors.primary} size={26} strokeWidth={2} />
                    </View>
                  </LinearGradient>
                  <View style={styles.heading}>
                    <Text style={styles.title}>Community feed</Text>
                    <Text style={styles.subtitle}>Stories from people around you</Text>
                  </View>
                </View>

                <AnimatedPressable
                  accessibilityLabel="All categories"
                  accessibilityRole="button"
                  accessibilityHint="Choose a category to filter the feed"
                  onPress={chooseCategory}
                  style={[styles.categoryButton, compact && styles.compactCategoryButton]}
                >
                  <Text numberOfLines={1} style={styles.categoryLabel}>
                    {selectedCategory || 'All categories'}
                  </Text>
                  <ChevronDown color={theme.colors.textSecondary} size={16} />
                </AnimatedPressable>
              </View>

              <PostComposer
                key={composerInstance}
                onSubmit={submitPost}
                onPosted={handlePosted}
                onAuthRequired={handleAuthRequired}
                onRequireAuth={onRequireAuth}
                focusComposer={Boolean(route?.params?.compose)}
              />

              <TabPills
                tabs={feedTabs}
                value={feedTab}
                onChange={(value) => {
                  if (value === 'latest' || value === 'forYou') setFeedTab(value);
                }}
              />

              <View style={styles.infoRow}>
                <PulseDot size={8} />
                <Text style={styles.infoText}>
                  {visiblePosts.length}{' '}
                  {visiblePosts.length === 1 ? 'conversation' : 'conversations'} in{' '}
                  <Text style={styles.infoEmphasis}>{selectedCategory || 'General'}</Text>
                </Text>
                <View style={styles.divider} />
                <AnimatedPressable
                  accessibilityRole="button"
                  accessibilityLabel="Feed filters"
                  hitSlop={8}
                  onPress={chooseSort}
                >
                  <SlidersHorizontal color={theme.colors.textSecondary} size={20} />
                </AnimatedPressable>
              </View>
            </View>
          }
          contentContainerStyle={[
            styles.content,
            compact && styles.compactContent,
            { paddingBottom: Math.max(140, getTabBarContentPadding(insets.bottom)) },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refresh()}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
              progressBackgroundColor={theme.colors.surface}
            />
          }
          itemLayoutAnimation={canAnimate ? LinearTransition.duration(320) : undefined}
          showsVerticalScrollIndicator={false}
        />
      </KeyboardAvoidingView>
      <Modal
        visible={activeSheet !== null}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setActiveSheet(null)}
      >
        <View
          style={[
            styles.sheetBackdrop,
            { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="Close menu"
            onPress={() => setActiveSheet(null)}
            style={StyleSheet.absoluteFill}
          />
          <GlassView intensity={42} style={styles.actionSheet}>
            <View style={styles.sheetHeading}>
              <Text accessibilityRole="header" style={styles.sheetTitle}>
                {activeSheet === 'category'
                  ? 'Filter by category'
                  : activeSheet === 'sort'
                    ? 'Feed options'
                    : activeSheet === 'post-options'
                      ? 'Post options'
                      : 'Report post'}
              </Text>
              <Text style={styles.sheetSubtitle}>
                {activeSheet === 'category'
                  ? 'Choose which conversations to show.'
                  : activeSheet === 'sort'
                    ? 'Choose how to order conversations.'
                    : activeSheet === 'post-options'
                      ? 'Choose an action for this post.'
                      : 'Choose a reason for reporting this post.'}
              </Text>
            </View>
            <ScrollView
              style={styles.sheetOptionsScroll}
              contentContainerStyle={styles.sheetOptions}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {sheetOptions.map((option) => (
                <AnimatedPressable
                  key={option.id}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                  accessibilityState={{ selected: Boolean(option.selected) }}
                  onPress={() => handleSheetSelect(option)}
                  style={[styles.sheetOption, option.selected && styles.sheetOptionSelected]}
                >
                  <Text style={styles.sheetOptionLabel}>{option.label}</Text>
                  {option.selected ? <Check color={theme.colors.primary} size={20} /> : null}
                </AnimatedPressable>
              ))}
            </ScrollView>
            <GlowButton
              label="Close"
              variant="ghost"
              size="md"
              stretch
              onPress={() => setActiveSheet(null)}
              buttonStyle={styles.sheetClose}
            />
          </GlassView>
        </View>
      </Modal>
    </Screen>
  );
}

function PostSeparator() {
  return <View style={styles.postSeparator} />;
}

function formatTimeAgo(value: string) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'Recently';
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(new Date(timestamp));
}

function FeedLoadingSkeleton() {
  return (
    <View accessibilityLabel="Loading posts" style={styles.skeletonList}>
      {[0, 1, 2].map((item) => (
        <View key={item} style={styles.skeletonCard}>
          <View style={styles.skeletonHeader}>
            <View style={styles.skeletonAvatar} />
            <View style={styles.skeletonTextBlock}>
              <View style={styles.skeletonLongLine} />
              <View style={styles.skeletonShortLine} />
            </View>
          </View>
          <View style={styles.skeletonBodyLine} />
          <View style={styles.skeletonBodyLine} />
          <View style={styles.skeletonShortLine} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  keyboardAvoiding: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 140,
  },
  compactContent: {
    paddingHorizontal: 16,
  },
  listHeader: {
    gap: 28,
    paddingBottom: 24,
  },
  compactListHeader: {
    gap: 24,
  },
  postSeparator: {
    height: 16,
  },
  stateContainer: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 28,
  },
  stateText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primaryDark,
  },
  retryText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.68)',
  },
  actionSheet: {
    width: '100%',
    maxWidth: 600,
    maxHeight: '78%',
    alignSelf: 'center',
    padding: 20,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: theme.colors.surface,
  },
  sheetHeading: { gap: 5, paddingBottom: 16 },
  sheetTitle: { color: theme.colors.textPrimary, fontSize: 20, fontWeight: '700' },
  sheetSubtitle: { color: theme.colors.textSecondary, fontSize: 14, lineHeight: 20 },
  sheetOptionsScroll: { flexShrink: 1 },
  sheetOptions: { gap: 8, paddingBottom: 12 },
  sheetOption: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    backgroundColor: 'rgba(11,18,16,0.78)',
  },
  sheetOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(31,229,160,0.1)',
  },
  sheetOptionLabel: { flex: 1, color: theme.colors.textPrimary, fontSize: 15, fontWeight: '600' },
  sheetClose: { borderWidth: 1, borderColor: theme.colors.border },
  skeletonList: {
    gap: 16,
  },
  skeletonCard: {
    minHeight: 180,
    justifyContent: 'center',
    gap: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.surface,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skeletonAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primaryDeep,
  },
  skeletonTextBlock: {
    flex: 1,
    gap: 8,
  },
  skeletonLongLine: {
    width: '64%',
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primaryDeep,
  },
  skeletonShortLine: {
    width: '36%',
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primaryDeep,
  },
  skeletonBodyLine: {
    width: '100%',
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primaryDeep,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  compactHeader: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 12,
  },
  identity: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  compactIdentity: {
    flex: 0,
    width: '100%',
  },
  logoBorder: {
    width: 56,
    height: 56,
    padding: 1.5,
    borderRadius: 18,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  logoTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16.5,
    backgroundColor: theme.colors.surface,
  },
  heading: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
    flexShrink: 1,
  },
  subtitle: {
    marginTop: 3,
    color: theme.colors.textSecondary,
    fontSize: 15,
    flexShrink: 1,
  },
  categoryButton: {
    minHeight: 40,
    maxWidth: 160,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  compactCategoryButton: {
    alignSelf: 'flex-end',
    maxWidth: '100%',
  },
  categoryLabel: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    flexShrink: 1,
  },
  infoRow: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    flexShrink: 1,
  },
  infoEmphasis: {
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  divider: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    minWidth: 12,
    backgroundColor: theme.colors.border,
  },
});
