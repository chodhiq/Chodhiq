import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  Bookmark,
  Clock3,
  Ellipsis,
  Globe2,
  MessageCircle,
  Share2,
  ThumbsUp,
} from 'lucide-react-native';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Avatar from './Avatar';
import { default as AnimatedPressable } from './ui/PressableScale';
import CategoryChip from './CategoryChip';
import GlowCard from './GlowCard';
import GlowSheet, { type GlowSheetOption } from './ui/GlowSheet';
import useEffectsLevel from '../src/hooks/useEffectsLevel';
import { theme } from '../theme';
import { AppAlert as Alert } from '../src/components/AppDialog';
import { isAuthSessionError } from '../src/data/syncPolicy';
import { runAuthResumableWrite } from '../src/data/authResumableWrite';

const footerIconColor = 'rgba(255,255,255,0.85)';
const triggerLightImpact = () => {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch((error: unknown) => {
    console.warn('Unable to trigger community feed haptic feedback.', error);
  });
};

export interface PostCardProps {
  index: number;
  postId?: string;
  username: string;
  timeAgo: string;
  text: string;
  category: string;
  likes: number;
  comments: number;
  commentItems?: string[];
  online: boolean;
  imageUri?: string;
  variant?: 'compact' | 'full';
  isNewCard?: boolean;
  visible?: boolean;
  ownerId?: string;
  onAuthor?: () => void;
  openCommentsRequest?: number;
  highlighted?: boolean;
  onRequireAuth?: () => void;
  onAuthSessionExpired?: (draft: { operation: string; payload: unknown; draftId: string }) => void;
  liked?: boolean;
  bookmarked?: boolean;
  onLike?: () => void;
  onBookmark?: () => void;
  onOpenMoreOptions?: () => void;
  onLoadComments?: () => Promise<unknown>;
  onAddComment?: (text: string) => Promise<boolean | void>;
  onReport?: () => void;
  onBlock?: () => void;
  commentsLoading?: boolean;
}

