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
import { clearLocalUserData } from '../data/localDatabase';
import { createReview, deleteReview, updateReview } from '../data/reviewRepository';
import { cancelBooking as cancelBookingRecord, createBooking } from '../data/bookingRepository';
import {
  cleanEmail,
  cleanPassword,
  cleanNewPassword,
  cleanText,
  validateProfile,
} from '../lib/validation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearPushToken } from '../lib/pushNotifications';
import { useCommunicationPreferences } from '../hooks/useCommunicationPreferences';
import { formatQuote, mapProfile } from '../data/accountMappers';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { useMarketplaceState } from '../features/marketplace/useMarketplaceState';
import { useNotificationState } from '../features/notifications/useNotificationState';
import { refreshRemoteButtonConfig } from '../lib/remoteButtonConfig';
import { showButtonToast, subscribeToButtonToasts } from '../lib/buttonToast';
import { captureError } from '../lib/sentryUtils';
import { findUserReview } from '../lib/reviewStats';
import { resumeAuthWriteDrafts, runAuthResumableWrite } from '../data/authResumableWrite';
import { claimProvider, createProvider } from '../data/claimRepository';

const AppStateContext = createContext(null);
const LOCATION_COORDINATES_KEY = 'chodhiq-location-coordinates';

export function AppStateProvider({ children }) {
  const activeUserId = useRef(null);
  const preferredArea = useRef(null);
  const [session, setSession] = useState(null);
  const [savedIds, setSavedIds] = useState([]);
  const savedIdsRef = useRef(savedIds);
  const savedRevision = useRef(0);
  const savedOperations = useRef(new Set());
  const replaceSavedIds = useCallback((ids) => {
    const normalized = [
      ...new Set((Array.isArray(ids) ? ids : []).filter((id) => id != null).map(String)),
    ];
    savedIdsRef.current = normalized;
    setSavedIds(normalized);
  }, []);
  const [writeStatus, setWriteStatus] = useState(null);
  const [profile, setProfile] = useState({
    name: 'Guest',
    email: '',
    phone: '',
    location: 'Birmingham',
    avatarUri: null,
    memberSince: null,
  });
  const profileForPreferredArea = useCallback((row, user, localAvatar) => {
    const nextProfile = mapProfile(row, user, localAvatar);
    if (preferredArea.current) nextProfile.location = preferredArea.current;
    return nextProfile;
  }, []);
  const [locationCoordinates, setLocationCoordinates] = useState(null);
  const [recentlyViewedIds, setRecentlyViewedIds] = useState([]);
  const [quoteRequests, setQuoteRequests] = useState([]);
  const [bookings, setBookings] = useState([]);
  const reviewCreateRequests = useRef(new Set());
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
  const [authWritePrompt, setAuthWritePrompt] = useState(null);
  const promptAuthWrite = useCallback((draft) => setAuthWritePrompt(draft), []);
  const clearAuthWritePrompt = useCallback(() => setAuthWritePrompt(null), []);
  const {
    syncStatus,
    retryPendingOperations,
    retryFailedOperation,
    discardFailedOperation,
    resumeAuthRequiredWrites,
  } = useOfflineSync();
  const {
    categories,
    providers,
    reviews,
    setReviews,
    reviewsLoading,
    reviewsError,
    offline,
    refreshError,
    lastUpdatedAt,
    marketplaceLoading,
    refreshMarketplace,
  } = useMarketplaceState(retryPendingOperations);
  const replayAuthDrafts = useCallback(
    async (nextSession = session) => {
      if (!nextSession?.user?.id) return [];
      return resumeAuthWriteDrafts(nextSession.user.id, (operation, payload) => {
        if (operation === 'review_create')
          return () => createReview(nextSession.user.id, payload.input);
        if (operation === 'review_update')
          return () => updateReview(nextSession.user.id, payload.reviewId, payload.input);
        if (operation === 'quote_request')
          return () => createQuote(nextSession.user.id, payload.input);
        if (operation === 'booking_create')
          return () => createBooking(nextSession.user.id, payload.input);
        if (operation === 'profile_update')
          return () => updateProfile(nextSession.user.id, payload.input);
        if (operation === 'provider_report')
          return () =>
            createProviderReport(
              nextSession.user.id,
              payload.providerId,
              payload.reason,
              payload.details,
            );
        if (operation === 'claim_provider') return () => claimProvider(payload.providerId);
        if (operation === 'provider_create')
          return () => createProvider(nextSession.user.id, payload.values);
        if (operation === 'community_comment')
          return async () => {
            const { error } = await supabase.from('community_comments').insert({
              post_id: payload.postId,
              author_id: nextSession.user.id,
              body: payload.body,
            });
            if (error) throw error;
          };
        return null;
      });
    },
    [session],
  );
  const {
    notifications,
    setNotifications,
    replaceNotifications,
    refreshNotifications,
    markAllNotificationsRead,
    unreadCount,
  } = useNotificationState(session);

  useEffect(() => {
    refreshRemoteButtonConfig().catch((error) => {
      console.warn('Remote button availability could not be loaded.', error?.message || error);
    });
  }, []);

  useEffect(() => subscribeToButtonToasts(setWriteStatus), []);

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
      if (nextSession?.user)
        setProfile(profileForPreferredArea({}, nextSession.user, null));
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
      const savedRevisionAtLoad = savedRevision.current;
      const account = await loadAccount(nextSession.user.id);
      if (!active || activeUserId.current !== nextSession.user.id) return;
      const profileRow = account.profile;
      if (profileRow) {
        setProfile(profileForPreferredArea(profileRow, nextSession.user, localAvatar));
      }
      if (savedRevision.current === savedRevisionAtLoad)
        replaceSavedIds(account.saved?.map((item) => item.provider_id) || []);
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
  }, [profileForPreferredArea, refreshMarketplace, replaceSavedIds]);

  useEffect(() => {
    AsyncStorage.getItem(LOCATION_COORDINATES_KEY)
      .then((value) => {
        if (!value) return;
        const savedLocation = JSON.parse(value);
        const coordinates = savedLocation.coordinates || savedLocation;
        if (Number.isFinite(coordinates.latitude) && Number.isFinite(coordinates.longitude))
          setLocationCoordinates(coordinates);
        if (typeof savedLocation.city === 'string' && savedLocation.city.trim()) {
          preferredArea.current = savedLocation.city.trim();
          setProfile((current) => ({ ...current, location: preferredArea.current }));
        }
        })
        .catch(() => {});
  }, []);

  const toggleSaved = useCallback(
    async (providerId) => {
      if (!session) throw new Error('Please sign in to save providers.');

      const id = String(providerId);
      if (savedOperations.current.has(id)) return { status: 'pending' };
      savedOperations.current.add(id);
      const wasSaved = savedIdsRef.current.includes(id);
      savedRevision.current += 1;
      replaceSavedIds(
        wasSaved
          ? savedIdsRef.current.filter((savedId) => savedId !== id)
          : [...savedIdsRef.current, id],
      );
      try {
        const result = await setSaved(session.user.id, id, !wasSaved);
        showButtonToast(
          result?.status === 'pending'
            ? wasSaved
              ? "Removed from saved on your phone, will sync when you're online"
              : "Saved on your phone, will sync when you're online"
            : wasSaved
              ? 'Removed from saved'
              : 'Saved',
        );
        return result;
      } catch (error) {
        captureError(error, { operation: 'toggleSaved' });
        const current = savedIdsRef.current;
        replaceSavedIds(
          wasSaved ? [...new Set([...current, id])] : current.filter((savedId) => savedId !== id),
        );
        showButtonToast('Could not update saved item. Please try again.');
        return { status: 'error' };
      } finally {
        savedOperations.current.delete(id);
      }
    },
    [replaceSavedIds, session],
  );

  const addQuoteRequest = useCallback(
    async (request) => {
      if (!session) throw new Error('Please sign in before requesting a quote.');
      const data = await runAuthResumableWrite({
        operation: 'quote_request',
        ownerId: session.user.id,
        payload: { input: request },
        write: () => createQuote(session.user.id, request),
        onAuthRequired: setAuthWritePrompt,
      });
      const persisted = formatQuote(data, providers);
      setQuoteRequests((current) => [persisted, ...current]);
      showButtonToast(
        data?.syncStatus === 'pending'
          ? 'Saved on your phone, will send when you’re online'
          : 'Sent',
      );
      return { ...persisted, syncStatus: data?.syncStatus };
    },
    [providers, session],
  );

  const addReview = useCallback(
    async (review) => {
      if (!session) throw new Error('Please sign in before adding a review.');
      const providerId = String(review.providerId);
      if (
        findUserReview(reviews, providerId, session.user.id) ||
        reviewCreateRequests.current.has(providerId)
      ) {
        throw new Error('You have already reviewed this provider.');
      }

      reviewCreateRequests.current.add(providerId);
      try {
        const persisted = await runAuthResumableWrite({
          operation: 'review_create',
          ownerId: session.user.id,
          payload: { input: review },
          write: () => createReview(session.user.id, review),
          onAuthRequired: setAuthWritePrompt,
        });
        setReviews((current) => [persisted, ...current]);
        showButtonToast(
          persisted?.syncStatus === 'pending'
            ? 'Saved on your phone, will send when you’re online'
            : 'Sent',
        );
        await refreshMarketplace();
        return persisted;
      } finally {
        reviewCreateRequests.current.delete(providerId);
      }
    },
    [refreshMarketplace, reviews, session],
  );
  const editReview = useCallback(
    async (reviewId, input) => {
      if (!session) throw new Error('Please sign in to edit a review.');
      const persisted = supabase
        ? await runAuthResumableWrite({
            operation: 'review_update',
            ownerId: session.user.id,
            payload: { reviewId, input },
            write: () => updateReview(session.user.id, reviewId, input),
            onAuthRequired: setAuthWritePrompt,
          })
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
      const persisted = await runAuthResumableWrite({
        operation: 'booking_create',
        ownerId: session.user.id,
        payload: { input: booking },
        write: () => createBooking(session.user.id, booking),
        onAuthRequired: setAuthWritePrompt,
      });
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
        Array.isArray(current)
          ? current.map((item) => (item.id === bookingId ? { ...item, status: 'cancelled' } : item))
          : [],
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
              password:
                method === 'signup'
                  ? cleanNewPassword(values.password || '')
                  : cleanPassword(values.password || ''),
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
        if (nextSession?.user)
          setProfile(profileForPreferredArea({}, nextSession.user, null));
        activeUserId.current = nextSession.user.id;
        setSignedIn(true);
        setHasCompletedOnboarding(true);
        AsyncStorage.setItem('chodhiq-onboarding-complete', 'true').catch(() => {});
        resumeAuthRequiredWrites().catch((error) =>
          console.warn('Saved writes will resume when authentication is ready.', error.message),
        );
        replayAuthDrafts(nextSession).catch((error) =>
          console.warn('Your saved write is still waiting to resume.', error.message),
        );
        clearAuthWritePrompt();
        // Authentication should not remain blocked by secondary account queries.
        // Load these after the session is accepted so a slow database response
        // cannot leave the sign-in button showing "Please wait" indefinitely.
        getAccessContext(nextSession.user)
          .then((nextAccess) => {
            if (activeUserId.current === nextSession.user.id) setAccess(nextAccess);
          })
          .catch((error) => console.warn('Account access will refresh later.', error.message));
        const savedRevisionAtLoad = savedRevision.current;
        loadAccount(nextSession.user.id)
          .then(async (account) => {
            const localAvatar = await AsyncStorage.getItem('chodhiq-profile-avatar').catch(
              () => null,
            );
            if (activeUserId.current !== nextSession.user.id) return;
            setProfile(
              profileForPreferredArea(account.profile || {}, nextSession.user, localAvatar),
            );
            if (savedRevision.current === savedRevisionAtLoad)
              replaceSavedIds(account.saved?.map((item) => item.provider_id) || []);
            setQuoteRequests(account.quotes.map((row) => formatQuote(row, providers)));
            setBookings(account.bookings || []);
            replaceNotifications(account.notifications || []);
            setReviews((current) => {
              const remoteReviews = current.filter((item) => item.userId !== nextSession.user.id);
              return [...remoteReviews, ...(account.reviews || [])];
            });
          })
          .catch((error) => console.warn('Account details will refresh later.', error.message));
      }
      return nextSession;
    },
    [
      clearAuthWritePrompt,
      providers,
      replaceSavedIds,
      replaceNotifications,
      replayAuthDrafts,
      resumeAuthRequiredWrites,
      profileForPreferredArea,
      setReviews,
    ],
  );

  const saveProfile = useCallback(
    async (nextProfile) => {
      if (!session) throw new Error('Please sign in to edit your profile.');
      const safeProfile = validateProfile(nextProfile);
      const previousProfile = profile;
      setProfile(safeProfile);
      try {
        const result = await runAuthResumableWrite({
          operation: 'profile_update',
          ownerId: session.user.id,
          payload: { input: safeProfile },
          write: () => updateProfile(session.user.id, safeProfile),
          onAuthRequired: setAuthWritePrompt,
        });
        showButtonToast(
          result?.syncStatus === 'pending'
            ? 'Saved on your phone, will send when you’re online'
            : 'Sent',
        );
        if (safeProfile.avatarUri)
          await AsyncStorage.setItem('chodhiq-profile-avatar', safeProfile.avatarUri).catch(
            () => {},
          );
        return result;
      } catch (error) {
        setProfile(previousProfile);
        throw error;
      }
    },
    [profile, session],
  );

  const selectLocation = useCallback(
    (city) => {
      preferredArea.current = city;
      setLocationCoordinates(null);
      AsyncStorage.setItem(LOCATION_COORDINATES_KEY, JSON.stringify({ city })).catch(() => {});
      setProfile((current) => ({ ...current, location: city }));
      if (session)
        updateProfile(session.user.id, { ...profile, location: city }).catch((error) => {
          console.warn('Location change could not be saved.', error.message);
        });
    },
    [session, profile],
  );

  const setCurrentLocation = useCallback(
    (city, coordinates) => {
      preferredArea.current = city;
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
    activeUserId.current = null;
    if (userId) await clearPushToken(userId).catch(() => {});
    try {
      await signOutGoogleAccount();
    } catch (error) {
      console.warn('Could not clear the Google account selection.', error.message);
    }
    if (supabase) {
      try {
        const { error } = await supabase.auth.signOut({ scope: 'local' });
        if (error) console.warn('Could not complete Supabase sign-out.', error.message);
      } catch (error) {
        console.warn('Could not complete Supabase sign-out.', error.message);
      }
    }
    let cleanupError;
    try {
      if (userId) await clearLocalUserData(userId);
      await AsyncStorage.multiRemove(['chodhiq-profile-avatar', LOCATION_COORDINATES_KEY]);
      preferredArea.current = null;
      await clearPreferences();
    } catch (error) {
      cleanupError = error;
    }
    setSession(null);
    setSignedIn(false);
    replaceSavedIds([]);
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
  }, [session, setNotifications, setReviews, clearPreferences, replaceSavedIds]);

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
      preferredArea.current = null;
      await clearPreferences();
    } catch (error) {
      cleanupError = error;
    }
    if (supabase) await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    setSession(null);
    setSignedIn(false);
    replaceSavedIds([]);
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
  }, [session, setNotifications, setReviews, clearPreferences, replaceSavedIds]);

  const reportProvider = useCallback(
    async (providerId, reason, details) => {
      if (!session) throw new Error('Please sign in before submitting a report.');
      const result = await runAuthResumableWrite({
        operation: 'provider_report',
        ownerId: session.user.id,
        payload: { providerId, reason, details },
        write: () => createProviderReport(session.user.id, providerId, reason, details),
        onAuthRequired: setAuthWritePrompt,
      });
      showButtonToast(
        result?.status === 'pending' ? 'Saved on your phone, will send when you’re online' : 'Sent',
      );
      return result;
    },
    [session],
  );

  const value = useMemo(
    () => ({
      categories,
      providers,
      offline,
      refreshError,
      lastUpdatedAt,
      syncStatus,
      writeStatus,
      authWritePrompt,
      promptAuthWrite,
      clearAuthWritePrompt,
      retryPendingOperations,
      retryFailedOperation,
      discardFailedOperation,
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
      reviewsLoading,
      reviewsError,
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
      refreshError,
      lastUpdatedAt,
      syncStatus,
      writeStatus,
      authWritePrompt,
      promptAuthWrite,
      clearAuthWritePrompt,
      retryPendingOperations,
      retryFailedOperation,
      discardFailedOperation,
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
      reviewsLoading,
      reviewsError,
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
