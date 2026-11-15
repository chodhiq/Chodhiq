import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import RootNavigator from '../../src/navigation/RootNavigator';
import { loadAccount } from '../../src/data/accountRepository';
import { formatNotification, formatQuote, mapProfile } from '../../src/data/accountMappers';
import { loadMarketplace } from '../../src/data/providerRepository';
import { createProviderReport } from '../../src/data/accountRepository';
import ProfileScreen from '../../src/screens/ProfileScreen';
import ProfileScreenErrorBoundary from '../../src/components/ProfileScreenErrorBoundary';
import { resetTestState, testProvider } from '../buttons/helpers';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useIsFocused: () => true,
}));
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  __esModule: true,
  default: {
    getInitialURL: jest.fn().mockResolvedValue(null),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));
jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context');
  return {
    ...actual,
    SafeAreaProvider: ({ children }) => children,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 400, height: 800 }),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});
jest.mock('../../src/lib/sentryUtils', () => ({
  captureError: jest.fn(),
  addBreadcrumb: jest.fn(),
  startTransaction: () => ({ finish: jest.fn() }),
}));
jest.mock('../../src/lib/supabase', () => ({
  get supabase() {
    return globalThis.__BACKEND_MATRIX_CLIENT__;
  },
  get isSupabaseConfigured() {
    return true;
  },
  getOrCreateSession: jest.fn().mockResolvedValue(null),
}));
jest.mock('../../src/data/localDatabase', () => ({
  loadLocalAccount: jest.fn().mockResolvedValue({
    profile: null,
    saved: [],
    quotes: [],
    notifications: [],
    reviews: [],
    ownedProviders: [],
  }),
  hasImportedLocalSavedItems: jest.fn().mockResolvedValue(true),
  markLocalSavedItemsImported: jest.fn().mockResolvedValue(undefined),
  loadPendingOperations: jest.fn().mockResolvedValue([]),
  loadLocalMarketplace: jest.fn().mockResolvedValue({
    categories: [],
    providers: [],
    lastUpdatedAt: null,
    offline: true,
  }),
  cacheMarketplace: jest.fn().mockResolvedValue(new Date(0).toISOString()),
  enqueuePendingOperation: jest.fn().mockResolvedValue(undefined),
  createLocalReport: jest.fn().mockResolvedValue(undefined),
}));

const user = {
  id: 'matrix-user',
  email: 'matrix@example.invalid',
  created_at: '2021-08-17T09:30:00.000Z',
};

const providerRow = {
  id: 'provider-matrix',
  business_name: 'Matrix Barber',
  description: null,
  base_city: null,
  base_postcode: null,
  service_areas: null,
  languages_spoken: null,
  years_experience: null,
  price_range: null,
  phone: null,
  whatsapp: null,
  website: null,
  google_place_id: null,
  cover_image_url: null,
  portfolio_urls: null,
  is_verified: false,
  data_verification_status: null,
  data_verified_at: null,
  avg_rating: null,
  review_count: null,
  created_at: null,
  categories: null,
};

const bookingRow = {
  id: 'booking-matrix',
  user_id: user.id,
  provider_id: 'provider-no-longer-listed',
  service_id: null,
  requested_date: '2026-12-04',
  requested_time: null,
  status: 'new_backend_status',
  notes: null,
  provider_message: null,
  created_at: '2026-10-13T10:00:00.000Z',
  providers: null,
  services: null,
};

const reviewRow = {
  id: 'review-matrix',
  provider_id: 'provider-no-longer-listed',
  user_id: user.id,
  rating: 4,
  comment: 'A review for a removed listing',
  created_at: null,
};

const notificationRow = {
  id: 'notification-matrix',
  user_id: user.id,
  title: 'Booking updated',
  body: 'Your booking status changed.',
  read_at: null,
  created_at: null,
  type: 'future_notification_type',
  entity_type: null,
  entity_id: null,
};

const quoteRow = {
  id: 'quote-matrix',
  provider_id: 'provider-no-longer-listed',
  message: 'Please contact me',
  status: 'future_quote_status',
  response_message: null,
  responded_at: null,
  created_at: null,
};

function result(data, error = null) {
  return { data, error };
}