function PostCard({
  index,
  postId,
  username,
  timeAgo,
  text,
  category,
  likes,
  comments,
  commentItems,
  online,
  imageUri,
  variant = 'compact',
  isNewCard = false,
  visible = true,
  ownerId,
  onAuthor,
  openCommentsRequest,
  highlighted = false,
  onRequireAuth,
  onAuthSessionExpired,
  liked: likedProp,
  bookmarked: bookmarkedProp,
  onLike,
  onBookmark,
  onOpenMoreOptions,
  onLoadComments,
  onAddComment,
  onReport,
  onBlock,
  commentsLoading = false,
}: PostCardProps) {
  const effectsLevel = useEffectsLevel();
  const canAnimate = effectsLevel === 'full';
  const canPressAnimate = effectsLevel !== 'off';
  const [localLiked, setLocalLiked] = useState(false);
  const [localLikeCount, setLocalLikeCount] = useState(likes);
  const [localBookmarked, setLocalBookmarked] = useState(false);
  const [localCommentCount, setLocalCommentCount] = useState(comments);
  const [commentList, setCommentList] = useState<string[]>(commentItems || []);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentOpen, setCommentOpen] = useState(false);
  const [moreOptionsVisible, setMoreOptionsVisible] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [imageRatio, setImageRatio] = useState(1);
  const lastOpenedCommentsRequest = useRef<number | null>(null);
  const likeBounce = useSharedValue(1);
  const bookmarkBounce = useSharedValue(1);
  const liked = likedProp ?? localLiked;
  const likeCount = likedProp === undefined ? localLikeCount : likes;
  const bookmarked = bookmarkedProp ?? localBookmarked;
  const commentCount = onAddComment ? comments : localCommentCount;
  const displayedComments = onAddComment ? commentItems || [] : commentList;
  const initialCommentCount = commentItems?.length ?? 0;

  useEffect(() => {
    if (isNewCard) triggerLightImpact();
  }, [isNewCard]);

  const playBounce = useCallback((value: typeof likeBounce) => {
    value.value = withSequence(
      withTiming(1.35, { duration: 100 }),
      withSpring(1, { damping: 8, stiffness: 300 }),
    );
  }, []);
  const handleLike = useCallback(() => {
    if (onRequireAuth) {
      onRequireAuth();
      return;
    }
    if (onLike) {
      onLike();
    } else {
      setLocalLiked((current) => !current);
      setLocalLikeCount((current) => current + (liked ? -1 : 1));
    }
    if (canPressAnimate) playBounce(likeBounce);
    triggerLightImpact();
  }, [canPressAnimate, likeBounce, liked, onLike, onRequireAuth, playBounce]);
  const handleBookmark = useCallback(() => {
    if (onRequireAuth) {
      onRequireAuth();
      return;
    }
    if (onBookmark) onBookmark();
    else setLocalBookmarked((current) => !current);
    if (canPressAnimate) playBounce(bookmarkBounce);
    triggerLightImpact();
  }, [bookmarkBounce, canPressAnimate, onBookmark, onRequireAuth, playBounce]);
  const openComments = useCallback(async () => {
    if (onRequireAuth) {
      onRequireAuth();
      return;
    }
    if (onLoadComments) {
      try {
        await onLoadComments();
      } catch (error) {
        Alert.alert(
          'Comments unavailable',
          error instanceof Error ? error.message : 'Please try again.',
        );
      }
    }
    setCommentOpen(true);
  }, [onLoadComments, onRequireAuth]);
  useEffect(() => {
    if (openCommentsRequest == null || lastOpenedCommentsRequest.current === openCommentsRequest)
      return;
    lastOpenedCommentsRequest.current = openCommentsRequest;
    void openComments();
  }, [openComments, openCommentsRequest]);
  const handleShare = useCallback(async () => {
    try {
      await Share.share({ message: `${text}\n\nShared from ChodhiQ` });
    } catch (error) {
      console.warn('Unable to share community post.', error);
      Alert.alert('Could not share post', 'Please try sharing this post again.');
    }
  }, [text]);
  const handleMore = useCallback(() => {
    if (onOpenMoreOptions) {
      onOpenMoreOptions();
      return;
    }
    setMoreOptionsVisible(true);
  }, [onOpenMoreOptions]);
  const moreOptions: GlowSheetOption[] = [
    { id: 'bookmark', label: bookmarked ? 'Remove bookmark' : 'Bookmark', selected: bookmarked },
    { id: 'share', label: 'Share' },
    ...(onReport ? [{ id: 'report', label: 'Report' }] : []),
    ...(onBlock ? [{ id: 'block', label: 'Block author' }] : []),
  ];
  const selectMoreOption = useCallback(
    (option: GlowSheetOption) => {
      setMoreOptionsVisible(false);
      if (option.id === 'bookmark') handleBookmark();
      else if (option.id === 'share') void handleShare();
      else if (option.id === 'report' && onReport) {
        if (onRequireAuth) onRequireAuth();
        else onReport();
      } else if (option.id === 'block' && onBlock) {
        if (onRequireAuth) onRequireAuth();
        else onBlock();
      }
    },
    [handleBookmark, handleShare, onBlock, onReport, onRequireAuth],
  );
  const handleAddComment = useCallback(async () => {
    if (onRequireAuth) {
      onRequireAuth();
      return;
    }
    const cleanComment = commentDraft.trim();
    if (!cleanComment) return;
    try {
      if (onAddComment) {
        const added = await runAuthResumableWrite({
          operation: 'community_comment',
          ownerId,
          payload: { postId: String(postId || index), body: cleanComment },
          write: () => onAddComment(cleanComment),
          onAuthRequired: (draft: { operation: string; payload: unknown; draftId: string }) =>
            onAuthSessionExpired?.(draft),
        });
        if (added === false) return;
      } else {
        setCommentList((current) => [...current, cleanComment]);
        setLocalCommentCount((current) => current + 1);
      }
      setCommentDraft('');
      triggerLightImpact();
    } catch (error) {
      if (isAuthSessionError(error) || (error as { authRequired?: boolean })?.authRequired) return;
      else
        Alert.alert(
          'Could not comment',
          error instanceof Error ? error.message : 'Please try again.',
        );
    }
  }, [commentDraft, index, onAddComment, onAuthSessionExpired, onRequireAuth, postId]);
  const likeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeBounce.value }],
  }));
  const bookmarkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bookmarkBounce.value }],
  }));
  const cardScale = useSharedValue(isNewCard && canAnimate ? 0.96 : 1);
  const cardScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));
  useEffect(() => {
    if (isNewCard && canAnimate) {
      cardScale.value = withSpring(1, { damping: 16, stiffness: 180 });
    } else {
      cardScale.value = 1;
    }
  }, [canAnimate, cardScale, isNewCard]);
  const animateCardPressIn = useCallback(() => {
    cardScale.value =
      canPressAnimate && visible ? withSpring(0.97, { damping: 16, stiffness: 280 }) : 1;
  }, [canPressAnimate, cardScale, visible]);
  const animateCardPressOut = useCallback(() => {
    cardScale.value =
      canPressAnimate && visible ? withSpring(1, { damping: 12, stiffness: 260 }) : 1;
  }, [canPressAnimate, cardScale, visible]);
  const entrance =
    canAnimate && visible
      ? isNewCard
        ? FadeInDown.springify().withInitialValues({
            opacity: 0,
            transform: [{ translateY: 24 }],
          })
        : FadeInDown.delay(Math.min(index, 8) * 36).duration(230)
      : undefined;

  return (
    <Animated.View entering={entrance} style={cardScaleStyle}>
      <View
        onTouchStart={animateCardPressIn}
        onTouchEnd={animateCardPressOut}
        onTouchCancel={animateCardPressOut}
      >
        <GlowCard
          isNew={isNewCard}
          visible={visible}
          style={highlighted ? styles.highlightedCard : undefined}
        >
          <View style={styles.header}>
            <AnimatedPressable
              testID="btn-post-author"
              accessibilityRole="button"
              accessibilityLabel={`View ${username} profile`}
              onPress={onAuthor}
              style={styles.author}
            >
              <Avatar username={username} online={online} />
              <View style={styles.authorDetails}>
                <Text style={styles.username} numberOfLines={1}>
                  {username}
                </Text>
                <View style={styles.timeRow}>
                  {timeAgo === 'Just now' ? (
                    <Globe2 color={theme.colors.primary} size={13} />
                  ) : (
                    <Clock3 color={theme.colors.textSecondary} size={13} />
                  )}
                  <Text style={styles.time}>{timeAgo}</Text>
                </View>
              </View>
            </AnimatedPressable>
            <AnimatedPressable
              accessibilityLabel="More post options"
              accessibilityRole="button"
              hitSlop={8}
              style={styles.iconButton}
              onPress={handleMore}
            >
              <Ellipsis color={theme.colors.textPrimary} size={22} />
            </AnimatedPressable>
          </View>

          <Text style={styles.body}>{text}</Text>
          {imageUri && (
            <AnimatedPressable
              testID="btn-open-post-image"
              accessibilityRole="button"
              accessibilityLabel="Open full post image"
              onPress={() => setImageOpen(true)}
              style={styles.imageButton}
            >
              <Image
                accessibilityLabel="Post attachment"
                source={{ uri: imageUri }}
                resizeMode="contain"
                onLoad={({ nativeEvent }) => {
                  const { width, height } = nativeEvent.source;
                  if (width && height) setImageRatio(width / height);
                }}
                style={[styles.postImage, { aspectRatio: imageRatio }]}
              />
            </AnimatedPressable>
          )}

          <CategoryChip label={category} />

          <View style={styles.footer}>
            <View style={styles.engagement}>
              <AnimatedPressable
                testID="btn-post-like"
                accessibilityLabel={`${liked ? 'Unlike' : 'Like'} post, ${likeCount} likes`}
                accessibilityRole="button"
                hitSlop={8}
                haptic={false}
                onPress={handleLike}
                style={styles.countGroup}
              >
                <Animated.View style={likeStyle}>
                  <ThumbsUp
                    color={liked ? theme.colors.primary : footerIconColor}
                    size={18}
                    fill={liked ? theme.colors.primary : 'transparent'}
                  />
                </Animated.View>
                <Text style={[styles.count, liked && styles.activeCount]}>{likeCount}</Text>
              </AnimatedPressable>
              <AnimatedPressable
                testID="btn-post-comment"
                accessibilityRole="button"
                accessibilityLabel={`View comments, ${commentCount} comments`}
                onPress={() => void openComments()}
                style={styles.commentAction}
              >
                <MessageCircle color={footerIconColor} size={18} />
                <Text style={styles.commentActionLabel}>Comments ({commentCount})</Text>
              </AnimatedPressable>
            </View>
            <View style={styles.actions}>
              <AnimatedPressable
                testID="btn-post-bookmark"
                accessibilityLabel={bookmarked ? 'Remove bookmark' : 'Bookmark post'}
                accessibilityRole="button"
                hitSlop={8}
                haptic={false}
                onPress={handleBookmark}
              >
                <Animated.View style={bookmarkStyle}>
                  <Bookmark
                    color={bookmarked ? theme.colors.primary : footerIconColor}
                    size={19}
                    fill={bookmarked ? theme.colors.primary : 'transparent'}
                  />
                </Animated.View>
              </AnimatedPressable>
              <AnimatedPressable
                accessibilityLabel="Share post"
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => void handleShare()}
              >
                <Share2 color={footerIconColor} size={19} />
              </AnimatedPressable>
            </View>
          </View>
          {variant === 'full' && (
            <View style={styles.fullActions}>
              <AnimatedPressable
                accessibilityLabel={`${liked ? 'Unlike' : 'Like'} post`}
                accessibilityRole="button"
                haptic={false}
                onPress={handleLike}
                style={styles.fullAction}
              >
                <ThumbsUp
                  color={liked ? theme.colors.primary : footerIconColor}
                  size={17}
                  fill={liked ? theme.colors.primary : 'transparent'}
                />
                <Text style={[styles.fullActionLabel, liked && styles.activeCount]}>Like</Text>
              </AnimatedPressable>
              <AnimatedPressable
                accessibilityRole="button"
                accessibilityLabel={`Comment on post, ${commentCount} comments`}
                onPress={() => void openComments()}
                style={styles.fullAction}
              >
                <MessageCircle color={footerIconColor} size={17} />
                <Text style={styles.fullActionLabel}>Comment</Text>
              </AnimatedPressable>
              <AnimatedPressable
                accessibilityLabel="Share post"
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => void handleShare()}
                style={styles.fullAction}
              >
                <Share2 color={footerIconColor} size={17} />
                <Text style={styles.fullActionLabel}>Share</Text>
              </AnimatedPressable>
            </View>
          )}
        </GlowCard>
      </View>
      <Modal
        animationType="fade"
        transparent
        visible={commentOpen}
        onRequestClose={() => setCommentOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBackdrop}
        >
          <View style={styles.commentModal}>
            <Text style={styles.modalTitle}>Comments ({commentCount})</Text>
            <ScrollView
              style={styles.commentList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {commentsLoading ? (
                <Text style={styles.emptyComments}>Loading comments...</Text>
              ) : displayedComments.length > 0 ? (
                displayedComments.map((comment, index) => (
                  <View key={`${index}-${comment}`} style={styles.commentItem}>
                    <Avatar username={index >= initialCommentCount ? 'You' : username} />
                    <View style={styles.commentContent}>
                      <Text style={styles.commentAuthor}>
                        {index >= initialCommentCount ? 'You' : username}
                      </Text>
                      <Text style={styles.commentText}>{comment}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyComments}>No comments yet. Be the first to comment.</Text>
              )}
            </ScrollView>
            <TextInput
              accessibilityLabel="Write a comment"
              multiline
              maxLength={500}
              onChangeText={setCommentDraft}
              placeholder="Write your comment..."
              placeholderTextColor={theme.colors.textSecondary}
              style={styles.commentInput}
              value={commentDraft}
            />
            <View style={styles.modalActions}>
              <AnimatedPressable
                testID="btn-post-comment-close"
                accessibilityRole="button"
                onPress={() => setCommentOpen(false)}
                style={styles.modalButton}
              >
                <Text style={styles.cancelLabel}>Cancel</Text>
              </AnimatedPressable>
              <AnimatedPressable
                testID="btn-post-comment-submit"
                accessibilityRole="button"
                disabled={!commentDraft.trim()}
                onPress={() => void handleAddComment()}
                style={[
                  styles.modalButton,
                  styles.submitButton,
                  !commentDraft.trim() && styles.disabledButton,
                ]}
              >
                <Text style={styles.submitLabel}>Comment</Text>
              </AnimatedPressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {imageOpen && imageUri ? (
        <PostImageViewer
          imageUri={imageUri}
          onClose={() => setImageOpen(false)}
          canAnimate={canAnimate}
        />
      ) : null}
      {!onOpenMoreOptions ? (
        <GlowSheet
          visible={moreOptionsVisible}
          title="Post options"
          subtitle="Choose an action for this post."
          options={moreOptions}
          onSelect={selectMoreOption}
          onClose={() => setMoreOptionsVisible(false)}
        />
      ) : null}
    </Animated.View>
  );
}

