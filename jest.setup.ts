globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.requestAnimationFrame = (callback) => {
  callback(0);
  return 0;
};
globalThis.cancelAnimationFrame = () => {};
const { Alert } = require('react-native');

const palette = {
  id: 'dark',
  dark: true,
  bg: '#080A09',
  background: '#080A09',
  surface: '#111513',
  surfaceAlt: '#191E1B',
  surfaceRaised: '#232A26',
  field: '#171C19',
  border: '#29312D',
  primary: '#20C767',
  primaryPressed: '#18A653',
  primaryTint: '#143322',
  primarySoft: '#143322',
  onPrimary: '#06110A',
  accent: '#45E382',
  accentTint: '#302A18',
  text: '#F3F6F4',
  text2: '#A1ABA5',
  textSecondary: '#A1ABA5',
  textTertiary: '#747E78',
  muted: '#747E78',
  saffron: '#F5A623',
  star: '#F5A623',
  heart: '#FF5A5A',
  coral: '#FF5A5A',
  indigo: '#45E382',
  lavenderSoft: '#302A18',
  goldSoft: '#302A18',
  primaryAction: '#20C767',
  primaryStrong: '#18A653',
  primaryActionText: '#06110A',
  backgroundColor: '#080A09',
};

Object.assign(globalThis, {
  __workletsModuleProxy: new Proxy(
    {},
    {
      get:
        (_target, method) =>
        (...args) => ({ method, value: args[0] }),
    },
  ),
  __CHODHIQ_TEST_PALETTE__: palette,
  __CHODHIQ_TEST_SHEET_PRESENTS__: [],
  __CHODHIQ_TEST_APP_STATE__: {
    categories: [],
    providers: [],
    savedIds: [],
    toggleSaved: jest.fn().mockResolvedValue(undefined),
    location: 'Birmingham',
    locationCoordinates: null,
    unreadCount: 0,
    offline: false,
    lastUpdatedAt: null,
    marketplaceLoading: false,
    refreshMarketplace: jest.fn().mockResolvedValue(undefined),
    session: null,
    profile: { name: 'Guest', email: '', avatarUri: null },
    setCurrentLocation: jest.fn(),
    selectLocation: jest.fn(),
    authenticate: jest.fn().mockResolvedValue({ user: { id: 'test-user' } }),
    continueAsGuest: jest.fn(),
    signOut: jest.fn().mockResolvedValue(undefined),
    preferences: {},
    setPreferences: jest.fn().mockResolvedValue(undefined),
    preferencesError: '',
    preferencesSyncing: false,
    permissionDenied: false,
    retryPreferencesSync: jest.fn().mockResolvedValue(undefined),
    access: { isAdmin: false, ownedProviders: [] },
    reviews: [],
    quoteRequests: [],
    bookings: [],
    saveProfile: jest.fn().mockResolvedValue(undefined),
    addQuoteRequest: jest.fn().mockResolvedValue(undefined),
    addReview: jest.fn().mockResolvedValue(undefined),
    editReview: jest.fn().mockResolvedValue(undefined),
    deleteReview: jest.fn().mockResolvedValue(undefined),
    addBooking: jest.fn().mockResolvedValue(undefined),
    cancelBooking: jest.fn().mockResolvedValue(undefined),
    markAllNotificationsRead: jest.fn().mockResolvedValue(undefined),
    deleteAccount: jest.fn().mockResolvedValue(undefined),
    notifications: [],
  },
  __CHODHIQ_TEST_NAVIGATION__: {
    navigate: jest.fn(),
    replace: jest.fn(),
    reset: jest.fn(),
    goBack: jest.fn(),
    setParams: jest.fn(),
    dispatch: jest.fn(),
  },
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: { latitude: 52.4862, longitude: -1.8904 },
  }),
  reverseGeocodeAsync: jest.fn().mockResolvedValue([{ city: 'Birmingham' }]),
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getLastNotificationResponseAsync: jest.fn().mockResolvedValue(null),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  setNotificationHandler: jest.fn(),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
  launchCameraAsync: jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
}));
jest.mock('react-native-webview/lib/NativeRNCWebViewModule', () => ({
  __esModule: true,
  default: {},
}));
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockMapView = (props) => React.createElement(View, props, props.children);
  return { __esModule: true, default: MockMapView, Marker: MockMapView };
});
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Icon = (props) => React.createElement(View, props);
  return new Proxy({ __esModule: true }, { get: (target, key) => target[key] || Icon });
});
jest.mock('react-native/Libraries/Share/Share', () => ({
  __esModule: true,
  default: {
    share: jest.fn().mockResolvedValue({ action: 'sharedAction' }),
  },
}));
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  __esModule: true,
  default: {
    canOpenURL: jest.fn().mockResolvedValue(true),
    openURL: jest.fn().mockResolvedValue(undefined),
    openSettings: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [
      { uri: 'file:///verification.pdf', name: 'verification.pdf', mimeType: 'application/pdf' },
    ],
  }),
}));

