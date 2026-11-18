import React, { useMemo } from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import useCommunityFeed from '../../src/hooks/useCommunityFeed';
import { enqueuePendingOperation, removeLocalPost } from '../../src/data/localDatabase';
import { AppAlert } from '../../src/components/AppDialog';

const mockFrom = jest.fn();
const mockRpc = jest.fn();
const mockCommunityPostInsert = jest.fn();
const mockCommunityPostDelete = jest.fn();
let mockLikeError: Error | null = null;
let mockSaveError: Error | null = null;
let mockCommentError: Error | null = null;
let mockReportError: Error | null = null;
let mockPostById: typeof mockPost | null = null;
let mockDeletedPost: { id: string } | null = null;
let mockCommentActivityRows: { post_id: string }[] = [];
const mockPost = {
  id: 'post-1',
  author_id: 'author-1',
  post_type: 'discussion',
  body: 'Existing community post',
  created_at: '2025-01-01T00:00:00.000Z',
};

jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

jest.mock('../../src/data/communityImages', () => ({
  resolveCommunityImages: jest.fn(async (posts) => posts),
  uploadCommunityImage: jest.fn(),
  removeCommunityImage: jest.fn(),
}));

jest.mock('../../src/data/localDatabase', () => ({
  cacheCommunityPosts: jest.fn(),
  createLocalPost: jest.fn(),
  enqueuePendingOperation: jest.fn(),
  loadLocalPosts: jest.fn(),
  removeLocalPost: jest.fn(),
}));

jest.mock('../../src/lib/communityFeedDeadline', () => ({
  communityFeedErrorMessage: jest.fn(() => 'Could not load posts.'),
  withCommunityFeedDeadline: (callback: () => Promise<unknown>) => callback(),
}));

const providers: never[] = [];

function FeedHarness({
  capture,
  communityReady = false,
  userId = 'viewer-1',
}: {
  capture: (feed: ReturnType<typeof useCommunityFeed>) => void;
  communityReady?: boolean;
  userId?: string;
}) {
  const userSession = useMemo(() => ({ user: { id: userId } }), [userId]);
  const feed = useCommunityFeed({
    activeSpace: { id: null, slug: 'general' },
    communityReady,
    generalSpaceId: null,
    session: userSession,
    providers,
    navigation: { navigate: jest.fn() },
  });
  capture(feed);
  return null;
}

function queryFor(table: string) {
  const query: Record<string, unknown> = {
    select: jest.fn(() => query),
    eq: jest.fn(() => query),
    order: jest.fn(() => query),
    range: jest.fn(() => query),
    limit: jest.fn(() => query),
    insert: jest.fn((...args: unknown[]) => {
      if (table === 'community_posts') mockCommunityPostInsert(...args);
      return query;
    }),
    delete: jest.fn((...args: unknown[]) => {
      if (table === 'community_posts') mockCommunityPostDelete(...args);
      return query;
    }),
    update: jest.fn(() => query),
    upsert: jest.fn(() => query),
    maybeSingle: jest.fn(async () => ({
      data: table === 'community_posts' ? (mockDeletedPost ?? mockPostById) : null,
      error: null,
    })),
    single: jest.fn(async () => ({
      data: null,
      error: table === 'community_comments' ? mockCommentError : null,
    })),
    then: (resolve: (value: unknown) => unknown) => {
      if (table === 'community_post_reports')
        return Promise.resolve({ data: null, error: mockReportError }).then(resolve);
      if (table === 'community_posts')
        return Promise.resolve({ data: [mockPost], error: null }).then(resolve);
      if (table === 'community_post_likes')
        return Promise.resolve({ data: null, error: mockLikeError }).then(resolve);
      if (table === 'community_saved_posts')
        return Promise.resolve({ data: null, error: mockSaveError }).then(resolve);
      if (table === 'community_comments')
        return Promise.resolve({ data: mockCommentActivityRows, error: null }).then(resolve);
      return Promise.resolve({ data: [], error: null }).then(resolve);
    },
  };
  return query;
}