function PostImageViewer({
  imageUri,
  onClose,
  canAnimate,
}: {
  imageUri: string;
  onClose: () => void;
  canAnimate: boolean;
}) {
  const scale = useSharedValue(1);
  const pinchStartScale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const imageStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));
  const pinch = Gesture.Pinch()
    .onBegin(() => {
      pinchStartScale.value = scale.value;
    })
    .onUpdate((event) => {
      scale.value = Math.max(1, Math.min(4, pinchStartScale.value * event.scale));
    })
    .onEnd(() => {
      if (scale.value <= 1) translateY.value = canAnimate ? withSpring(0) : 0;
    });
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const nextScale = scale.value > 1 ? 1 : 2;
      scale.value = canAnimate ? withSpring(nextScale) : nextScale;
      translateY.value = canAnimate ? withSpring(0) : 0;
    });
  const pan = Gesture.Pan()
    .activeOffsetY(12)
    .failOffsetX([-24, 24])
    .onUpdate((event) => {
      if (scale.value <= 1) translateY.value = Math.max(0, event.translationY);
    })
    .onEnd(() => {
      if (scale.value <= 1 && translateY.value > 120) runOnJS(onClose)();
      else translateY.value = canAnimate ? withSpring(0) : 0;
    });
  const gestures = Gesture.Simultaneous(pinch, doubleTap, pan);

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <GestureHandlerRootView style={styles.imageViewer}>
        <View style={styles.imageViewer}>
          <AnimatedPressable
            testID="btn-close-post-image"
            accessibilityRole="button"
            accessibilityLabel="Close image"
            onPress={onClose}
            style={styles.imageViewerClose}
          >
            <Text style={styles.imageViewerCloseLabel}>Close</Text>
          </AnimatedPressable>
          <GestureDetector gesture={gestures}>
            <Animated.View style={styles.imageViewerContent}>
              <Animated.Image
                source={{ uri: imageUri }}
                resizeMode="contain"
                accessibilityLabel="Full post image"
                style={[styles.fullPostImage, imageStyle]}
              />
            </Animated.View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

