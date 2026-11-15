import React from 'react';
import { Share } from 'react-native';
import { Info, Star } from 'lucide-react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import ImagePicker from 'expo-image-picker';
import CommunityFeedScreen from '../../screens/CommunityFeedScreen';
import PostCard from '../../components/PostCard';
import PostComposer from '../../components/composer/PostComposer';
import TabPills from '../../components/TabPills';
import useCommunityFeed from '../../src/hooks/useCommunityFeed';
import { AppAlert } from '../../src/components/AppDialog';
import { notificationDestination } from '../../src/lib/notificationDestination';
import { resetTestState } from './helpers';

jest.mock('../../src/hooks/useCommunityFeed', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const navigation = globalThis.__CHODHIQ_TEST_NAVIGATION__;
const post = {
  id: 'post-1',
  username: 'Test member',
  timeAgo: 'Just now',
  text: 'A real community post',
  category: 'Discussion',
  likes: 2,
  comments: 0,
  commentItems: [],
  online: true,
  variant: 'full' as const,
};

describe('community buttons', () => {
  beforeEach(() => {
    resetTestState();
    (useCommunityFeed as jest.Mock).mockReturnValue({
      posts: [],
      generalPosts: [],
      loading: false,
      refreshing: false,
      error: '',
      hasMore: false,
      refresh: jest.fn().mockResolvedValue(undefined),
      loadMore: jest.fn(),
      publishPost: jest.fn().mockResolvedValue(true),
      deletePost: jest.fn().mockResolvedValue(true),
      toggleLike: jest.fn().mockResolvedValue(true),
      toggleSave: jest.fn().mockResolvedValue(true),
      addComment: jest.fn().mockResolvedValue(true),
      loadComments: jest.fn().mockResolvedValue([]),
      reportPost: jest.fn().mockResolvedValue(true),
      blockUser: jest.fn(),
      comments: [],
      commentsLoading: false,
    });
  });
  afterEach(() => jest.useRealTimers());

  test('feed does not render removed fixture authors', async () => {
    const view = await render(<CommunityFeedScreen navigation={navigation} />);
    expect(view.queryByText(/Kevin|DOM_SHOW/)).toBeNull();
  });

  test('tapping a feed author opens their CommunityProfile', async () => {
    (useCommunityFeed as jest.Mock).mockReturnValue({
      posts: [
        {
          id: 'author-post',
          authorId: 'member-profile-1',
          username: 'Member profile',
          createdAt: '2026-11-04T10:00:00.000Z',
          text: 'Open my profile',
          category: 'Discussion',
          likeCount: 0,
          commentCount: 0,
          likedByMe: false,
          savedByMe: false,
        },
      ],
      generalPosts: [],
      loading: false,
      refreshing: false,
      error: '',
      hasMore: false,
      refresh: jest.fn().mockResolvedValue(undefined),
      loadMore: jest.fn(),
      publishPost: jest.fn().mockResolvedValue(true),
      toggleLike: jest.fn().mockResolvedValue(true),
      toggleSave: jest.fn().mockResolvedValue(true),
      addComment: jest.fn().mockResolvedValue(true),
      loadComments: jest.fn().mockResolvedValue([]),
      reportPost: jest.fn().mockResolvedValue(true),
      blockUser: jest.fn(),
      comments: [],
      commentsLoading: false,
    });
    const navigate = jest.fn();
    const view = await render(
      <CommunityFeedScreen navigation={{ navigate, setParams: jest.fn() }} />,
    );

    await fireEvent.press(view.getByTestId('btn-post-author'));

    expect(navigate).toHaveBeenCalledWith('CommunityProfile', { authorId: 'member-profile-1' });
  });

  test('feed post options open from the screen-level sheet and bookmark the selected post', async () => {
    resetTestState({ session: { user: { id: 'member-1' } } });
    const toggleSave = jest.fn().mockResolvedValue(true);
    (useCommunityFeed as jest.Mock).mockReturnValue({
      posts: [
        {
          id: 'options-post',
          authorId: 'member-profile-1',
          username: 'Member profile',
          createdAt: '2026-11-04T10:00:00.000Z',
          text: 'Post with working options',
          category: 'Discussion',
          likeCount: 0,
          commentCount: 0,
          likedByMe: false,
          savedByMe: false,
        },
      ],
      generalPosts: [],
      loading: false,
      refreshing: false,
      error: '',
      hasMore: false,
      refresh: jest.fn().mockResolvedValue(undefined),
      loadMore: jest.fn(),
      publishPost: jest.fn().mockResolvedValue(true),
      toggleLike: jest.fn().mockResolvedValue(true),
      toggleSave,
      addComment: jest.fn().mockResolvedValue(true),
      loadComments: jest.fn().mockResolvedValue([]),
      reportPost: jest.fn().mockResolvedValue(true),
      blockUser: jest.fn(),
      comments: [],
      commentsLoading: false,
    });

    const view = await render(<CommunityFeedScreen navigation={navigation} />);
    await fireEvent.press(view.getByLabelText('More post options'));
    expect(view.getByText('Post options')).toBeTruthy();
    await fireEvent.press(view.getByLabelText('Bookmark'));
    await waitFor(() => expect(toggleSave).toHaveBeenCalledWith('options-post'));
  });

  test('authors can delete their own post after confirming from post options', async () => {
    resetTestState({ session: { user: { id: 'member-1' } } });
    const deletePost = jest.fn().mockResolvedValue(true);
    (useCommunityFeed as jest.Mock).mockReturnValue({
      posts: [
        {
          id: 'owned-post',
          authorId: 'member-1',
          username: 'Current member',
          createdAt: '2026-11-04T10:00:00.000Z',
          text: 'My post',
          category: 'Discussion',
          likeCount: 0,
          commentCount: 0,
          likedByMe: false,
          savedByMe: false,
        },
      ],
      generalPosts: [],
      loading: false,
      refreshing: false,
      error: '',
      hasMore: false,
      refresh: jest.fn().mockResolvedValue(undefined),
      loadMore: jest.fn(),
      publishPost: jest.fn().mockResolvedValue(true),
      deletePost,
      toggleLike: jest.fn().mockResolvedValue(true),
      toggleSave: jest.fn().mockResolvedValue(true),
      addComment: jest.fn().mockResolvedValue(true),
      loadComments: jest.fn().mockResolvedValue([]),
      reportPost: jest.fn().mockResolvedValue(true),
      blockUser: jest.fn(),
      comments: [],
      commentsLoading: false,
    });
    const alert = jest.spyOn(AppAlert, 'alert').mockImplementation(() => undefined);
    const view = await render(<CommunityFeedScreen navigation={navigation} />);

    await fireEvent.press(view.getByLabelText('More post options'));
    await fireEvent.press(view.getByLabelText('Delete post'));
    expect(alert).toHaveBeenCalledWith('Delete this post?', expect.any(String), expect.any(Array));
    const actions = alert.mock.calls.at(-1)?.[2];
    await actions?.find((action) => action.text === 'Delete')?.onPress?.();
    await waitFor(() => expect(deletePost).toHaveBeenCalledWith('owned-post'));
    alert.mockRestore();
  });

  test.each([
    ['like', 'community_like', undefined],
    ['comment', 'community_comment', true],
  ])('push %s notification routes to its post', (_label, type, openComments) => {
    const target = notificationDestination(
      {
        type,
        userId: 'member-1',
        entityType: 'community_post',
        entityId: '96300000-0000-4000-8000-000000000020',
      },
      'member-1',
    );
    expect(target).toEqual({
      route: 'MainTabs',
      params: {
        screen: 'CommunityTab',
        params: {
          postId: '96300000-0000-4000-8000-000000000020',
          ...(openComments ? { openComments: true } : {}),
        },
      },
    });
  });

  test('comment destination scrolls to the post and opens its comments', async () => {
    resetTestState({ session: { user: { id: 'member-1' } } });
    const loadComments = jest.fn().mockResolvedValue([]);
    (useCommunityFeed as jest.Mock).mockReturnValue({
      posts: [
        {
          id: 'target-post',
          authorId: 'author-1',
          username: 'Post author',
          createdAt: '2026-11-04T10:00:00.000Z',
          text: 'Target notification post',
          category: 'Discussion',
          likeCount: 0,
          commentCount: 1,
          likedByMe: false,
          savedByMe: false,
        },
      ],
      generalPosts: [],
      loading: false,
      refreshing: false,
      error: '',
      hasMore: false,
      refresh: jest.fn().mockResolvedValue(undefined),
      loadMore: jest.fn(),
      loadPostById: jest.fn(),
      publishPost: jest.fn().mockResolvedValue(true),
      toggleLike: jest.fn().mockResolvedValue(true),
      toggleSave: jest.fn().mockResolvedValue(true),
      addComment: jest.fn().mockResolvedValue(true),
      loadComments,
      reportPost: jest.fn().mockResolvedValue(true),
      blockUser: jest.fn(),
      comments: [],
      commentsLoading: false,
    });
    const setParams = jest.fn();
    const view = await render(
      <CommunityFeedScreen
        navigation={{ navigate: jest.fn(), setParams }}
        route={{ params: { postId: 'target-post', openComments: true } }}
      />,
    );

    await waitFor(() => expect(setParams).toHaveBeenCalled());
    await waitFor(() => expect(loadComments).toHaveBeenCalledWith('target-post'));
    expect(view.getByLabelText('Write a comment')).toBeTruthy();
    expect(setParams).toHaveBeenCalledWith({ postId: undefined, openComments: undefined });
  });

  test('shows a deleted-post message when a notification target cannot be fetched', async () => {
    (useCommunityFeed as jest.Mock).mockReturnValue({
      posts: [],
      generalPosts: [],
      loading: false,
      refreshing: false,
      error: '',
      hasMore: false,
      refresh: jest.fn().mockResolvedValue(undefined),
      loadMore: jest.fn(),
      loadPostById: jest.fn().mockResolvedValue(null),
      publishPost: jest.fn().mockResolvedValue(true),
      toggleLike: jest.fn().mockResolvedValue(true),
      toggleSave: jest.fn().mockResolvedValue(true),
      addComment: jest.fn().mockResolvedValue(true),
      loadComments: jest.fn().mockResolvedValue([]),
      reportPost: jest.fn().mockResolvedValue(true),
      blockUser: jest.fn(),
      comments: [],
      commentsLoading: false,
    });
    const alert = jest.spyOn(AppAlert, 'alert').mockImplementation(() => undefined);
    const view = await render(
      <CommunityFeedScreen
        navigation={{ navigate: jest.fn(), setParams: jest.fn() }}
        route={{ params: { postId: 'deleted-post' } }}
      />,
    );

    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith(
        'Post unavailable',
        'This post may have been deleted and is no longer available.',
      ),
    );
    expect(view.queryByText('Target notification post')).toBeNull();
    alert.mockRestore();
  });

  test('feed category and sort controls update visible feed state', async () => {
    (useCommunityFeed as jest.Mock).mockReturnValue({
      posts: [
        {
          id: 'recent-post',
          authorId: 'author-1',
          username: 'Recent author',
          createdAt: '2026-11-04T10:00:00.000Z',
          text: 'Recent, fewer likes',
          category: 'Discussion',
          likeCount: 1,
          commentCount: 0,
          likedByMe: false,
          savedByMe: false,
        },
        {
          id: 'popular-post',
          authorId: 'author-2',
          username: 'Popular author',
          createdAt: '2026-11-03T10:00:00.000Z',
          text: 'Older, more likes',
          category: 'Experience',
          likeCount: 8,
          commentCount: 0,
          likedByMe: false,
          savedByMe: false,
        },
      ],
      generalPosts: [],
      loading: false,
      refreshing: false,
      error: '',
      hasMore: false,
      refresh: jest.fn().mockResolvedValue(undefined),
      loadMore: jest.fn(),
      publishPost: jest.fn().mockResolvedValue(true),
      deletePost: jest.fn().mockResolvedValue(true),
      toggleLike: jest.fn().mockResolvedValue(true),
      toggleSave: jest.fn().mockResolvedValue(true),
      addComment: jest.fn().mockResolvedValue(true),
      loadComments: jest.fn().mockResolvedValue([]),
      reportPost: jest.fn().mockResolvedValue(true),
      blockUser: jest.fn(),
      comments: [],
      commentsLoading: false,
    });
    const view = await render(<CommunityFeedScreen navigation={navigation} />);
    expect(
      view.getAllByText(/Recent, fewer likes|Older, more likes/).map((item) => item.props.children),
    ).toEqual(['Recent, fewer likes', 'Older, more likes']);
    await fireEvent.press(view.getByRole('button', { name: 'Feed filters' }));
    expect(view.getByText('Feed options')).toBeTruthy();
    expect(view.getAllByLabelText('Latest').length).toBeGreaterThan(0);
    expect(view.getByLabelText('Most liked')).toBeTruthy();
    await fireEvent.press(view.getByLabelText('Most liked'));
    expect(
      view.getAllByText(/Recent, fewer likes|Older, more likes/).map((item) => item.props.children),
    ).toEqual(['Older, more likes', 'Recent, fewer likes']);
    await fireEvent.press(view.getByRole('button', { name: 'All categories' }));
    expect(view.getByText('Filter by category')).toBeTruthy();
    expect(view.getByLabelText('All categories (2)')).toBeTruthy();
  });

  test('For you shows posts the member authored, liked, or commented on', async () => {
    resetTestState({ session: { user: { id: 'member-1' } } });
    (useCommunityFeed as jest.Mock).mockReturnValue({
      posts: [
        {
          id: 'own-post',
          authorId: 'member-1',
          username: 'Current member',
          createdAt: '2026-11-04T10:00:00.000Z',
          text: 'Post I shared',
          category: 'Discussion',
          likeCount: 0,
          commentCount: 0,
          likedByMe: false,
          savedByMe: false,
        },
        {
          id: 'liked-post',
          authorId: 'author-2',
          username: 'Another member',
          createdAt: '2026-11-04T09:00:00.000Z',
          text: 'Post I liked',
          category: 'Experience',
          likeCount: 3,
          commentCount: 0,
          likedByMe: true,
          savedByMe: false,
        },
        {
          id: 'commented-post',
          authorId: 'author-3',
          username: 'Third member',
          createdAt: '2026-11-04T08:00:00.000Z',
          text: 'Post I commented on',
          category: 'Discussion',
          likeCount: 0,
          commentCount: 1,
          likedByMe: false,
          savedByMe: false,
        },
        {
          id: 'other-post',
          authorId: 'author-4',
          username: 'Fourth member',
          createdAt: '2026-11-04T07:00:00.000Z',
          text: 'Unrelated post',
          category: 'Discussion',
          likeCount: 0,
          commentCount: 0,
          likedByMe: false,
          savedByMe: false,
        },
      ],
      commentedPostIds: new Set(['commented-post']),
      generalPosts: [],
      loading: false,
      refreshing: false,
      error: '',
      hasMore: false,
      refresh: jest.fn().mockResolvedValue(undefined),
      loadMore: jest.fn(),
      publishPost: jest.fn().mockResolvedValue(true),
      deletePost: jest.fn().mockResolvedValue(true),
      toggleLike: jest.fn().mockResolvedValue(true),
      toggleSave: jest.fn().mockResolvedValue(true),
      addComment: jest.fn().mockResolvedValue(true),
      loadComments: jest.fn().mockResolvedValue([]),
      reportPost: jest.fn().mockResolvedValue(true),
      blockUser: jest.fn(),
      comments: [],
      commentsLoading: false,
    });

    const view = await render(<CommunityFeedScreen navigation={navigation} />);
    await fireEvent.press(view.getByRole('tab', { name: 'For you' }));

    expect(view.getByText('Post I shared')).toBeTruthy();
    expect(view.getByText('Post I liked')).toBeTruthy();
    expect(view.getByText('Post I commented on')).toBeTruthy();
    expect(view.queryByText('Unrelated post')).toBeNull();
  });

  test('selecting All categories shows every post and Discussion shows only Discussion posts', async () => {
    (useCommunityFeed as jest.Mock).mockReturnValue({
      posts: [
        {
          id: 'discussion-1',
          authorId: 'author-1',
          username: 'Member one',
          createdAt: '2026-11-04T10:00:00.000Z',
          text: 'Discussion post one',
          category: 'Discussion',
          likeCount: 0,
          commentCount: 0,
          likedByMe: false,
          savedByMe: false,
        },
        {
          id: 'experience-1',
          authorId: 'author-2',
          username: 'Member two',
          createdAt: '2026-11-04T09:00:00.000Z',
          text: 'Experience post',
          category: 'Experience',
          likeCount: 0,
          commentCount: 0,
          likedByMe: false,
          savedByMe: false,
        },
        {
          id: 'discussion-2',
          authorId: 'author-3',
          username: 'Member three',
          createdAt: '2026-11-04T08:00:00.000Z',
          text: 'Discussion post two',
          category: 'Discussion',
          likeCount: 0,
          commentCount: 0,
          likedByMe: false,
          savedByMe: false,
        },
        {
          id: 'promotion-1',
          authorId: 'author-4',
          username: 'Member four',
          createdAt: '2026-11-04T07:00:00.000Z',
          text: 'Promotion post',
          category: 'Promotion',
          likeCount: 0,
          commentCount: 0,
          likedByMe: false,
          savedByMe: false,
        },
      ],
      generalPosts: [],
      loading: false,
      refreshing: false,
      error: '',
      hasMore: false,
      refresh: jest.fn().mockResolvedValue(undefined),
      loadMore: jest.fn(),
      publishPost: jest.fn().mockResolvedValue(true),
      toggleLike: jest.fn().mockResolvedValue(true),
      toggleSave: jest.fn().mockResolvedValue(true),
      addComment: jest.fn().mockResolvedValue(true),
      loadComments: jest.fn().mockResolvedValue([]),
      reportPost: jest.fn().mockResolvedValue(true),
      blockUser: jest.fn(),
      comments: [],
      commentsLoading: false,
    });

    const view = await render(<CommunityFeedScreen navigation={navigation} />);
    await fireEvent.press(view.getByRole('button', { name: 'All categories' }));
    await fireEvent.press(view.getByLabelText('All categories (4)'));
    expect(view.getByText('Discussion post one')).toBeTruthy();
    expect(view.getByText('Experience post')).toBeTruthy();
    expect(view.getByText('Discussion post two')).toBeTruthy();
    expect(view.getByText('Promotion post')).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'All categories' }));
    await fireEvent.press(view.getByLabelText('Discussion (2)'));
    expect(view.getByText('Discussion post one')).toBeTruthy();
    expect(view.getByText('Discussion post two')).toBeTruthy();
    expect(view.queryByText('Experience post')).toBeNull();

    await fireEvent.press(view.getByRole('button', { name: 'All categories' }));
    await fireEvent.press(view.getByLabelText('Complaint (0)'));
    expect(view.getByText('No posts in this category yet')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Show all categories' }));
    expect(view.getByText('Experience post')).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'All categories' }));
    await fireEvent.press(view.getByLabelText('Promotion (1)'));
    expect(view.getByText('Promotion post')).toBeTruthy();
    expect(view.queryByText('Discussion post one')).toBeNull();
  });

  test('Community hides Nearby until it is implemented', async () => {
    const view = await render(<CommunityFeedScreen navigation={navigation} />);
    expect(view.queryByText('Nearby')).toBeNull();
    expect(view.queryByText('Soon')).toBeNull();
    expect(view.getByRole('tab', { name: 'Latest' })).toBeTruthy();
    expect(view.getByRole('tab', { name: 'For you' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'Feed filters' })).toBeTruthy();
  });

  test('default feed tabs expose Latest and For you', async () => {
    const onChange = jest.fn();
    const view = await render(<TabPills onChange={onChange} />);
    await fireEvent.press(view.getByText('For you'));
    expect(onChange).toHaveBeenNthCalledWith(1, 'forYou');
    expect(view.queryByText('Nearby')).toBeNull();
  });

  test('queued reports show saved status and confirmed reports show sent status', async () => {
    const reportPost = jest.fn().mockResolvedValueOnce('queued').mockResolvedValueOnce('sent');
    (useCommunityFeed as jest.Mock).mockReturnValue({
      posts: [
        {
          ...post,
          authorId: 'author-1',
          createdAt: '2026-11-04T10:00:00Z',
          likeCount: 0,
          commentCount: 0,
          likedByMe: false,
          savedByMe: false,
        },
      ],
      generalPosts: [],
      loading: false,
      refreshing: false,
      error: '',
      hasMore: false,
      refresh: jest.fn().mockResolvedValue(undefined),
      loadMore: jest.fn(),
      publishPost: jest.fn().mockResolvedValue(true),
      toggleLike: jest.fn(),
      toggleSave: jest.fn(),
      addComment: jest.fn(),
      loadComments: jest.fn().mockResolvedValue([]),
      reportPost,
      blockUser: jest.fn(),
      comments: [],
      commentsLoading: false,
    });
    const state = resetTestState({ session: { user: { id: 'member-1' } } });
    const alert = jest.spyOn(AppAlert, 'alert').mockImplementation(() => undefined);
    const view = await render(<CommunityFeedScreen navigation={navigation} />);
    await fireEvent.press(view.getByLabelText('More post options'));
    await fireEvent.press(view.getByText('Report'));
    await fireEvent.press(view.getByText('Spam or scam'));
    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith("Report saved, will send when you're online"),
    );
    expect(alert).not.toHaveBeenCalledWith('Report sent');

    (useCommunityFeed as jest.Mock).mockReturnValue({
      posts: [
        {
          ...post,
          authorId: 'author-1',
          createdAt: '2026-11-04T10:00:00Z',
          likeCount: 0,
          commentCount: 0,
          likedByMe: false,
          savedByMe: false,
        },
      ],
      generalPosts: [],
      loading: false,
      refreshing: false,
      error: '',
      hasMore: false,
      refresh: jest.fn().mockResolvedValue(undefined),
      loadMore: jest.fn(),
      publishPost: jest.fn().mockResolvedValue(true),
      toggleLike: jest.fn(),
      toggleSave: jest.fn(),
      addComment: jest.fn(),
      loadComments: jest.fn().mockResolvedValue([]),
      reportPost: jest.fn().mockResolvedValue('sent'),
      blockUser: jest.fn(),
      comments: [],
      commentsLoading: false,
    });
    const confirmed = await render(<CommunityFeedScreen navigation={navigation} />);
    await fireEvent.press(confirmed.getByLabelText('More post options'));
    await fireEvent.press(confirmed.getByText('Report'));
    await fireEvent.press(confirmed.getByText('Spam or scam'));
    await waitFor(() => expect(alert).toHaveBeenCalledWith('Report sent'));
    alert.mockRestore();
    expect(state.session.user.id).toBe('member-1');
  });

  test('TabPills supports controlled provider sections and scroll-driven selection', async () => {
    const tabs = [
      { id: 'about', label: 'About', Icon: Info },
      { id: 'reviews', label: 'Reviews', Icon: Star },
    ];
    const onChange = jest.fn();
    const view = await render(<TabPills tabs={tabs} value="about" onChange={onChange} />);
    expect(view.getByRole('tab', { name: 'About' }).props.accessibilityState.selected).toBe(true);

    await fireEvent.press(view.getByRole('tab', { name: 'Reviews' }));
    expect(onChange).toHaveBeenCalledWith('reviews');

    view.rerender(<TabPills tabs={tabs} value="reviews" onChange={onChange} />);
    await waitFor(() =>
      expect(view.getByRole('tab', { name: 'Reviews' }).props.accessibilityState.selected).toBe(
        true,
      ),
    );
  });

  test('guest post submission prompts sign-in without posting', async () => {
    const onPosted = jest.fn();
    const onRequireAuth = jest.fn();
    const view = await render(
      <PostComposer
        onSubmit={async (text) => ({
          id: 'submitted-post',
          username: 'Test member',
          timeAgo: 'Just now',
          text,
          category: 'Discussion',
          likes: 0,
          comments: 0,
          online: false,
        })}
        onPosted={onPosted}
        onRequireAuth={onRequireAuth}
      />,
    );
    await fireEvent.changeText(view.getByLabelText('Write a community post'), 'Guest draft');
    await fireEvent.press(view.getByRole('button', { name: 'Post' }));
    expect(onRequireAuth).toHaveBeenCalledTimes(1);
    expect(onPosted).not.toHaveBeenCalled();
  });

  test('post submit disables empty content and publishes once after loading', async () => {
    jest.useFakeTimers();
    const onPosted = jest.fn();
    const view = await render(
      <PostComposer
        onSubmit={(text) =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  id: 'submitted-post',
                  username: 'Test member',
                  timeAgo: 'Just now',
                  text,
                  category: 'Discussion',
                  likes: 0,
                  comments: 0,
                  online: false,
                }),
              1000,
            );
          })
        }
        onPosted={onPosted}
      />,
    );
    const postButton = view.getByRole('button', { name: 'Post' });
    expect(postButton.props.accessibilityState?.disabled ?? postButton.props.disabled).toBe(true);
    await fireEvent.press(postButton);
    expect(onPosted).not.toHaveBeenCalled();

    await fireEvent.changeText(view.getByLabelText('Write a community post'), 'Posted from test');
    await fireEvent.press(view.getByRole('button', { name: 'Post' }));
    expect(view.getByRole('button', { name: 'Posting' })).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Posting' }));
    await act(async () => {
      await jest.advanceTimersByTimeAsync(3200);
    });
    expect(onPosted).toHaveBeenCalledTimes(1);
    expect(onPosted.mock.calls[0][0].text).toBe('Posted from test');
    await waitFor(() => expect(view.getByLabelText('Write a community post').props.value).toBe(''));
  }, 10000);

  test('failed post keeps the draft and shows the composer error state', async () => {
    const view = await render(
      <PostComposer
        onSubmit={async () => {
          throw new Error('Offline');
        }}
        onPosted={jest.fn()}
      />,
    );
    const input = view.getByLabelText('Write a community post');
    await fireEvent.changeText(input, 'Keep this draft');
    await fireEvent.press(view.getByRole('button', { name: 'Post' }));
    await waitFor(() =>
      expect(view.getByText('Could not post. Your draft is saved; tap to retry.')).toBeTruthy(),
    );
    expect(view.getByLabelText('Write a community post').props.value).toBe('Keep this draft');
  });

  test('expired-session post keeps its draft and asks the user to sign in again', async () => {
    const state = resetTestState({ session: { user: { id: 'member-1' } } });
    const expired = Object.assign(new Error('JWT expired'), {
      status: 401,
      code: 'JWT_EXPIRED',
      authRequired: true,
    });
    (useCommunityFeed as jest.Mock).mockReturnValue({
      posts: [],
      loading: false,
      refreshing: false,
      error: '',
      hasMore: false,
      refresh: jest.fn().mockResolvedValue(undefined),
      loadMore: jest.fn(),
      publishPost: jest.fn().mockRejectedValue(expired),
      toggleLike: jest.fn(),
      toggleSave: jest.fn(),
      addComment: jest.fn(),
      loadComments: jest.fn(),
      reportPost: jest.fn(),
      blockUser: jest.fn(),
      comments: [],
      commentsLoading: false,
    });
    const alert = jest.spyOn(AppAlert, 'alert').mockImplementation(() => undefined);
    const view = await render(<CommunityFeedScreen navigation={navigation} />);
    const input = view.getByLabelText('Write a community post');
    await fireEvent.changeText(input, 'Keep this post until I sign in');
    await fireEvent.press(view.getByRole('button', { name: 'Post' }));

    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith(
        'Please sign in again',
        expect.stringContaining('resume after you sign in'),
        expect.any(Array),
      ),
    );
    expect(view.getByLabelText('Write a community post').props.value).toBe(
      'Keep this post until I sign in',
    );
    alert.mockRestore();
    expect(state.session.user.id).toBe('member-1');
  });

  test('photo add, change and remove actions update the attachment', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock)
      .mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: 'file:///first.jpg' }],
      })
      .mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: 'file:///second.jpg' }],
      });
    const view = await render(
      <PostComposer
        onSubmit={async (text, imageUri) => ({
          id: 'submitted-post',
          username: 'Test member',
          timeAgo: 'Just now',
          text,
          category: 'Discussion',
          likes: 0,
          comments: 0,
          online: false,
          imageUri,
        })}
        onPosted={jest.fn()}
      />,
    );
    await fireEvent.press(view.getByLabelText('Add image'));
    await waitFor(() => expect(view.getByLabelText('Remove attachment')).toBeTruthy());
    await fireEvent.press(view.getByLabelText('Add image'));
    await waitFor(() => expect(view.getByLabelText('Remove attachment')).toBeTruthy());
    await fireEvent.press(view.getByLabelText('Remove attachment'));
    expect(view.queryByLabelText('Remove attachment')).toBeNull();
  });

  test('emoji picker appears and inserts the selected emoji into the post', async () => {
    const view = await render(<PostComposer onSubmit={jest.fn()} onPosted={jest.fn()} />);
    const input = view.getByLabelText('Write a community post');
    await fireEvent.changeText(input, 'Hello ');

    await fireEvent.press(view.getByLabelText('Add emoji'));
    expect(view.getByText('Add an emoji')).toBeTruthy();

    await fireEvent.press(view.getByLabelText('Add emoji 😀'));
    expect(view.getByLabelText('Write a community post').props.value).toBe('Hello 😀');
    expect(view.queryByText('Add an emoji')).toBeNull();
  });

  test('like, comment, bookmark, share and more options have real outcomes', async () => {
    const onRequireAuth = jest.fn();
    const view = await render(<PostCard {...post} onRequireAuth={onRequireAuth} />);

    await fireEvent.press(view.getAllByLabelText(/Like post/)[0]);
    expect(onRequireAuth).toHaveBeenCalledTimes(1);

    const signedIn = await render(<PostCard {...post} />);
    await fireEvent.press(signedIn.getAllByLabelText(/Like post/)[0]);
    expect(signedIn.getAllByLabelText(/Unlike post/).length).toBeGreaterThan(0);
    await fireEvent.press(signedIn.getByLabelText('Bookmark post'));
    expect(signedIn.getAllByLabelText('Remove bookmark').length).toBeGreaterThan(0);
    await fireEvent.press(signedIn.getAllByLabelText('Share post')[0]);
    expect(Share.share).toHaveBeenCalledWith({
      message: 'A real community post\n\nShared from ChodhiQ',
    });

    await fireEvent.press(signedIn.getByLabelText('More post options'));
    expect(signedIn.getByText('Post options')).toBeTruthy();
    expect(signedIn.getByLabelText('Share')).toBeTruthy();
    await fireEvent.press(signedIn.getByLabelText(/Comment on post/));
    await fireEvent.changeText(signedIn.getByLabelText('Write a comment'), 'Useful reply');
    await fireEvent.press(signedIn.getAllByText('Comment', { exact: true }).at(-1));
    expect(signedIn.getByText('Useful reply')).toBeTruthy();
  });

  test('comment composer closes without submitting a comment', async () => {
    const view = await render(<PostCard {...post} />);
    await fireEvent.press(view.getByLabelText(/Comment on post/));
    expect(view.getByLabelText('Write a comment')).toBeTruthy();
    await fireEvent.press(view.getByText('Cancel'));
    expect(view.queryByLabelText('Write a comment')).toBeNull();
  });

  test('post images use contain and open a closable fullscreen viewer', async () => {
    const view = await render(<PostCard {...post} imageUri="https://example.invalid/post.jpg" />);
    const preview = view.getByLabelText('Post attachment');
    expect(preview.props.resizeMode).toBe('contain');
    expect(preview.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ maxHeight: 360 })]),
    );

    await fireEvent.press(view.getByTestId('btn-open-post-image'));
    expect(view.getByLabelText('Full post image')).toBeTruthy();
    await fireEvent.press(view.getByTestId('btn-close-post-image'));
    expect(view.queryByLabelText('Full post image')).toBeNull();
  });

  test('PostCard opens comments for an explicit notification request', async () => {
    const loadComments = jest.fn().mockResolvedValue([]);
    const view = await render(
      <PostCard {...post} openCommentsRequest={1} onLoadComments={loadComments} />,
    );
    await waitFor(() => expect(loadComments).toHaveBeenCalledTimes(1));
    expect(view.getByLabelText('Write a comment')).toBeTruthy();
  });
});
