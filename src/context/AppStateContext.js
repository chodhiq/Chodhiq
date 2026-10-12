import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  getOrCreateSession,
  finishEmailConfirmation,
  signInWithEmail,
  signInWithOAuth,
  signOutGoogleAccount,
  signUpWithEmail,
  supabase,
} from '../lib/supabase';
import {
  createProviderReport,
  createQuote,
  deleteCurrentAccount,
  getAccessContext,
  loadAccount,
  setSaved,
  updateProfile,
} from '../data/accountRepository';
import { clearLocalUserData, saveLocalReview } from '../data/localDatabase';
import { createReview, deleteReview, updateReview } from '../data/reviewRepository';
import { cancelBooking as cancelBookingRecord, createBooking } from '../data/bookingRepository';
import { cleanEmail, cleanPassword, cleanText, validateProfile } from '../lib/validation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearPushToken } from '../lib/pushNotifications';
import { useCommunicationPreferences } from '../hooks/useCommunicationPreferences';
import { formatQuote, mapProfile } from '../data/accountMappers';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { useMarketplaceState } from '../features/marketplace/useMarketplaceState';
import { useNotificationState } from '../features/notifications/useNotificationState';

const AppStateContext = createContext(null);
const LOCATION_COORDINATES_KEY = 'chodhiq-location-coordinates';