export default memo(PostCard);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  highlightedCard: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  author: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  authorDetails: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  username: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  time: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    flexShrink: 1,
  },
  iconButton: {
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    lineHeight: 30,
  },
  postImage: {
    width: '100%',
    maxHeight: 360,
    borderRadius: 18,
    backgroundColor: theme.colors.primaryDeep,
  },
  imageButton: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: theme.colors.primaryDeep,
  },
  imageViewer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  imageViewerClose: {
    zIndex: 1,
    minHeight: 56,
    alignSelf: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 36 : 20,
  },
  imageViewerCloseLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  imageViewerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fullPostImage: {
    width: '100%',
    height: '100%',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingTop: 2,
  },
  engagement: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 20,
  },
  countGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  commentAction: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  commentActionLabel: {
    color: footerIconColor,
    fontSize: 13,
  },
  count: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
  },
  activeCount: {
    color: theme.colors.primary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  fullActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  fullAction: {
    flex: 1,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  fullActionLabel: {
    color: footerIconColor,
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  commentModal: {
    maxHeight: '90%',
    gap: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
  },
  modalTitle: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  commentList: {
    maxHeight: 280,
    flexShrink: 1,
    gap: 14,
  },
  commentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  commentContent: {
    flex: 1,
    gap: 3,
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  commentAuthor: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  commentText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyComments: {
    paddingVertical: 16,
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  commentInput: {
    minHeight: 100,
    maxHeight: 180,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    color: theme.colors.textPrimary,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  submitButton: {
    backgroundColor: theme.colors.primaryDark,
  },
  disabledButton: {
    backgroundColor: '#232A26',
    borderColor: '#747E78',
    borderWidth: 1,
  },
  cancelLabel: {
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  submitLabel: {
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
});
