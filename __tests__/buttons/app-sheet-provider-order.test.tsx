import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import AppProviders from '../../src/components/AppProviders';
import GlassView from '../../src/components/GlassView';
import { useChodhiQTheme } from '../../src/context/ThemeContext';
import ProfileScreen from '../../src/screens/ProfileScreen';
import ProviderDetailScreen from '../../src/screens/ProviderDetailScreen';
import CommunityFeedScreen from '../../screens/CommunityFeedScreen';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

jest.unmock('../../src/context/AppStateContext');
jest.unmock('../../src/context/ThemeContext');
jest.mock('../../src/features/marketplace/useMarketplaceState', () => {
  const provider = {
    id: '1',
    name: 'Test Provider',
    category: 'Interior Design',
    baseCity: 'Birmingham',
    phone: '+44 7000 000000',
    whatsapp: '+44 7000 000000',
    rating: 5,
    reviewCount: 1,
    isVerified: true,
    services: [],
    portfolio: [],
  };
  const refreshMarketplace = jest.fn().mockResolvedValue({
    categories: [],
    providers: [provider],
    reviews: [],
    offline: false,
  });
  return {
    useMarketplaceState: () => ({
      categories: [],
      providers: [provider],
      reviews: [],
      setReviews: jest.fn(),
      reviewsLoading: false,
      reviewsError: null,
      offline: false,
      refreshError: null,
      lastUpdatedAt: null,
      marketplaceLoading: false,
      refreshMarketplace,
    }),
  };
});
jest.mock('../../src/lib/supabase', () => ({
  supabase: null,
  getOrCreateSession: jest.fn().mockResolvedValue({
    user: { id: 'sheet-test-user', email: 'sheet@example.invalid' },
  }),
  signInWithEmail: jest.fn(),
  signInWithOAuth: jest.fn(),
  signOutGoogleAccount: jest.fn(),
  signUpWithEmail: jest.fn(),
}));
jest.mock('../../src/data/accountRepository', () => ({
  createProviderReport: jest.fn(),
  createQuote: jest.fn(),
  deleteCurrentAccount: jest.fn(),
  getAccessContext: jest.fn().mockResolvedValue({ isAdmin: false, ownedProviders: [] }),
  loadAccount: jest.fn().mockResolvedValue({
    profile: null,
    saved: [],
    quotes: [],
    bookings: [],
    reviews: [],
    notifications: [],
  }),
  setSaved: jest.fn(),
  updateProfile: jest.fn(),
}));
jest.mock('../../src/hooks/useCommunicationPreferences', () => ({
  useCommunicationPreferences: () => ({
    preferences: {},
    preferencesError: '',
    preferencesSyncing: false,
    permissionDenied: false,
    retryPreferencesSync: jest.fn(),
    setPreferences: jest.fn(),
    clearPreferences: jest.fn(),
  }),
}));
jest.mock('../../src/hooks/useCommunityFeed', () => ({
  __esModule: true,
  default: () => ({
    posts: [],
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
    reconcileCommunityWrites: jest.fn().mockResolvedValue(undefined),
    loadComments: jest.fn().mockResolvedValue([]),
    reportPost: jest.fn().mockResolvedValue('sent'),
    blockUser: jest.fn(),
    comments: [],
    commentsLoading: false,
  }),
}));
jest.mock('../../src/hooks/useEffectsLevel', () => ({
  __esModule: true,
  default: () => 'reduced',
}));
jest.mock('../../src/hooks/useMotionPreferences', () => ({
  __esModule: true,
  default: () => true,
  useMotionPreferences: () => ({ reducedMotion: true, visualEffectsLevel: 'reduced' }),
}));
jest.mock('expo-blur', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    BlurView: (props) => React.createElement(View, props),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context');
  return {
    ...actual,
    SafeAreaProvider: ({ children }) => children,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 400, height: 800 }),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

const navigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setParams: jest.fn(),
  getParent: jest.fn(() => null),
};

function ThemeFallbackProbe() {
  const { isDark, palette } = useChodhiQTheme();
  return <Text testID="theme-fallback">{`${isDark}:${palette.background}`}</Text>;
}

describe('app sheet provider order', () => {
  let consoleError: jest.SpyInstance;

  async function renderWithAppProviders(children: React.ReactNode) {
    return render(<AppProviders>{children}</AppProviders>);
  }

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 0;
    });
    jest.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {});
    globalThis.__CHODHIQ_TEST_SHEET_PRESENTS__ = [];
  });

  afterEach(() => {
    const calls = consoleError.mock.calls;
    jest.restoreAllMocks();
    expect(calls).toEqual([]);
  });

  test('uses the default dark theme without a theme provider', async () => {
    const view = await render(
      <>
        <ThemeFallbackProbe />
        <GlassView testID="glass-view-without-theme" />
      </>,
    );
    expect(view.getByTestId('theme-fallback').props.children).toBe('true:#080A09');
    expect(view.getByTestId('glass-view-without-theme')).toBeTruthy();
    view.unmount();
  });

  test('opens the logout sheet without errors', async () => {
    const view = await renderWithAppProviders(
      <ProfileScreen navigation={navigation} />,
    );
    await waitFor(() => expect(view.getByTestId('btn-open-logout')).toBeTruthy());
    await fireEvent.press(view.getByTestId('btn-open-logout'));
    await waitFor(() => expect(view.getByText('Log out of ChodhiQ?')).toBeTruthy());
    expect(
      globalThis.__CHODHIQ_TEST_SHEET_PRESENTS__.filter((action) => action === 'present'),
    ).toHaveLength(1);
    view.unmount();
  });

  test('opens the Community category sheet without errors', async () => {
    const view = await renderWithAppProviders(
      <CommunityFeedScreen navigation={navigation} />,
    );
    await fireEvent.press(view.getByLabelText('All categories'));
    await waitFor(() => expect(view.getByText('Filter by category')).toBeTruthy());
    expect(view.getByText('Choose which conversations to show.')).toBeTruthy();
    view.unmount();
  });

  test('opens the provider quote sheet without errors', async () => {
    const view = await renderWithAppProviders(
      <ProviderDetailScreen route={{ params: { id: '1' } }} navigation={navigation} />,
    );
    await fireEvent.press(view.getByTestId('btn-request-quote'));
    await waitFor(() => expect(view.getByText('Request a Quote')).toBeTruthy());
    expect(
      globalThis.__CHODHIQ_TEST_SHEET_PRESENTS__.filter((action) => action === 'present'),
    ).toHaveLength(1);
    view.unmount();
  });
});