describe('useCommunityFeed', () => {
  beforeEach(() => {
    mockPostById = null;
    mockDeletedPost = null;
    mockLikeError = null;
    mockSaveError = null;
    mockCommentError = null;
    mockReportError = null;
    mockCommentActivityRows = [];
    mockCommunityPostInsert.mockClear();
    mockCommunityPostDelete.mockClear();
    (enqueuePendingOperation as jest.Mock).mockClear();
    mockFrom.mockImplementation((table: string) => queryFor(table));
    mockRpc.mockImplementation((name: string) => {
      if (name === 'community_post_engagement_for_posts')
        return Promise.resolve({
          data: [{ post_id: 'post-1', like_count: 2, comment_count: 0, is_liked: false }],
          error: null,
        });
      return Promise.resolve({ data: { display_name: 'Member' }, error: null });
    });
  });

  test('loads post ids the signed-in member has commented on', async () => {
    mockCommentActivityRows = [{ post_id: 'post-1' }, { post_id: 'post-2' }];
    const state: { current?: ReturnType<typeof useCommunityFeed> } = {};
    render(<FeedHarness capture={(feed) => (state.current = feed)} />);
    await waitFor(() => expect(state.current?.loading).toBe(false));

    expect(mockFrom).toHaveBeenCalledWith('community_comments');
    expect(state.current?.commentedPostIds).toEqual(new Set(['post-1', 'post-2']));
    expect(state.current?.commentActivityError).toBeNull();
  });

  test('fetches a notification post by id when it is outside the loaded feed page', async () => {
    mockPostById = {
      ...mockPost,
      id: 'target-post',
      body: 'Fetched notification post',
      author_id: 'target-author',
    };
    const state: { current?: ReturnType<typeof useCommunityFeed> } = {};
    render(<FeedHarness capture={(feed) => (state.current = feed)} />);
    await waitFor(() => expect(state.current?.loading).toBe(false));

    let fetched;
    await act(async () => {
      fetched = await state.current?.loadPostById('target-post');
    });

    expect(mockFrom).toHaveBeenCalledWith('community_posts');
    expect(fetched).toEqual(
      expect.objectContaining({
        id: 'target-post',
        authorId: 'target-author',
        text: 'Fetched notification post',
      }),
    );
    expect(state.current?.posts).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'target-post' })]),
    );
  });

  test('deletes only an owned community post and removes it from the local cache', async () => {
    mockDeletedPost = { id: mockPost.id };
    const state: { current?: ReturnType<typeof useCommunityFeed> } = {};
    render(<FeedHarness capture={(feed) => (state.current = feed)} userId="author-1" />);
    await waitFor(() => expect(state.current?.loading).toBe(false));

    await act(async () => {
      await state.current?.deletePost(mockPost.id);
    });

    expect(mockFrom).toHaveBeenCalledWith('community_posts');
    expect(mockCommunityPostDelete).toHaveBeenCalledTimes(1);
    expect(state.current?.posts).toEqual([]);
    expect(removeLocalPost).toHaveBeenCalledWith(mockPost.id);
  });

  test('rejects deleting a community post owned by another member', async () => {
    const state: { current?: ReturnType<typeof useCommunityFeed> } = {};
    render(<FeedHarness capture={(feed) => (state.current = feed)} userId="different-member" />);
    await waitFor(() => expect(state.current?.loading).toBe(false));

    await expect(state.current?.deletePost(mockPost.id)).rejects.toThrow(
      'You can delete only your own posts.',
    );
    expect(mockCommunityPostDelete).not.toHaveBeenCalled();
  });

  test('publishes through the Supabase repository', async () => {
    const state: { current?: ReturnType<typeof useCommunityFeed> } = {};
    render(<FeedHarness capture={(feed) => (state.current = feed)} />);
    await waitFor(() => expect(state.current?.loading).toBe(false));

    await act(async () => {
      await state.current?.publishPost({ text: 'A new post', category: 'discussion' });
    });

    expect(mockFrom).toHaveBeenCalledWith('community_posts');
    expect(mockCommunityPostInsert).toHaveBeenCalledWith(
      expect.objectContaining({ author_id: 'viewer-1', body: 'A new post' }),
    );
  });

  test('reports are queued on transient failure and sent only after a successful response', async () => {
    const state: { current?: ReturnType<typeof useCommunityFeed> } = {};
    render(<FeedHarness capture={(feed) => (state.current = feed)} />);
    await waitFor(() => expect(state.current?.loading).toBe(false));

    await act(async () => {
      await expect(state.current?.reportPost('post-1', '')).resolves.toBe('validated');
    });
    expect(mockFrom).not.toHaveBeenCalledWith('community_post_reports');

    mockReportError = Object.assign(new Error('Network unavailable'), { status: 503 });

    await act(async () => {
      await expect(state.current?.reportPost('post-1', 'spam_or_scam')).resolves.toBe('queued');
    });
    expect(enqueuePendingOperation).toHaveBeenCalledWith(
      'community_post_report',
      expect.objectContaining({ post_id: 'post-1', reporter_id: 'viewer-1' }),
    );

    mockReportError = Object.assign(new Error('JWT expired'), {
      code: 'JWT_EXPIRED',
      status: 401,
    });
    await act(async () => {
      await expect(state.current?.reportPost('post-1', 'spam_or_scam')).resolves.toBe('queued');
    });
    expect(enqueuePendingOperation).toHaveBeenLastCalledWith(
      'community_post_report',
      expect.objectContaining({
        post_id: 'post-1',
        reporter_id: 'viewer-1',
        _sync: expect.objectContaining({ status: 'auth_required' }),
      }),
    );

    mockReportError = null;
    await act(async () => {
      await expect(state.current?.reportPost('post-1', 'spam_or_scam')).resolves.toBe('sent');
    });
  });

  test('block confirmation calls blockUser only after confirm and does nothing on cancel', async () => {
    const state: { current?: ReturnType<typeof useCommunityFeed> } = {};
    const alert = jest.spyOn(AppAlert, 'alert').mockImplementation(() => undefined);
    render(<FeedHarness communityReady capture={(feed) => (state.current = feed)} />);
    await waitFor(() => expect(state.current?.loading).toBe(false));
    await act(async () => state.current?.blockUser('author-1'));
    expect(alert).toHaveBeenCalledWith(
      'Block this author?',
      'Their posts and comments will be hidden from your feed.',
      expect.any(Array),
    );
    const buttons = alert.mock.calls.at(-1)?.[2] as Array<{ text: string; onPress?: () => void }>;
    const blockReadsBeforeConfirmation = mockFrom.mock.calls.filter(
      ([table]) => table === 'community_user_blocks',
    ).length;
    await act(async () => buttons.find((button) => button.text === 'Cancel')?.onPress?.());
    expect(
      mockFrom.mock.calls.filter(([table]) => table === 'community_user_blocks'),
    ).toHaveLength(blockReadsBeforeConfirmation);
    await act(async () => buttons.find((button) => button.text === 'Block')?.onPress?.());
    expect(
      mockFrom.mock.calls.filter(([table]) => table === 'community_user_blocks').length,
    ).toBeGreaterThan(blockReadsBeforeConfirmation);
    alert.mockRestore();
  });

  test('rolls back optimistic like state when the repository write fails', async () => {
    mockLikeError = new Error('Like write failed');
    const state: { current?: ReturnType<typeof useCommunityFeed> } = {};
    render(<FeedHarness capture={(feed) => (state.current = feed)} />);
    await waitFor(() => expect(state.current?.loading).toBe(false));
    const priorCount = state.current?.posts[0]?.likeCount;
    const priorLiked = state.current?.posts[0]?.likedByMe;

    await act(async () => {
      await expect(state.current?.toggleLike('post-1')).rejects.toThrow('Like write failed');
    });

    expect(state.current?.posts[0]).toEqual(
      expect.objectContaining({ likeCount: priorCount, likedByMe: priorLiked }),
    );
  });

  test('writes bookmarks to Supabase and rolls back optimistic save state on failure', async () => {
    mockSaveError = new Error('Bookmark write failed');
    const state: { current?: ReturnType<typeof useCommunityFeed> } = {};
    render(<FeedHarness capture={(feed) => (state.current = feed)} />);
    await waitFor(() => expect(state.current?.loading).toBe(false));

    await act(async () => {
      await expect(state.current?.toggleSave('post-1')).rejects.toThrow('Bookmark write failed');
    });

    expect(mockFrom).toHaveBeenCalledWith('community_saved_posts');
    expect(state.current?.posts[0]?.savedByMe).toBe(false);
  });

  test('writes comments to Supabase and removes the optimistic comment on failure', async () => {
    mockCommentError = new Error('Comment write failed');
    const state: { current?: ReturnType<typeof useCommunityFeed> } = {};
    render(<FeedHarness capture={(feed) => (state.current = feed)} />);
    await waitFor(() => expect(state.current?.loading).toBe(false));

    await act(async () => {
      await expect(state.current?.addComment('post-1', 'A helpful reply')).rejects.toThrow(
        'Comment write failed',
      );
    });

    expect(mockFrom).toHaveBeenCalledWith('community_comments');
    expect(state.current?.comments).toEqual([]);
  });

  test('permanent queued engagement failures roll back and refresh server state', async () => {
    mockLikeError = Object.assign(new Error('temporary like network error'), { status: 503 });
    mockSaveError = Object.assign(new Error('temporary bookmark network error'), { status: 503 });
    mockCommentError = Object.assign(new Error('temporary comment network error'), { status: 503 });
    const state: { current?: ReturnType<typeof useCommunityFeed> } = {};
    render(<FeedHarness capture={(feed) => (state.current = feed)} />);
    await waitFor(() => expect(state.current?.loading).toBe(false));

    await act(async () => {
      await state.current?.toggleLike('post-1');
      await state.current?.toggleSave('post-1');
      await state.current?.addComment('post-1', 'Queued comment');
    });

    expect(state.current?.posts[0]).toEqual(
      expect.objectContaining({ likedByMe: true, savedByMe: true }),
    );
    expect(state.current?.comments).toHaveLength(1);
    expect(enqueuePendingOperation).toHaveBeenCalledWith(
      'community_like',
      expect.objectContaining({ post_id: 'post-1', user_id: 'viewer-1', liked: true }),
    );
    expect(enqueuePendingOperation).toHaveBeenCalledWith(
      'community_saved_post',
      expect.objectContaining({ post_id: 'post-1', user_id: 'viewer-1', saved: true }),
    );
    expect(enqueuePendingOperation).toHaveBeenCalledWith(
      'community_comment',
      expect.objectContaining({ post_id: 'post-1', author_id: 'viewer-1', body: 'Queued comment' }),
    );
    mockLikeError = null;
    mockSaveError = null;
    mockCommentError = null;

    const operations = [
      {
        id: 'like-op',
        operation: 'community_like',
        payload: { post_id: 'post-1', _sync: { status: 'failed' } },
      },
      {
        id: 'save-op',
        operation: 'community_saved_post',
        payload: { post_id: 'post-1', _sync: { status: 'failed' } },
      },
      {
        id: 'comment-op',
        operation: 'community_comment',
        payload: { post_id: 'post-1', _sync: { status: 'failed' } },
      },
    ];
    await act(async () => {
      await state.current?.reconcileCommunityWrites(operations);
    });

    expect(state.current?.posts[0]).toEqual(
      expect.objectContaining({ likeCount: 2, likedByMe: false, savedByMe: false }),
    );
    expect(state.current?.comments).toEqual([]);
    expect(mockRpc).toHaveBeenCalledWith('community_post_engagement_for_posts', {
      requested_posts: ['post-1'],
    });
  });
});