export function AppStateProvider({ children }) {
  const activeUserId = useRef(null);
  const [session, setSession] = useState(null);
  const [savedIds, setSavedIds] = useState([]);
  const [profile, setProfile] = useState({
    name: 'Guest',
    email: '',
    phone: '',
    location: 'Birmingham',
    avatarUri: null,
    memberSince: null,
  });
  const [locationCoordinates, setLocationCoordinates] = useState(null);
  const [recentlyViewedIds, setRecentlyViewedIds] = useState([]);
  const [quoteRequests, setQuoteRequests] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [signedIn, setSignedIn] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [access, setAccess] = useState({ isAdmin: false, ownedProviders: [] });
  const {
    preferences,
    preferencesError,
    preferencesSyncing,
    permissionDenied,
    retryPreferencesSync,
    setPreferences: updatePreferences,
    clearPreferences,
  } = useCommunicationPreferences(session?.user?.id);
  const { syncStatus, retryPendingOperations } = useOfflineSync();
  const {
    categories,
    providers,
    reviews,
    setReviews,
    offline,
    lastUpdatedAt,
    marketplaceLoading,
    refreshMarketplace,
  } = useMarketplaceState(retryPendingOperations);
  const {
    notifications,
    setNotifications,
    replaceNotifications,
    refreshNotifications,
    markAllNotificationsRead,
    unreadCount,
  } = useNotificationState(session);

  useEffect(() => {
    let active = true;
    (async () => {
      const marketplacePromise = refreshMarketplace();
      const completed = await AsyncStorage.getItem('chodhiq-onboarding-complete').catch(() => null);
      if (active) setHasCompletedOnboarding(completed === 'true');
      const nextSession = await getOrCreateSession();
      if (!active) return;
      if (!nextSession) {
        setAuthReady(true);
        await marketplacePromise;
        return;
      }
      setSession(nextSession);
      if (nextSession?.user) setProfile(mapProfile({}, nextSession.user));
      activeUserId.current = nextSession.user.id;
      setSignedIn(true);
      setHasCompletedOnboarding(true);
      setAuthReady(true);
      AsyncStorage.setItem('chodhiq-onboarding-complete', 'true').catch(() => {});
      const marketplace = await marketplacePromise;
      if (!active) return;
      await retryPendingOperations().catch((error) =>
        console.warn('Pending sync will retry later.', error.message),
      );
      const localAvatar = await AsyncStorage.getItem('chodhiq-profile-avatar').catch(() => null);
      const account = await loadAccount(nextSession.user.id);
      if (!active || activeUserId.current !== nextSession.user.id) return;
      const profileRow = account.profile;
      if (profileRow) {
        setProfile(mapProfile(profileRow, nextSession.user, localAvatar));
      }
      setSavedIds(account.saved.map((item) => item.provider_id));
      setQuoteRequests(account.quotes.map((row) => formatQuote(row, marketplace.providers)));
      setBookings(account.bookings || []);
      if (marketplace.offline) setReviews(account.reviews || []);
      replaceNotifications(account.notifications);
      const nextAccess = await getAccessContext(nextSession.user);
      if (active && activeUserId.current === nextSession.user.id) setAccess(nextAccess);
    })()
      .catch((error) => console.warn('App startup will retry available data later.', error.message))
      .finally(() => {
        if (active) setAuthReady(true);
      });
    return () => {
      active = false;
    };
  }, [refreshMarketplace]);

  useEffect(() => {
    AsyncStorage.getItem(LOCATION_COORDINATES_KEY)
      .then((value) => {
        if (!value) return;
        const savedLocation = JSON.parse(value);
        const coordinates = savedLocation.coordinates || savedLocation;
        if (Number.isFinite(coordinates.latitude) && Number.isFinite(coordinates.longitude))
          setLocationCoordinates(coordinates);
        if (typeof savedLocation.city === 'string' && savedLocation.city.trim())
          setProfile((current) => ({ ...current, location: savedLocation.city }));
      })
      .catch(() => {});
  }, []);

  const toggleSaved = useCallback(
    async (providerId) => {
      if (!session) throw new Error('Please sign in to save providers.');

      const wasSaved = savedIds.includes(providerId);
      setSavedIds((current) =>
        wasSaved ? current.filter((id) => id !== providerId) : [...current, providerId],
      );
      try {
        await setSaved(session.user.id, providerId, !wasSaved);
      } catch (error) {
        setSavedIds((current) =>
          wasSaved
            ? [...new Set([...current, providerId])]
            : current.filter((id) => id !== providerId),
        );
        throw error;
      }
    },
    [savedIds, session],
  );

  const addQuoteRequest = useCallback(
    async (request) => {
      if (!session) throw new Error('Please sign in before requesting a quote.');
      const data = await createQuote(session.user.id, request);
      const persisted = formatQuote(data, providers);
      setQuoteRequests((current) => [persisted, ...current]);
      return persisted;
    },
    [providers, session],
  );

  const addReview = useCallback(
    async (review) => {
      if (!session) throw new Error('Please sign in before adding a review.');
      const persisted = supabase
        ? await createReview(session.user.id, review)
        : await saveLocalReview(session.user.id, review);
      setReviews((current) => [persisted, ...current]);
      await refreshMarketplace();
      return persisted;
    },
    [refreshMarketplace, session],
  );
  const editReview = useCallback(
    async (reviewId, input) => {
      if (!session) throw new Error('Please sign in to edit a review.');
      const persisted = supabase
        ? await updateReview(session.user.id, reviewId, input)
        : { ...input, id: reviewId };
      setReviews((current) =>
        current.map((item) => (item.id === reviewId ? { ...item, ...persisted } : item)),
      );
      await refreshMarketplace();
      return persisted;
    },
    [refreshMarketplace, session],
  );
  const removeReview = useCallback(
    async (reviewId) => {
      if (!session) throw new Error('Please sign in to delete a review.');
      if (supabase) await deleteReview(session.user.id, reviewId);
      setReviews((current) => current.filter((item) => item.id !== reviewId));
      await refreshMarketplace();
    },
    [refreshMarketplace, session],
  );
  const addBooking = useCallback(
    async (booking) => {
      if (!session) throw new Error('Please sign in before requesting a booking.');
      const persisted = await createBooking(session.user.id, booking);
      setBookings((current) => [persisted, ...current]);
      return persisted;
    },
    [session],
  );
  const cancelBooking = useCallback(
    async (bookingId) => {
      if (!session) throw new Error('Please sign in to manage bookings.');
      await cancelBookingRecord(session.user.id, bookingId);
      setBookings((current) =>
        current.map((item) => (item.id === bookingId ? { ...item, status: 'cancelled' } : item)),
      );
    },
    [session],
  );
  const authenticate = useCallback(
    async (method, values = {}) => {
      const safeValues =
        method === 'email' || method === 'signup'
          ? {
              email: cleanEmail(values.email || ''),
              password: cleanPassword(values.password || ''),
              name:
                method === 'signup'
                  ? cleanText(values.name || '', { field: 'Name', min: 1, max: 100 })
                  : undefined,
            }
          : values;
      const nextSession =
        method === 'email'
          ? await signInWithEmail(safeValues.email, safeValues.password)
          : method === 'signup'
            ? await signUpWithEmail(safeValues.email, safeValues.password, safeValues.name)
            : method === 'callback'
              ? await finishEmailConfirmation(safeValues)
              : await signInWithOAuth(method);
      if (nextSession) {
        setSession(nextSession);
        if (nextSession?.user) setProfile(mapProfile({}, nextSession.user));
        activeUserId.current = nextSession.user.id;
        setSignedIn(true);
        setHasCompletedOnboarding(true);
        AsyncStorage.setItem('chodhiq-onboarding-complete', 'true').catch(() => {});
        // Authentication should not remain blocked by secondary account queries.
        // Load these after the session is accepted so a slow database response
        // cannot leave the sign-in button showing "Please wait" indefinitely.
        getAccessContext(nextSession.user)
          .then((nextAccess) => {
            if (activeUserId.current === nextSession.user.id) setAccess(nextAccess);
          })
          .catch((error) => console.warn('Account access will refresh later.', error.message));
        loadAccount(nextSession.user.id)
          .then(async (account) => {
            const localAvatar = await AsyncStorage.getItem('chodhiq-profile-avatar').catch(
              () => null,
            );
            if (activeUserId.current !== nextSession.user.id) return;
            setProfile(mapProfile(account.profile || {}, nextSession.user, localAvatar));
            setSavedIds(account.saved.map((item) => item.provider_id));
            setQuoteRequests(account.quotes.map((row) => formatQuote(row, providers)));
            setBookings(account.bookings || []);
            replaceNotifications(account.notifications || []);
            if (account.reviews?.length) setReviews(account.reviews);
          })
          .catch((error) => console.warn('Account details will refresh later.', error.message));
      }
      return nextSession;
    },
    [providers, replaceNotifications, setReviews],
  );

  const saveProfile = useCallback(
    async (nextProfile) => {
      if (!session) throw new Error('Please sign in to edit your profile.');
      const safeProfile = validateProfile(nextProfile);
      const previousProfile = profile;
      setProfile(safeProfile);
      try {
        await updateProfile(session.user.id, safeProfile);
        if (safeProfile.avatarUri)
          await AsyncStorage.setItem('chodhiq-profile-avatar', safeProfile.avatarUri).catch(
            () => {},
          );
      } catch (error) {
        setProfile(previousProfile);
        throw error;
      }
    },
    [profile, session],
  );

  const selectLocation = useCallback(
    (city) => {
      setLocationCoordinates(null);
      AsyncStorage.setItem(LOCATION_COORDINATES_KEY, JSON.stringify({ city })).catch(() => {});
      setProfile((current) => ({ ...current, location: city }));
      if (session)
        updateProfile(session.user.id, { ...profile, location: city }).catch((error) => {
          console.warn('Location change could not be saved.', error.message);
          setProfile((current) =>
            current.location === city ? { ...current, location: profile.location } : current,
          );
        });
    },
    [session, profile],
  );

  const setCurrentLocation = useCallback(
    (city, coordinates) => {
      setLocationCoordinates(coordinates);
      AsyncStorage.setItem(
        LOCATION_COORDINATES_KEY,
        JSON.stringify({ ...coordinates, city }),
      ).catch(() => {});
      setProfile((current) => ({ ...current, location: city }));
      if (session)
        updateProfile(session.user.id, { ...profile, location: city }).catch((error) => {
          console.warn('Current location could not be saved to the profile.', error.message);
        });
    },
    [profile, session],
  );

  const recordProviderView = useCallback((providerId) => {
    setRecentlyViewedIds((current) =>
      [providerId, ...current.filter((id) => id !== providerId)].slice(0, 8),
    );
  }, []);

  const signOut = useCallback(async () => {
    const userId = session?.user?.id;
    if (userId) await clearPushToken(userId).catch(() => {});
    try {
      await signOutGoogleAccount();
    } catch (error) {
      console.warn('Could not clear the Google account selection.', error.message);
    }
    if (supabase) {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
    }
    activeUserId.current = null;
    let cleanupError;
    try {
      if (userId) await clearLocalUserData(userId);
      await AsyncStorage.multiRemove(['chodhiq-profile-avatar', LOCATION_COORDINATES_KEY]);
      await clearPreferences();
    } catch (error) {
      cleanupError = error;
    }
    setSession(null);
    setSignedIn(false);
    setSavedIds([]);
    setQuoteRequests([]);
    setBookings([]);
    setReviews([]);
    setNotifications([]);
    setLocationCoordinates(null);
    setRecentlyViewedIds([]);
    setAccess({ isAdmin: false, ownedProviders: [] });
    setProfile({
      name: 'Guest',
      email: '',
      phone: '',
      location: 'Birmingham',
      avatarUri: null,
      memberSince: null,
    });
    if (cleanupError) throw cleanupError;
  }, [session, setNotifications, setReviews, clearPreferences]);

  const deleteAccount = useCallback(async () => {
    if (!session) throw new Error('Please sign in to delete your account.');
    await clearPushToken(session.user.id).catch(() => {});
    await deleteCurrentAccount();
    try {
      await signOutGoogleAccount();
    } catch (error) {
      console.warn(
        'Could not clear the Google account selection after account deletion.',
        error.message,
      );
    }
    activeUserId.current = null;
    let cleanupError;
    try {
      await clearLocalUserData(session.user.id);
      await AsyncStorage.multiRemove(['chodhiq-profile-avatar', LOCATION_COORDINATES_KEY]);
      await clearPreferences();
    } catch (error) {
      cleanupError = error;
    }
    if (supabase) await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    setSession(null);
    setSignedIn(false);
    setSavedIds([]);
    setQuoteRequests([]);
    setBookings([]);
    setReviews([]);
    setNotifications([]);
    setLocationCoordinates(null);
    setRecentlyViewedIds([]);
    setAccess({ isAdmin: false, ownedProviders: [] });
    setProfile({
      name: 'Guest',
      email: '',
      phone: '',
      location: 'Birmingham',
      avatarUri: null,
      memberSince: null,
    });
    if (cleanupError)
      throw new Error(
        'Account deleted, but device data could not be cleared. Clear ChodhiQ app storage in Android settings.',
      );
  }, [session, setNotifications, setReviews, clearPreferences]);

  const reportProvider = useCallback(
    async (providerId, reason, details) => {
      if (!session) throw new Error('Please sign in before submitting a report.');
      await createProviderReport(session.user.id, providerId, reason, details);
    },
    [session],
  );

  const value = useMemo(
    () => ({
      categories,
      providers,
      offline,
      lastUpdatedAt,
      syncStatus,
      retryPendingOperations,
      marketplaceLoading,
      refreshMarketplace,
      session,
      authReady,
      hasCompletedOnboarding,
      savedIds,
      toggleSaved,
      profile,
      setProfile,
      location: profile.location || 'Birmingham',
      locationCoordinates,
      selectLocation,
      setCurrentLocation,
      recentlyViewedIds,
      recordProviderView,
      quoteRequests,
      addQuoteRequest,
      bookings,
      addBooking,
      cancelBooking,
      reviews,
      addReview,
      editReview,
      removeReview,
      notifications,
      markAllNotificationsRead,
      unreadCount,
      preferences,
      preferencesError,
      preferencesSyncing,
      permissionDenied,
      retryPreferencesSync,
      setPreferences: updatePreferences,
      signedIn,
      authenticate,
      continueAsGuest: () => {
        activeUserId.current = null;
        setSession(null);
        setSignedIn(false);
        setHasCompletedOnboarding(true);
        AsyncStorage.setItem('chodhiq-onboarding-complete', 'true').catch(() => {});
      },
      signOut,
      access,
      saveProfile,
      reportProvider,
      deleteAccount,
    }),
    [
      categories,
      providers,
      offline,
      lastUpdatedAt,
      syncStatus,
      retryPendingOperations,
      marketplaceLoading,
      refreshMarketplace,
      session,
      authReady,
      hasCompletedOnboarding,
      savedIds,
      toggleSaved,
      profile,
      locationCoordinates,
      selectLocation,
      setCurrentLocation,
      recentlyViewedIds,
      recordProviderView,
      quoteRequests,
      addQuoteRequest,
      bookings,
      addBooking,
      cancelBooking,
      reviews,
      addReview,
      editReview,
      removeReview,
      notifications,
      unreadCount,
      preferences,
      preferencesError,
      preferencesSyncing,
      permissionDenied,
      retryPreferencesSync,
      updatePreferences,
      signedIn,
      authenticate,
      signOut,
      saveProfile,
      reportProvider,
      deleteAccount,
      access,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) throw new Error('useAppState must be used inside AppStateProvider');
  return context;
}
