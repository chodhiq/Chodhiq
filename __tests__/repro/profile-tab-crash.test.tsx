import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';
import RootNavigator from '../../src/navigation/RootNavigator';
import { formatNotification, mapProfile } from '../../src/data/accountMappers';
import { mapBooking } from '../../src/data/bookingMapper';
import { mapReview } from '../../src/data/reviewRepository';
import { resetTestState, testProvider } from '../buttons/helpers';

jest.mock('@react-navigation/native', () => jest.requireActual('@react-navigation/native'));
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

const user = {
  id: 'test-user',
  email: 'test@example.invalid',
  created_at: '2021-08-17T09:30:00.000Z',
};

const reviewRow = {
  id: 'review-1',
  provider_id: 'provider-drd',
  user_id: user.id,
  rating: 4,
  comment: 'Test review',
  created_at: '2026-10-12T10:00:00.000Z',
  review_replies: [{ body: 'Test business reply' }],
};

const bookingRow = {
  id: 'booking-1',
  user_id: user.id,
  provider_id: 'provider-drd',
  service_id: 'service-1',
  requested_date: '2026-12-04',
  requested_time: '10:30:00',
  status: 'cancelled',
  notes: '',
  provider_message: '',
  created_at: '2026-10-13T10:00:00.000Z',
  providers: { business_name: 'DRD' },
  services: { name: 'Test service' },
};

const notificationRow = {
  id: 'notification-1',
  user_id: user.id,
  title: 'Booking updated',
  body: 'Your booking status changed.',
  read_at: null,
  created_at: '2026-10-14T10:00:00.000Z',
  type: 'booking_update',
  entity_type: 'booking',
  entity_id: 'booking-1',
};

class ReproAppErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    return this.state.error ? <Text>Oops, something went wrong!</Text> : this.props.children;
  }
}

function makeProfileState(variant) {
  const accountProfile = mapProfile(
    {
      full_name: 'Test Customer Updated Name',
      phone: '',
      city: 'Birmingham',
      avatar_url: null,
      created_at: variant === 'invalid dates' ? 'not-a-date' : user.created_at,
    },
    user,
    null,
  );
  const booking = mapBooking({
    ...bookingRow,
    requested_date: variant === 'invalid dates' ? 'not-a-date' : bookingRow.requested_date,
    providers: variant === 'missing provider' ? null : bookingRow.providers,
  });
  const notification = formatNotification({
    ...notificationRow,
    created_at: variant === 'invalid dates' ? 'not-a-date' : notificationRow.created_at,
    type: variant === 'unexpected notification type' ? 'unrecognized_test_type' : 'booking_update',
  });
  const state = resetTestState({
    authReady: true,
    hasCompletedOnboarding: true,
    session: { user },
    profile: accountProfile,
    providers:
      variant === 'missing provider'
        ? []
        : [{ ...testProvider, id: 'provider-drd', name: 'DRD', businessName: 'DRD' }],
    savedIds: [],
    reviews: [mapReview(reviewRow)],
    bookings: [booking],
    notifications: [notification],
    unreadCount: 1,
  });
  return state;
}

describe('Profile tab crash reproduction', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('remains rendered for the account fixture and three edge-case variants', async () => {
    makeProfileState('account fixture');
    jest.useFakeTimers();
    const uncaughtConsoleErrors = [];
    jest.spyOn(console, 'error').mockImplementation((...args) => {
      if (
        args.some(
          (value) =>
            value instanceof Error ||
            (typeof value === 'string' &&
              /uncaught|uncaught exception|uncaught error|The above error/i.test(value)),
        )
      )
        uncaughtConsoleErrors.push(args);
    });

    const view = await render(
      <ReproAppErrorBoundary>
        <RootNavigator />
      </ReproAppErrorBoundary>,
    );
    fireEvent.press(view.getByRole('tab', { name: 'Profile' }));
    for (const variant of [
      'account fixture',
      'missing provider',
      'invalid dates',
      'unexpected notification type',
    ]) {
      if (variant !== 'account fixture') {
        makeProfileState(variant);
        view.rerender(
          <ReproAppErrorBoundary>
            <RootNavigator />
          </ReproAppErrorBoundary>,
        );
      }
      await act(async () => {
        await jest.advanceTimersByTimeAsync(2100);
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(view.getByText('Test Customer Updated Name')).toBeTruthy();
      expect(view.getByRole('button', { name: 'Saved: 0' })).toBeTruthy();
      expect(view.getByRole('button', { name: 'Reviews: 1' })).toBeTruthy();
      expect(view.getByRole('button', { name: 'Bookings: 0' })).toBeTruthy();
      expect(view.queryByText('Profile couldn’t load')).toBeNull();
      expect(view.queryByText('Oops, something went wrong!')).toBeNull();
      const currentState = globalThis.__CHODHIQ_TEST_APP_STATE__;
      expect(currentState.profile).toMatchObject({
        name: 'Test Customer Updated Name',
        avatarUri: null,
        memberSince: variant === 'invalid dates' ? '' : '2021',
      });
      expect(currentState.reviews[0]).toMatchObject({ rating: 4, reply: 'Test business reply' });
      expect(currentState.bookings[0]).toMatchObject({
        status: 'cancelled',
        providerId: 'provider-drd',
        providerName: variant === 'missing provider' ? 'Provider' : 'DRD',
        requestedDate: variant === 'invalid dates' ? 'not-a-date' : '2026-12-04',
      });
      expect(currentState.notifications[0]).toMatchObject({
        type:
          variant === 'unexpected notification type' ? 'unrecognized_test_type' : 'booking_update',
        read: false,
        time: variant === 'invalid dates' ? '' : expect.any(String),
      });
      expect(uncaughtConsoleErrors).toEqual([]);
    }
    view.unmount();
  });
});
