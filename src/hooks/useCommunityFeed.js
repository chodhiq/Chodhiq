import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppAlert as Alert } from '../components/AppDialog';
import { canReportContent, reportFailureMessage } from '../components/community/communitySafety';
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
  removeLocalPost,
} from '../data/localDatabase';
import { supabase } from '../lib/supabase';
import { mergeCommunityPage } from '../lib/communityPaging';
import { communityFeedErrorMessage, withCommunityFeedDeadline } from '../lib/communityFeedDeadline';
import { classifySyncError, isAuthSessionError } from '../data/syncPolicy';
import { showButtonToast } from '../lib/buttonToast';

const PAGE_SIZE = 30;
const COMMENT_ACTIVITY_PAGE_SIZE = 1000;
const DEFAULT_COUNTS = { like_count: 0, comment_count: 0, is_liked: false };
const POST_TYPES = {
  discussion: 'Discussion',
  experience: 'Experience',
  recommendation: 'Recommend',
  complaint: 'Complaint',
  promotion: 'Promotion',
};
const authRequiredState = { status: 'auth_required', attempts: 0, nextAttemptAt: null };
const pendingSyncState = { status: 'pending', attempts: 0, nextAttemptAt: null };

async function loadCommentedPostIds(userId) {
  const postIds = new Set();
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('community_comments')
      .select('id,post_id,created_at')
      .eq('author_id', userId)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + COMMENT_ACTIVITY_PAGE_SIZE - 1);
    if (error) throw error;
    const rows = data || [];
    rows.forEach((row) => postIds.add(row.post_id));
    if (rows.length < COMMENT_ACTIVITY_PAGE_SIZE) break;
    from += COMMENT_ACTIVITY_PAGE_SIZE;
  }
  return [...postIds];
}

function isTransientNetworkError(error) {
  const status = Number(error?.status || error?.statusCode || 0);
  return (
    classifySyncError(error) === 'retryable' &&
    (status >= 500 ||
      status === 408 ||
      status === 429 ||
      /network|fetch|offline|connection|timed? ?out/i.test(String(error?.message || '')))
  );
}

function mapPost(post, counts, savedIds) {
  const engagement = counts[post.id] || DEFAULT_COUNTS;
  return {
    ...post,
    id: post.id,
    authorId: post.author_id,
    username: post.author_name || 'Community member',
    createdAt: post.created_at,
    text: post.body,
    imageUrl: post.image_url,
    category: POST_TYPES[post.post_type] || post.post_type,
    likeCount: Number(engagement.like_count) || 0,
    commentCount: Number(engagement.comment_count) || 0,
    likedByMe: !!engagement.is_liked,
    savedByMe: savedIds.has(post.id),
  };
}