function makeClient() {
  let scenario = 'realistic';
  const calls = [];
  const rowsByTable = {
    app_config: { config_value: { disabled_buttons: {} } },
    bookings: [bookingRow],
    categories: [{ id: 'category-matrix', name: 'Barber', slug: 'barber', icon: null, color: null }],
    notifications: [notificationRow],
    profiles: {
      full_name: null,
      phone: null,
      city: null,
      avatar_url: null,
      created_at: null,
    },
    provider_hours: [],
    provider_reports: null,
    providers: [providerRow],
    quote_requests: [quoteRow],
    review_replies: [],
    reviews: [reviewRow],
    saved_items: [],
    services: [],
  };

  function response(query) {
    calls.push({
      table: query.table,
      operation: query.operation,
      columns: query.columns,
      payload: query.payload,
    });

    if (query.table === 'provider_reports' && query.operation === 'insert') {
      if (scenario === 'permission-denied')
        return result(null, {
          code: '42501',
          message: 'permission denied by row-level security policy',
        });
      if (scenario === 'expired-session')
        return result(null, { code: 'JWT_EXPIRED', status: 401, message: 'JWT expired' });
      if (scenario === 'duplicate-report')
        return result(null, { code: '23505', message: 'duplicate key value violates unique constraint' });
      if (scenario === 'delayed-rejection')
        return new Promise((_, reject) => setTimeout(() => reject(new Error('network timeout')), 10));
      return result(null);
    }

    if (scenario === 'rls-empty') {
      if (query.table === 'profiles') return result(null);
      return result([]);
    }
    if (scenario === 'expired-session' && query.table !== 'provider_reports')
      return result(null, { code: 'JWT_EXPIRED', status: 401, message: 'JWT expired' });
    if (
      scenario === 'delayed-rejection' &&
      query.table === 'notifications' &&
      query.operation === 'select'
    )
      return new Promise((_, reject) => setTimeout(() => reject(new Error('network timeout')), 10));

    return result(rowsByTable[query.table] ?? []);
  }

  class Query {
    constructor(table) {
      this.table = table;
      this.operation = 'select';
      this.columns = '';
      this.payload = null;
    }
    select(columns) {
      this.columns = columns;
      return this;
    }
    insert(payload) {
      this.operation = 'insert';
      this.payload = payload;
      return this;
    }
    upsert(payload) {
      this.operation = 'upsert';
      this.payload = payload;
      return this;
    }
    update(payload) {
      this.operation = 'update';
      this.payload = payload;
      return this;
    }
    delete() {
      this.operation = 'delete';
      return this;
    }
    eq() {
      return this;
    }
    is() {
      return this;
    }
    in() {
      return this;
    }
    order() {
      return this;
    }
    limit() {
      return this;
    }
    range() {
      return this;
    }
    abortSignal() {
      return this;
    }
    maybeSingle() {
      return Promise.resolve(response(this)).then((value) => {
        if (value.error || !Array.isArray(value.data)) return value;
        return result(value.data[0] ?? null);
      });
    }
    single() {
      return Promise.resolve(response(this)).then((value) => {
        if (value.error || !Array.isArray(value.data)) return value;
        return result(value.data[0] ?? null);
      });
    }
    then(resolve, reject) {
      return Promise.resolve(response(this)).then(resolve, reject);
    }
  }

  return {
    calls,
    setScenario(value) {
      scenario = value;
    },
    from(table) {
      return new Query(table);
    },
    rpc(name) {
      const call = { rpc: name };
      return {
        abortSignal() {
          return this;
        },
        then(resolve, reject) {
          calls.push(call);
          return Promise.resolve(result([])).then(resolve, reject);
        },
      };
    },
    channel() {
      return { on() { return this; }, subscribe() { return this; } };
    },
    removeChannel() {},
    auth: { signOut: jest.fn().mockResolvedValue({ error: null }) },
  };
}

async function loadScreenState(client, scenario) {
  client.setScenario(scenario);
  let account = null;
  let marketplace = null;
  const errors = [];
  try {
    account = await loadAccount(user.id);
  } catch (error) {
    errors.push(error);
  }
  try {
    marketplace = await loadMarketplace();
  } catch (error) {
    errors.push(error);
  }

  const providers = marketplace?.providers?.length
    ? marketplace.providers
    : [{ ...testProvider, id: 'provider-matrix', name: 'Matrix Barber' }];
  const state = resetTestState({
    authReady: true,
    hasCompletedOnboarding: true,
    session: { user },
    profile: mapProfile(account?.profile || {}, user, null),
    providers,
    savedIds: (account?.saved || []).map((item) => item.provider_id),
    reviews: marketplace?.reviews || [],
    quoteRequests: (account?.quotes || []).map((row) => formatQuote(row, providers)),
    bookings: account?.bookings || [],
    notifications: (account?.notifications || []).map(formatNotification),
    preferences: { push: true, vibration: true, email: true, marketing: false },
    preferencesError: scenario === 'error-object' ? new Error('backend failure') : '',
    reportProvider: (providerId, reason, details) =>
      createProviderReport(user.id, providerId, reason, details),
  });
  return { state, errors };
}

function assertNoConsoleErrors(consoleErrors) {
  if (consoleErrors.length) {
    const detail = consoleErrors
      .flat()
      .map((value) => (value instanceof Error ? value.stack : String(value)))
      .join('\n');
    throw new Error(`Unexpected console.error:\n${detail}`);
  }
}

