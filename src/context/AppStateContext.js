import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  getOrCreateSession,
  signInWithEmail,
  signInWithOAuth,
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
import { saveLocalReview } from '../data/localDatabase';
import { createReview } from '../data/reviewRepository';
import { cancelBooking as cancelBookingRecord, createBooking } from '../data/bookingRepository';
import { cleanEmail, cleanPassword, cleanText, validateProfile } from '../lib/validation';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearPushToken } from '../lib/pushNotifications';
import { useCommunicationPreferences } from '../hooks/useCommunicationPreferences';
import { formatQuote } from '../data/accountMappers';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { useMarketplaceState } from '../features/marketplace/useMarketplaceState';
import { useNotificationState } from '../features/notifications/useNotificationState';

const AppStateContext = createContext(null);

export function AppStateProvider({ children }) {
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
  const [recentlyViewedIds, setRecentlyViewedIds] = useState([]);
  const [quoteRequests, setQuoteRequests] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [signedIn, setSignedIn] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [access, setAccess] = useState({ isAdmin: false, ownedProviders: [] });
  const { preferences, setPreferences: updatePreferences } = useCommunicationPreferences(
    session?.user?.id,
  );
  const { syncStatus, retryPendingOperations } = useOfflineSync();
  const {
    categories,
    providers,
    reviews,
    setReviews,
    offline,
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
      const profileRow = account.profile;
      if (profileRow) {
        const nextProfile = {
          name:
            profileRow.full_name || nextSession.user.user_metadata?.full_name || 'ChodhiQ member',
          email: nextSession.user.email || '',
          phone: profileRow.phone || '',
          location: profileRow.city || 'Birmingham',
          avatarUri: localAvatar || profileRow.avatar_url || null,
          memberSince: new Date(profileRow.created_at || nextSession.user.created_at)
            .getFullYear()
            .toString(),
        };
        setProfile(nextProfile);
      }
      setSavedIds(account.saved.map((item) => item.provider_id));
      setQuoteRequests(account.quotes.map((row) => formatQuote(row, marketplace.providers)));
      setBookings(account.bookings || []);
      if (marketplace.offline) setReviews(account.reviews || []);
      replaceNotifications(account.notifications);
      setAccess(await getAccessContext(nextSession.user));
    })()
      .catch((error) => console.warn('App startup will retry available data later.', error.message))
      .finally(() => {
        if (active) setAuthReady(true);
      });
    return () => {
      active = false;
    };
  }, [refreshMarketplace]);

  const toggleSaved = useCallback(
    async (providerId) => {
      if (!session) throw new Error('Please sign in to save providers.');
      Haptics.selectionAsync().catch(() => {});
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
            : await signInWithOAuth(method);
      if (nextSession) {
        setSession(nextSession);
        setSignedIn(true);
        setHasCompletedOnboarding(true);
        AsyncStorage.setItem('chodhiq-onboarding-complete', 'true').catch(() => {});
        // Authentication should not remain blocked by secondary account queries.
        // Load these after the session is accepted so a slow database response
        // cannot leave the sign-in button showing "Please wait" indefinitely.
        getAccessContext(nextSession.user)
          .then(setAccess)
          .catch((error) => console.warn('Account access will refresh later.', error.message));
        refreshNotifications(nextSession.user.id).catch((error) =>
          console.warn('Notifications will refresh later.', error.message),
        );
      }
      return nextSession;
    },
    [refreshNotifications],
  );

  const saveProfile = useCallback(
    async (nextProfile) => {
      if (!session) throw new Error('Please sign in to edit your profile.');
      const safeProfile = validateProfile(nextProfile);
      await updateProfile(session.user.id, safeProfile);
      setProfile(safeProfile);
      if (safeProfile.avatarUri)
        await AsyncStorage.setItem('chodhiq-profile-avatar', safeProfile.avatarUri).catch(() => {});
    },
    [session],
  );

  const selectLocation = useCallback(
    (city) => {
      setProfile((current) => ({ ...current, location: city }));
      if (session) updateProfile(session.user.id, { ...profile, location: city }).catch(() => {});
    },
    [session, profile],
  );

  const recordProviderView = useCallback((providerId) => {
    setRecentlyViewedIds((current) =>
      [providerId, ...current.filter((id) => id !== providerId)].slice(0, 8),
    );
  }, []);

  const signOut = useCallback(async () => {
    if (session?.user?.id) await clearPushToken(session.user.id).catch(() => {});
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    setSignedIn(false);
    setSavedIds([]);
    setQuoteRequests([]);
    setBookings([]);
    setAccess({ isAdmin: false, ownedProviders: [] });
    setProfile({
      name: 'Guest',
      email: '',
      phone: '',
      location: 'Birmingham',
      avatarUri: null,
      memberSince: null,
    });
  }, [session]);

  const deleteAccount = useCallback(async () => {
    if (!session) throw new Error('Please sign in to delete your account.');
    await clearPushToken(session.user.id).catch(() => {});
    await deleteCurrentAccount();
    await AsyncStorage.clear();
    setSession(null);
    setSignedIn(false);
    setSavedIds([]);
    setQuoteRequests([]);
    setBookings([]);
    setNotifications([]);
    setAccess({ isAdmin: false, ownedProviders: [] });
    setProfile({
      name: 'Guest',
      email: '',
      phone: '',
      location: 'Birmingham',
      avatarUri: null,
      memberSince: null,
    });
  }, [session]);

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
      selectLocation,
      recentlyViewedIds,
      recordProviderView,
      quoteRequests,
      addQuoteRequest,
      bookings,
      addBooking,
      cancelBooking,
      reviews,
      addReview,
      notifications,
      markAllNotificationsRead,
      unreadCount,
      preferences,
      setPreferences: updatePreferences,
      signedIn,
      authenticate,
      continueAsGuest: () => {
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
      selectLocation,
      recentlyViewedIds,
      recordProviderView,
      quoteRequests,
      addQuoteRequest,
      bookings,
      addBooking,
      cancelBooking,
      reviews,
      addReview,
      notifications,
      unreadCount,
      preferences,
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