export default function useCommunityFeed({
  activeSpace,
  communityReady,
  generalSpaceId,
  session,
  providers,
  navigation,
  onUserBlocked,
}) {
  const [records, setRecords] = useState([]);
  const [generalPosts, setGeneralPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [engagement, setEngagement] = useState({ counts: {}, saves: [] });
  const [commentActivity, setCommentActivity] = useState({
    userId: null,
    postIds: [],
    error: null,
  });
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentAuthors, setCommentAuthors] = useState({});
  const [commentBusy, setCommentBusy] = useState(false);
  const loadSequence = useRef(0);
  const loadedPosts = useRef([]);
  const likeRequests = useRef(new Set());
  const saveRequests = useRef(new Set());
  const commentRequests = useRef(new Set());
  const reportRequests = useRef(new Set());
  const pageRef = useRef(page);

  const loadPosts = useCallback(async () => {
    const request = ++loadSequence.current;
    try {
      if (supabase) {
        await withCommunityFeedDeadline(async () => {
          const currentPage = pageRef.current;
          const fields =
            'id,author_id,provider_id,post_type,body,image_url,offer_expires_at,region_key,location_city,created_at,providers(id,business_name,is_verified,categories(name,slug))' +
            (communityReady ? ',community_id' : '');
          let query = supabase
            .from('community_posts')
            .select(fields)
            .eq('status', 'published')
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
            .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1);
          if (communityReady && activeSpace?.id) query = query.eq('community_id', activeSpace.id);
          const activityPromise =
            currentPage === 1
              ? session
                ? loadCommentedPostIds(session.user.id)
                    .then((postIds) => ({ postIds, error: null }))
                    .catch((activityError) => ({ postIds: null, error: activityError }))
                : Promise.resolve({ postIds: [], error: null })
              : Promise.resolve(null);
          const [{ data, error: queryError }, saveResult, generalResult, activityResult] =
            await Promise.all([
              query,
              session
                ? supabase
                    .from('community_saved_posts')
                    .select('post_id')
                    .eq('user_id', session.user.id)
                : Promise.resolve({ data: [], error: null }),
              communityReady && activeSpace?.slug !== 'general' && generalSpaceId
                ? supabase
                    .from('community_posts')
                    .select(fields)
                    .eq('status', 'published')
                    .eq('community_id', generalSpaceId)
                    .order('created_at', { ascending: false })
                    .limit(3)
                : Promise.resolve({ data: [], error: null }),
              activityPromise,
            ]);
          if (request !== loadSequence.current) return;
          if (queryError) throw queryError;
          if (activityResult) {
            if (activityResult.error) {
              console.warn('Unable to load your Community comment activity.', activityResult.error);
              setCommentActivity((current) => ({
                userId: session?.user?.id ?? null,
                postIds: current.userId === (session?.user?.id ?? null) ? current.postIds : [],
                error: 'Could not load your comment activity. Pull to refresh and try again.',
              }));
            } else {
              setCommentActivity({
                userId: session?.user?.id ?? null,
                postIds: activityResult.postIds,
                error: null,
              });
            }
          }
          const countResult = data?.length
            ? await supabase.rpc('community_post_engagement_for_posts', {
                requested_posts: data.map((post) => post.id),
              })
            : { data: [], error: null };
          if (request !== loadSequence.current) return;
          setError(countResult.error ? 'Posts loaded, but reactions could not refresh.' : '');
          const [resolvedPosts, resolvedGeneral] = await Promise.all([
            resolveCommunityImages(data || []),
            resolveCommunityImages(generalResult.error ? [] : generalResult.data || []),
          ]);
          if (request !== loadSequence.current) return;
          const visibleAuthors = [
            ...new Set(
              [...resolvedPosts, ...resolvedGeneral].map((post) => post.author_id).filter(Boolean),
            ),
          ];
          const authorProfiles = await Promise.all(
            visibleAuthors.map(async (authorId) => {
              try {
                const { data: author } = await supabase.rpc('get_community_member_profile', {
                  target_author: authorId,
                });
                const row = Array.isArray(author) ? author[0] : author;
                return [authorId, row?.display_name || null];
              } catch {
                return [authorId, null];
              }
            }),
          );
          if (request !== loadSequence.current) return;
          const authorNames = new Map(authorProfiles);
          const withAuthorNames = (post) => ({
            ...post,
            author_name: authorNames.get(post.author_id) || post.author_name || 'Community member',
          });
          const namedPosts = resolvedPosts.map(withAuthorNames);
          const namedGeneral = resolvedGeneral.map(withAuthorNames);
          const merged = mergeCommunityPage(loadedPosts.current, namedPosts, currentPage === 1);
          loadedPosts.current = merged;
          setRecords(merged);
          setHasMore((data || []).length === PAGE_SIZE);
          setGeneralPosts(namedGeneral);
          setEngagement((current) => ({
            counts: countResult.error
              ? current.counts
              : {
                  ...(currentPage > 1 ? current.counts : {}),
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
        });
      } else {
        const cached = activeSpace?.slug === 'general' ? await loadLocalPosts(providers) : [];
        if (request === loadSequence.current) {
          loadedPosts.current = cached;
          setRecords(cached);
          setError('');
          setHasMore(false);
        }
      }
    } catch (loadError) {
      if (request !== loadSequence.current) return;
      if (loadError?.code === 'COMMUNITY_FEED_TIMEOUT') {
        loadSequence.current += 1;
        setHasMore(false);
        setError(communityFeedErrorMessage(loadError));
        setLoading(false);
        return;
      }
      console.warn('Community sync failed; using the local cache.', loadError.message);
      setHasMore(false);
      setError(communityFeedErrorMessage(loadError));
      try {
        const cached = activeSpace?.slug === 'general' ? await loadLocalPosts(providers) : [];
        if (request === loadSequence.current) {
          loadedPosts.current = cached;
          setRecords(cached);
        }
      } catch {
        setRecords([]);
      }
    } finally {
      if (request === loadSequence.current) setLoading(false);
    }
  }, [activeSpace?.id, activeSpace?.slug, communityReady, generalSpaceId, providers, session]);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    setLoading(page === 1);
    if (page === 1) {
      setRecords([]);
      loadedPosts.current = [];
    }
    void loadPosts();
  }, [loadPosts, page]);

  const refresh = useCallback(async () => {
    if (pageRef.current > 1) {
      setPage(1);
      return;
    }
    setLoading(true);
    setError('');
    setRefreshing(true);
    try {
      await loadPosts();
    } finally {
      setRefreshing(false);
    }
  }, [loadPosts]);

  const loadMore = useCallback(() => {
    if (hasMore && !loading) setPage((current) => current + 1);
  }, [hasMore, loading]);

  const loadPostById = useCallback(
    async (postId) => {
      if (!supabase) return null;
      const fields =
        'id,author_id,provider_id,post_type,body,image_url,offer_expires_at,region_key,location_city,created_at,providers(id,business_name,is_verified,categories(name,slug)),community_id';
      const { data, error: postError } = await supabase
        .from('community_posts')
        .select(fields)
        .eq('id', postId)
        .eq('status', 'published')
        .maybeSingle();
      if (postError) throw postError;
      if (!data) return null;

      const [{ data: countRows, error: countError }, { data: savedRows, error: savedError }] =
        await Promise.all([
          supabase.rpc('community_post_engagement_for_posts', { requested_posts: [postId] }),
          session
            ? supabase
                .from('community_saved_posts')
                .select('post_id')
                .eq('user_id', session.user.id)
                .eq('post_id', postId)
            : Promise.resolve({ data: [], error: null }),
        ]);
      if (countError) throw countError;
      if (savedError) throw savedError;

      const [resolvedPost] = await resolveCommunityImages([data]);
      let authorName = null;
      try {
        const { data: author, error: authorError } = await supabase.rpc(
          'get_community_member_profile',
          { target_author: data.author_id },
        );
        if (authorError) throw authorError;
        const row = Array.isArray(author) ? author[0] : author;
        authorName = row?.display_name || null;
      } catch {
        authorName = null;
      }

      const post = {
        ...resolvedPost,
        author_name: authorName || 'Community member',
      };
      const counts = Object.fromEntries((countRows || []).map((row) => [row.post_id, row]));
      const savedIds = new Set((savedRows || []).map((row) => row.post_id));
      loadedPosts.current = mergeCommunityPage(loadedPosts.current, [post], false);
      setRecords((current) =>
        current.some((item) => item.id === post.id) ? current : [post, ...current],
      );
      setEngagement((current) => ({
        ...current,
        counts: { ...current.counts, ...counts },
        saves: [...current.saves.filter((item) => item.post_id !== postId), ...(savedRows || [])],
      }));
      return mapPost(post, counts, savedIds);
    },
    [session],
  );

  const reloadFirstPage = useCallback(async () => {
    pageRef.current = 1;
    setPage(1);
    loadedPosts.current = [];
    await loadPosts();
  }, [loadPosts]);

  const publishPost = useCallback(
    async ({
      text,
      imageUri,
      category,
      providerId = null,
      regionKey = null,
      locationCity = null,
    }) => {
      if (!session) {
        navigation?.navigate('Welcome');
        return false;
      }
      const body = String(text || '').trim();
      if (body.length < 2 || body.length > 2000)
        throw new Error('Write between 2 and 2,000 characters.');
      if (imageUri && !supabase) throw new Error('Connect to publish a post with a photo.');
      let uploadedImage = null;
      const payload = {
        ...(communityReady && activeSpace?.id ? { community_id: activeSpace.id } : {}),
        author_id: session.user.id,
        provider_id: providerId,
        post_type: category || 'discussion',
        body,
        region_key: regionKey,
        location_city: locationCity,
      };
      try {
        if (!supabase) {
          const local = await createLocalPost(session.user.id, {
            providerId,
            postType: category || 'discussion',
            body,
            regionKey,
            locationCity,
          });
          await enqueuePendingOperation('community_post', {
            remote: payload,
            localId: local.id,
            _sync: { status: 'pending', attempts: 0, nextAttemptAt: null },
          });
          const queuedError = new Error('Your post is saved and will send when connected.');
          queuedError.code = 'QUEUED_OFFLINE';
          throw queuedError;
        } else {
          if (imageUri) {
            const asset = typeof imageUri === 'string' ? { uri: imageUri } : imageUri;
            uploadedImage = await uploadCommunityImage(session.user.id, asset);
            payload.image_url = uploadedImage.imageUrl;
          }
          const { error: publishError } = await supabase
            .from('community_posts')
            .insert(payload)
            .select('id')
            .single();
          if (publishError) throw publishError;
          uploadedImage = null;
        }
        await reloadFirstPage();
        return true;
      } catch (publishError) {
        if (uploadedImage) await removeCommunityImage(uploadedImage.path).catch(() => {});
        if (isAuthSessionError(publishError)) {
          const local = await createLocalPost(session.user.id, {
            providerId,
            postType: category || 'discussion',
            body,
            regionKey,
            locationCity,
          });
          await enqueuePendingOperation('community_post', {
            remote: payload,
            localId: local.id,
            _sync: {
              status: 'auth_required',
              attempts: 0,
              nextAttemptAt: null,
              lastError: 'Please sign in again',
            },
          });
          throw Object.assign(new Error('Please sign in again'), { authRequired: true });
        }
        throw publishError;
      }
    },
    [activeSpace?.id, communityReady, navigation, reloadFirstPage, session],
  );

  const deletePost = useCallback(
    async (postId) => {
      if (!session) {
        navigation?.navigate('Welcome');
        return false;
      }
      if (!supabase) throw new Error('Connect to the community service to delete posts.');
      const post = records.find((item) => item.id === postId);
      if (!post) throw new Error('This post is no longer available.');
      if (post.author_id !== session.user.id)
        throw new Error('You can delete only your own posts.');

      const { data, error: deleteError } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', postId)
        .eq('author_id', session.user.id)
        .select('id')
        .maybeSingle();
      if (deleteError) throw deleteError;
      if (!data) throw new Error('This post could not be found or is no longer yours to delete.');

      loadedPosts.current = loadedPosts.current.filter((item) => item.id !== postId);
      setRecords((current) => current.filter((item) => item.id !== postId));
      setGeneralPosts((current) => current.filter((item) => item.id !== postId));
      setEngagement((current) => ({
        counts: Object.fromEntries(Object.entries(current.counts).filter(([id]) => id !== postId)),
        saves: current.saves.filter((item) => item.post_id !== postId),
      }));
      try {
        await removeLocalPost(postId);
      } catch (cacheError) {
        console.warn(
          'Post was deleted remotely, but its local cache could not be cleared.',
          cacheError,
        );
      }
      return true;
    },
    [navigation, records, session],
  );

  const toggleLike = useCallback(
    async (postId) => {
      if (!session) {
        navigation?.navigate('Welcome');
        return false;
      }
      if (!supabase) throw new Error('Connect to the community service to like posts.');
      if (likeRequests.current.has(postId)) return false;
      likeRequests.current.add(postId);
      const previousCounts = engagement.counts[postId];
      const counts = previousCounts || DEFAULT_COUNTS;
      const liked = !!counts.is_liked;
      setEngagement((current) => ({
        ...current,
        counts: {
          ...current.counts,
          [postId]: {
            ...counts,
            like_count: Math.max(0, Number(counts.like_count) + (liked ? -1 : 1)),
            is_liked: !liked,
            is_updating: true,
          },
        },
      }));
      let failed = false;
      try {
        const result = liked
          ? await supabase
              .from('community_post_likes')
              .delete()
              .eq('post_id', postId)
              .eq('user_id', session.user.id)
          : await supabase
              .from('community_post_likes')
              .insert({ post_id: postId, user_id: session.user.id });
        if (result.error) throw result.error;
        return true;
      } catch (likeError) {
        if (isAuthSessionError(likeError)) {
          try {
            await enqueuePendingOperation('community_like', {
              post_id: postId,
              user_id: session.user.id,
              liked: !liked,
              _sync: authRequiredState,
            });
          } catch (queueError) {
            failed = true;
            setEngagement((current) => {
              const nextCounts = { ...current.counts };
              if (previousCounts) nextCounts[postId] = previousCounts;
              else delete nextCounts[postId];
              return { ...current, counts: nextCounts };
            });
            throw queueError;
          }
          throw Object.assign(likeError, { authRequired: true });
        }
        if (isTransientNetworkError(likeError)) {
          try {
            await enqueuePendingOperation('community_like', {
              post_id: postId,
              user_id: session.user.id,
              liked: !liked,
              _sync: pendingSyncState,
            });
            return true;
          } catch (queueError) {
            failed = true;
            setEngagement((current) => {
              const nextCounts = { ...current.counts };
              if (previousCounts) nextCounts[postId] = previousCounts;
              else delete nextCounts[postId];
              return { ...current, counts: nextCounts };
            });
            throw queueError;
          }
        }
        failed = true;
        setEngagement((current) => {
          const nextCounts = { ...current.counts };
          if (previousCounts) nextCounts[postId] = previousCounts;
          else delete nextCounts[postId];
          return { ...current, counts: nextCounts };
        });
        throw likeError;
      } finally {
        likeRequests.current.delete(postId);
        if (!failed)
          setEngagement((current) => ({
            ...current,
            counts: {
              ...current.counts,
              [postId]: { ...current.counts[postId], is_updating: false },
            },
          }));
      }
    },
    [engagement.counts, navigation, session],
  );

  const toggleSave = useCallback(
    async (postId) => {
      if (!session) {
        navigation?.navigate('Welcome');
        return false;
      }
      if (!supabase) throw new Error('Connect to the community service to save posts.');
      if (saveRequests.current.has(postId)) return false;
      saveRequests.current.add(postId);
      const previousSaves = engagement.saves;
      const saved = previousSaves.some((row) => row.post_id === postId);
      setEngagement((current) => ({
        ...current,
        saves: saved
          ? current.saves.filter((row) => row.post_id !== postId)
          : [...current.saves, { post_id: postId }],
      }));
      try {
        const result = saved
          ? await supabase
              .from('community_saved_posts')
              .delete()
              .eq('post_id', postId)
              .eq('user_id', session.user.id)
          : await supabase
              .from('community_saved_posts')
              .insert({ post_id: postId, user_id: session.user.id });
        if (result.error) throw result.error;
        showButtonToast(saved ? 'Removed from saved' : 'Saved');
        return true;
      } catch (saveError) {
        if (isAuthSessionError(saveError)) {
          try {
            await enqueuePendingOperation('community_saved_post', {
              post_id: postId,
              user_id: session.user.id,
              saved: !saved,
              _sync: authRequiredState,
            });
          } catch (queueError) {
            setEngagement((current) => ({ ...current, saves: previousSaves }));
            throw queueError;
          }
          throw Object.assign(saveError, { authRequired: true });
        }
        if (isTransientNetworkError(saveError)) {
          try {
            await enqueuePendingOperation('community_saved_post', {
              post_id: postId,
              user_id: session.user.id,
              saved: !saved,
              _sync: pendingSyncState,
            });
            showButtonToast(saved ? 'Removed from saved' : 'Saved');
            return true;
          } catch (queueError) {
            setEngagement((current) => ({ ...current, saves: previousSaves }));
            throw queueError;
          }
        }
        setEngagement((current) => ({ ...current, saves: previousSaves }));
        throw saveError;
      } finally {
        saveRequests.current.delete(postId);
      }
    },
    [engagement.saves, navigation, session],
  );

  const loadComments = useCallback(async (postId) => {
    setComments([]);
    setCommentAuthors({});
    if (!supabase) throw new Error('Connect to the community service to read comments.');
    setCommentsLoading(true);
    try {
      const { data, error: queryError } = await supabase
        .from('community_comments')
        .select('id,author_id,body,created_at')
        .eq('post_id', postId)
        .order('created_at')
        .limit(100);
      if (queryError) throw queryError;
      const rows = (data || []).map((comment) => ({ ...comment, post_id: postId }));
      setComments(rows);
      const authorIds = [...new Set(rows.map((row) => row.author_id).filter(Boolean))];
      const profiles = await Promise.all(
        authorIds.map(async (authorId) => {
          const { data: profileData, error: profileError } = await supabase.rpc(
            'get_community_member_profile',
            { target_author: authorId },
          );
          if (profileError) return [authorId, null];
          const author = Array.isArray(profileData) ? profileData[0] : profileData;
          return [authorId, author || null];
        }),
      );
      const authors = Object.fromEntries(profiles);
      setCommentAuthors(authors);
      return rows;
    } finally {
      setCommentsLoading(false);
    }
  }, []);

  const addComment = useCallback(
    async (postId, text) => {
      if (!session) {
        navigation?.navigate('Welcome');
        return false;
      }
      if (!supabase) throw new Error('Connect to the community service to comment.');
      const body = String(text || '').trim();
      if (!body || body.length > 1000) return false;
      if (commentRequests.current.has(postId)) return false;
      commentRequests.current.add(postId);
      setCommentBusy(true);
      const optimisticId = `pending-comment-${Date.now()}`;
      const optimisticComment = {
        id: optimisticId,
        post_id: postId,
        author_id: session.user.id,
        body,
        created_at: new Date().toISOString(),
      };
      setComments((current) => [...current, optimisticComment]);
      try {
        const { data, error: insertError } = await supabase
          .from('community_comments')
          .insert({ post_id: postId, author_id: session.user.id, body })
          .select('id,author_id,body,created_at')
          .single();
        if (insertError) throw insertError;
        const savedComment = { ...data, post_id: postId };
        setComments((current) =>
          current.map((item) => (item.id === optimisticId ? savedComment : item)),
        );
        setCommentActivity((current) => ({
          userId: session.user.id,
          postIds: [
            ...new Set([...(current.userId === session.user.id ? current.postIds : []), postId]),
          ],
          error: current.error,
        }));
        const { data: profileData } = await supabase.rpc('get_community_member_profile', {
          target_author: session.user.id,
        });
        const author = Array.isArray(profileData) ? profileData[0] : profileData;
        if (author) setCommentAuthors((current) => ({ ...current, [session.user.id]: author }));
        await loadPosts();
        return true;
      } catch (commentError) {
        if (!isAuthSessionError(commentError) && isTransientNetworkError(commentError)) {
          try {
            await enqueuePendingOperation('community_comment', {
              post_id: postId,
              author_id: session.user.id,
              body,
              localCommentId: optimisticId,
              _sync: pendingSyncState,
            });
            setCommentActivity((current) => ({
              userId: session.user.id,
              postIds: [
                ...new Set([
                  ...(current.userId === session.user.id ? current.postIds : []),
                  postId,
                ]),
              ],
              error: current.error,
            }));
            return true;
          } catch (queueError) {
            setComments((current) => current.filter((item) => item.id !== optimisticId));
            throw queueError;
          }
        }
        setComments((current) => current.filter((item) => item.id !== optimisticId));
        throw commentError;
      } finally {
        commentRequests.current.delete(postId);
        setCommentBusy(false);
      }
    },
    [loadPosts, navigation, session],
  );

  const reconcileCommunityWrites = useCallback(
    async (operations) => {
      const failed = (operations || []).filter((item) =>
        ['community_like', 'community_saved_post', 'community_comment'].includes(item.operation),
      );
      if (!failed.length) return;
      await loadPosts();
      const commentPostIds = [
        ...new Set(
          failed
            .filter((item) => item.operation === 'community_comment')
            .map((item) => String(item.payload?.post_id || ''))
            .filter(Boolean),
        ),
      ];
      await Promise.all(commentPostIds.map((postId) => loadComments(postId).catch(() => [])));
    },
    [loadComments, loadPosts],
  );

  const reportPost = useCallback(
    async (postId, reason, commentInput = null) => {
      if (!session) {
        navigation?.navigate('Welcome');
        return false;
      }
      if (!supabase) throw new Error('Connect to the community service to report a post.');
      const post = records.find((item) => item.id === postId);
      if (!post) throw new Error('This post is no longer available.');
      const comment =
        commentInput && typeof commentInput === 'object'
          ? commentInput
          : commentInput
            ? { id: commentInput }
            : null;
      const commentId = comment?.id;
      if (!canReportContent(session.user.id, post, comment))
        throw new Error('You can report content shared by other members.');
      if (!reason) return 'validated';
      const requestId = commentId || postId;
      if (reportRequests.current.has(requestId)) return false;
      reportRequests.current.add(requestId);
      try {
        const { error: reportError } = await supabase.from('community_post_reports').insert({
          post_id: postId,
          ...(commentId ? { comment_id: commentId } : {}),
          reporter_id: session.user.id,
          reason,
        });
        if (isAuthSessionError(reportError)) throw reportError;
        if (reportError?.code === '23505') throw new Error('Already reported.');
        if (reportError) {
          if (isTransientNetworkError(reportError)) {
            await enqueuePendingOperation('community_post_report', {
              post_id: postId,
              ...(commentId ? { comment_id: commentId } : {}),
              reporter_id: session.user.id,
              reason,
              _sync: pendingSyncState,
            });
            return 'queued';
          }
          throw new Error(reportFailureMessage(reportError.code));
        }
        return 'sent';
      } catch (reportError) {
        if (isAuthSessionError(reportError)) {
          await enqueuePendingOperation('community_post_report', {
            post_id: postId,
            ...(commentId ? { comment_id: commentId } : {}),
            reporter_id: session.user.id,
            reason,
            _sync: authRequiredState,
          });
          return 'queued';
        }
        throw reportError;
      } finally {
        reportRequests.current.delete(requestId);
      }
    },
    [navigation, records, session],
  );

  const blockUser = useCallback(
    (userId) => {
      if (!session) {
        navigation?.navigate('Welcome');
        return;
      }
      if (!communityReady || !supabase || userId === session.user.id) return;
      Alert.alert('Block this author?', 'Their posts and comments will be hidden from your feed.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error: blockError } = await supabase
                .from('community_user_blocks')
                .upsert(
                  { blocker_id: session.user.id, blocked_id: userId },
                  { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true },
                );
              if (blockError) {
                if (!isAuthSessionError(blockError)) throw blockError;
                await enqueuePendingOperation('community_block', {
                  blocker_id: session.user.id,
                  blocked_id: userId,
                  _sync: authRequiredState,
                });
                Alert.alert(
                  'Please sign in again',
                  'Your block request is saved and will resume after you sign in.',
                  [
                    { text: 'Sign in again', onPress: () => navigation?.navigate('Welcome') },
                    { text: 'Keep draft', style: 'cancel' },
                  ],
                );
                return;
              }
              setComments((current) => current.filter((comment) => comment.author_id !== userId));
              onUserBlocked?.(userId);
              await refresh();
            } catch (error) {
              Alert.alert(
                'Could not block author',
                error instanceof Error
                  ? error.message
                  : 'Please check your connection and try again.',
              );
            }
          },
        },
      ]);
    },
    [communityReady, navigation, onUserBlocked, refresh, session],
  );

  const savedIds = useMemo(
    () => new Set(engagement.saves.map((item) => item.post_id)),
    [engagement.saves],
  );
  const posts = useMemo(
    () => records.map((post) => mapPost(post, engagement.counts, savedIds)),
    [engagement.counts, records, savedIds],
  );

  return {
    posts,
    generalPosts,
    loading,
    refreshing,
    error,
    hasMore,
    refresh,
    loadMore,
    loadPostById,
    publishPost,
    deletePost,
    toggleLike,
    toggleSave,
    addComment,
    reconcileCommunityWrites,
    loadComments,
    reportPost,
    blockUser,
    setPage,
    engagement,
    savedPostIds: savedIds,
    commentedPostIds: new Set(
      commentActivity.userId === (session?.user?.id ?? null) ? commentActivity.postIds : [],
    ),
    commentActivityError:
      commentActivity.userId === (session?.user?.id ?? null) ? commentActivity.error : null,
    comments,
    commentsLoading,
    commentAuthors,
    commentBusy,
    setCommentBusy,
    setComments,
    setCommentAuthors,
  };
}