describe('backend response matrix for Profile and provider reports', () => {
  let client;
  let consoleErrors;
  let consoleErrorSpy;

  beforeEach(() => {
    client = makeClient();
    globalThis.__BACKEND_MATRIX_CLIENT__ = client;
    consoleErrors = [];
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((...args) => {
      consoleErrors.push(args);
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    delete globalThis.__BACKEND_MATRIX_CLIENT__;
  });

  test.each([
    ['realistic nullable rows, orphaned booking/review, and unknown enums', 'realistic'],
    ['RLS-empty account and marketplace results', 'rls-empty'],
    ['42501 report insert rejection', 'permission-denied'],
    ['expired-session response', 'expired-session'],
    ['duplicate report response', 'duplicate-report'],
    ['delayed network rejection', 'delayed-rejection'],
  ])('%s', async (_label, scenario) => {
    const { state, errors } = await loadScreenState(client, scenario);
    if (scenario === 'expired-session' || scenario === 'delayed-rejection') {
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toEqual(expect.any(String));
    } else expect(errors).toEqual([]);

    let view;
    await act(async () => {
      view = await render(<RootNavigator />);
    });
    await act(async () => {
      await fireEvent.press(view.getByRole('tab', { name: 'Profile' }));
    });
    await waitFor(() => expect(view.getByText('ChodhiQ member')).toBeTruthy());
    expect(view.queryByText('Oops, something went wrong!')).toBeNull();
    expect(state.session.user.id).toBe(user.id);
    view.unmount();
    assertNoConsoleErrors(consoleErrors);
  });

  test('the navigator report sheet submits to provider_reports', async () => {
    const { state } = await loadScreenState(client, 'realistic');
    let view;
    await act(async () => {
      view = await render(<RootNavigator />);
    });
    await act(async () => {
      await fireEvent.press(view.getByRole('tab', { name: 'Home' }));
    });
    await waitFor(() => expect(view.getByLabelText('View Matrix Barber')).toBeTruthy());
    await act(async () => {
      await fireEvent.press(view.getByLabelText('View Matrix Barber'));
    });
    await waitFor(() =>
      expect(view.getByRole('button', { name: 'Report incorrect provider information' })).toBeTruthy(),
    );
    await act(async () => {
      await fireEvent.press(
        view.getByRole('button', { name: 'Report incorrect provider information' }),
      );
    });
    await waitFor(() => expect(view.getByTestId('input-provider-report-details')).toBeTruthy());
    await fireEvent.changeText(view.getByTestId('input-provider-report-details'), 'Wrong address');
    expect(view.getByTestId('input-provider-report-details').props.value).toBe('Wrong address');
    await act(async () => {
      await fireEvent.press(view.getByTestId('btn-submit-provider-report'));
    });
    await waitFor(() =>
      expect(client.calls.some((call) => call.table === 'provider_reports')).toBe(true),
    );
    const insert = client.calls.find(
      (call) => call.table === 'provider_reports' && call.operation === 'insert',
    );
    expect(insert.payload).toMatchObject({
      reporter_id: user.id,
      provider_id: 'provider-matrix',
      reason: 'incorrect_information',
      details: 'Wrong address',
    });
    expect(view.queryByText('Oops, something went wrong!')).toBeNull();
    view.unmount();
    assertNoConsoleErrors(consoleErrors);
  });

  test.each([
    ['42501 permission denied', 'permission-denied', '42501'],
    ['expired authentication', 'expired-session', 'JWT_EXPIRED'],
    ['duplicate response', 'duplicate-report', '23505'],
  ])('report repository handles %s without rendering an error object', async (_label, scenario, code) => {
    const { state } = await loadScreenState(client, 'realistic');
    client.setScenario(scenario);
    await expect(
      state.reportProvider('provider-matrix', 'incorrect_information', 'Wrong address'),
    ).rejects.toMatchObject({ code });
    assertNoConsoleErrors(consoleErrors);
  });

  test('report repository handles a delayed rejection', async () => {
    const { state } = await loadScreenState(client, 'realistic');
    client.setScenario('delayed-rejection');
    await expect(
      state.reportProvider('provider-matrix', 'incorrect_information', 'Wrong address'),
    ).rejects.toThrow('network timeout');
    assertNoConsoleErrors(consoleErrors);
  });

  test('raw Error values are not rendered as Profile JSX children', async () => {
    await loadScreenState(client, 'error-object');
    const navigation = globalThis.__CHODHIQ_TEST_NAVIGATION__;
    const view = await render(
      <ProfileScreenErrorBoundary navigation={navigation}>
        <ProfileScreen navigation={navigation} />
      </ProfileScreenErrorBoundary>,
    );
    await waitFor(() => expect(view.getByText('ChodhiQ member')).toBeTruthy());
    await fireEvent.press(view.getByRole('button', { name: /Account & preferences/ }));
    assertNoConsoleErrors(consoleErrors);
    view.unmount();
  });
});
