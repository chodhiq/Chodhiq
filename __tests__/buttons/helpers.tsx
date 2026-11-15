import React from 'react';
import { render } from '@testing-library/react-native';

const providers = [
  {
    id: 'provider-1',
    name: 'Test Barber',
    businessName: 'Test Barber',
    category: 'Barber',
    categoryId: 'barber',
    baseCity: 'Birmingham',
    baseLatitude: 52.4862,
    baseLongitude: -1.8904,
    rating: 4.8,
    reviewCount: 12,
    image: null,
    services: [],
    openingHours: [],
  },
];

export function resetTestState(overrides = {}) {
  const state = globalThis.__CHODHIQ_TEST_APP_STATE__;
  Object.assign(state, {
    categories: [{ id: 'barber', name: 'Barber' }],
    providers,
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
    reportProvider: jest.fn().mockResolvedValue(undefined),
    recordProviderView: jest.fn(),
    addReview: jest.fn().mockResolvedValue(undefined),
    editReview: jest.fn().mockResolvedValue(undefined),
    removeReview: jest.fn().mockResolvedValue(undefined),
    deleteReview: jest.fn().mockResolvedValue(undefined),
    addBooking: jest.fn().mockResolvedValue(undefined),
    cancelBooking: jest.fn().mockResolvedValue(undefined),
    markAllNotificationsRead: jest.fn().mockResolvedValue(undefined),
    deleteAccount: jest.fn().mockResolvedValue(undefined),
    notifications: [],
    ...overrides,
  });
  Object.values(globalThis.__CHODHIQ_TEST_NAVIGATION__).forEach((value) => {
    if (typeof value === 'function') value.mockClear();
  });
  return state;
}

export function renderScreen(ui: React.ReactElement) {
  return render(ui);
}

export const testProvider = providers[0];