jest.mock('expo-linking', () => ({
  createURL: jest.fn((path = '') => `chodhiq://${path}`),
  parse: jest.fn(() => ({ path: null, queryParams: {} })),
  openURL: jest.fn().mockResolvedValue(undefined),
  canOpenURL: jest.fn().mockResolvedValue(true),
  getInitialURL: jest.fn().mockResolvedValue(null),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock('react-native-reanimated/src/initializers.native', () => ({
  initializeReanimatedModule: jest.fn(),
}));
jest.mock('react-native-reanimated', () => {
  const mock = require('react-native-reanimated/mock');
  return {
    ...mock,
    useAnimatedRef: jest.fn(() => jest.fn()),
  };
});
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const createGesture = () => {
    const gesture = {};
    for (const method of [
      'onBegin',
      'onUpdate',
      'onEnd',
      'numberOfTaps',
      'activeOffsetY',
      'failOffsetX',
    ]) {
      gesture[method] = jest.fn(() => gesture);
    }
    return gesture;
  };
  const passthrough = ({ children }) => React.createElement(React.Fragment, null, children);
  return {
    Gesture: {
      Pinch: createGesture,
      Tap: createGesture,
      Pan: createGesture,
      Simultaneous: (...gestures) => gestures,
    },
    GestureDetector: passthrough,
    GestureHandlerRootView: passthrough,
  };
});
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setUser: jest.fn(),
  addBreadcrumb: jest.fn(),
}));
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const ReactNative = require('react-native');
  const mockIcon = (props) => React.createElement(ReactNative.View, props);
  return new Proxy({ __esModule: true }, { get: (target, key) => target[key] || mockIcon });
});
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    NavigationContainer: ({ children }) => children,
    useNavigation: () => globalThis.__CHODHIQ_TEST_NAVIGATION__,
    useIsFocused: () => true,
    useFocusEffect: (callback) => require('react').useEffect(callback, [callback]),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context');
  const react = require('react');
  return {
    ...actual,
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: ({ children, ...props }) => react.createElement('View', props, children),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

jest.mock('./src/context/AppStateContext', () => ({
  useAppState: () => globalThis.__CHODHIQ_TEST_APP_STATE__,
}));

jest.mock('./src/context/ThemeContext', () => ({
  useChodhiQTheme: () => ({
    palette: globalThis.__CHODHIQ_TEST_PALETTE__,
    communityPalette: globalThis.__CHODHIQ_TEST_PALETTE__,
    mode: 'dark',
    isDark: true,
  }),
}));

jest.mock('./src/lib/supabase', () => ({
  supabase: null,
  isSupabaseConfigured: false,
  getOrCreateSession: jest.fn().mockResolvedValue(null),
  signInWithEmail: jest.fn(),
  signInWithOAuth: jest.fn(),
  signUpWithEmail: jest.fn(),
  signOutGoogleAccount: jest.fn(),
  requestPasswordReset: jest.fn().mockResolvedValue(undefined),
  resendEmailConfirmation: jest.fn().mockResolvedValue(undefined),
  preparePasswordRecovery: jest.fn().mockResolvedValue(undefined),
  updatePassword: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@gorhom/bottom-sheet', () => {
  const ReactNative = require('react-native');
  const React = require('react');
  const ModalContext = React.createContext(null);

  function BottomSheetModalProvider({ children }) {
    const [modals, setModals] = React.useState(new Map());
    const registerModal = React.useCallback((id, content) => {
      setModals((current) => {
        const existing = current.get(id);
        const next = new Map(current);
        next.set(id, { content, presented: existing?.presented || false });
        return next;
      });
    }, []);
    const setModalPresented = React.useCallback((id, presented) => {
      setModals((current) => {
        const existing = current.get(id) || { content: null, presented: false };
        const next = new Map(current);
        next.set(id, { ...existing, presented });
        return next;
      });
    }, []);
    const unregisterModal = React.useCallback((id) => {
      setModals((current) => {
        if (!current.has(id)) return current;
        const next = new Map(current);
        next.delete(id);
        return next;
      });
    }, []);
    const context = React.useMemo(
      () => ({ registerModal, setModalPresented, unregisterModal }),
      [registerModal, setModalPresented, unregisterModal],
    );
    const presentedModals = Array.from(modals.values())
      .filter((modal) => modal.presented && modal.content)
      .map((modal, index) =>
        React.createElement(ReactNative.View, { key: index }, modal.content),
      );

    return React.createElement(
      ModalContext.Provider,
      { value: context },
      React.createElement(React.Fragment, null, children, ...presentedModals),
    );
  }

  const BottomSheetModal = React.forwardRef(function BottomSheetModal(
    {
      children,
      backdropComponent,
      backgroundComponent,
      backgroundStyle,
      handleComponent,
      handleIndicatorStyle,
    },
    ref,
  ) {
    const context = React.useContext(ModalContext);
    const [id] = React.useState(() => ({}));
    const content = React.createElement(
      ReactNative.View,
      null,
      backdropComponent ? React.createElement(backdropComponent, { style: {} }) : null,
      backgroundComponent
        ? React.createElement(backgroundComponent, { style: {} })
        : React.createElement(ReactNative.View, { style: backgroundStyle }),
      handleComponent
        ? React.createElement(handleComponent)
        : React.createElement(ReactNative.View, { style: handleIndicatorStyle }),
      children,
    );
    React.useEffect(() => {
      if (!context) return undefined;
      context.registerModal(id, content);
    }, [content, context, id]);
    React.useEffect(() => {
      if (!context) return undefined;
      return () => context.unregisterModal(id);
    }, [context, id]);
    React.useImperativeHandle(
      ref,
      () => ({
        present: () => {
          globalThis.__CHODHIQ_TEST_SHEET_PRESENTS__.push('present');
          context?.setModalPresented(id, true);
        },
        dismiss: () => {
          globalThis.__CHODHIQ_TEST_SHEET_PRESENTS__.push('dismiss');
          context?.setModalPresented(id, false);
        },
      }),
      [context, id],
    );
    return null;
  });

  function BottomSheetBackdrop() {
    return null;
  }

  return {
    BottomSheetModalProvider,
    BottomSheetModal,
    BottomSheetView: ({ children }) => React.createElement(ReactNative.View, null, children),
    BottomSheetScrollView: ({ children, ...props }) =>
      React.createElement(ReactNative.ScrollView, props, children),
    BottomSheetTextInput: (props) => React.createElement(ReactNative.TextInput, props),
    BottomSheetBackdrop,
  };
});

jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  const ReactNative = require('react-native');
  function DateTimePicker({ testID }) {
    return React.createElement(ReactNative.View, {
      testID,
      accessibilityLabel: 'Date and time selector',
    });
  }
  return DateTimePicker;
});

jest.mock('@testing-library/react-native', () => {
  const React = require('react');
  const actual = jest.requireActual('@testing-library/react-native');
  const { BottomSheetModalProvider } = require('@gorhom/bottom-sheet');
  return {
    ...actual,
    render(element, options = {}) {
      function TestProviders({ children }) {
        const content = options.wrapper
          ? React.createElement(options.wrapper, null, children)
          : children;
        return BottomSheetModalProvider
          ? React.createElement(BottomSheetModalProvider, null, content)
          : content;
      }
      return actual.render(element, { ...options, wrapper: TestProviders });
    },
  };
});

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn().mockResolvedValue(undefined),
  canOpenURL: jest.fn().mockResolvedValue(true),
  openSettings: jest.fn().mockResolvedValue(undefined),
  getInitialURL: jest.fn().mockResolvedValue(null),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
