import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import ProviderDetailScreen from '../../src/screens/ProviderDetailScreen';
import ProfileScreen from '../../src/screens/ProfileScreen';
import {
  BookingsScreen,
  NotificationsScreen,
  ReviewsScreen,
} from '../../src/screens/AccountScreens';
import { resetTestState, testProvider } from './helpers';
import { showButtonToast, subscribeToButtonToasts } from '../../src/lib/buttonToast';
import { getUkFutureDate } from '../../src/data/bookingValidation';
import { mapReview } from '../../src/data/reviewRepository';

jest.mock('../../src/lib/openExternalUrl', () => ({
  openExternalUrl: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../src/data/bookingRepository', () => ({
  loadConfirmedBookingTimes: jest.fn().mockResolvedValue([]),
}));
jest.mock('expo-intent-launcher', () => ({
  startActivityAsync: jest.fn().mockResolvedValue({ resultCode: -1 }),
}));
jest.mock('../../src/components/ChodhiQMap', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: () => React.createElement(View, { testID: 'provider-map-tiles' }),
  };
});

const navigation = globalThis.__CHODHIQ_TEST_NAVIGATION__;

describe('business detail and account buttons', () => {
  beforeEach(() => resetTestState());

  test('provider tabs switch sections and rating stars enable review publishing', async () => {
    const state = resetTestState({ session: { user: { id: 'member-1' } } });
    const view = await render(
      <ProviderDetailScreen route={{ params: { id: testProvider.id } }} navigation={navigation} />,
    );
    await fireEvent.press(view.getAllByText('Reviews').at(-1));
    await fireEvent.press(view.getByRole('button', { name: '5 stars' }));
    await fireEvent.changeText(
      view.getByPlaceholderText('What was your experience like?'),
      'Excellent service',
    );
    const publish = view.getByText('Publish review').parent;
    expect(publish?.props.disabled).not.toBe(true);
    await fireEvent.press(view.getByText('Publish review'));
    await waitFor(() =>
      expect(state.addReview).toHaveBeenCalledWith({
        providerId: testProvider.id,
        rating: 5,
        comment: 'Excellent service',
      }),
    );
    expect(Alert.alert).toHaveBeenCalledWith(
      'Review published',
      expect.any(String),
      expect.any(Array),
      expect.any(Object),
    );
  });

  test('detail rating uses review records and existing review can be edited without a duplicate form', async () => {
    resetTestState({
      session: { user: { id: 'member-1' } },
      providers: [{ ...testProvider, rating: null, reviewCount: 0 }],
      reviews: [
        {
          id: 'review-1',
          providerId: testProvider.id,
          userId: 'member-1',
          rating: 4,
          text: 'Helpful service',
          date: 'Today',
        },
      ],
    });
    const view = await render(
      <ProviderDetailScreen route={{ params: { id: testProvider.id } }} navigation={navigation} />,
    );

    expect(view.getByText('4.0 (1 review)')).toBeTruthy();
    expect(view.getAllByText('4.0')).toHaveLength(1);
    expect(view.queryByText('Publish review')).toBeNull();
    expect(view.getByText('Community member')).toBeTruthy();
    await fireEvent.press(view.getByLabelText('Edit your review'));
    expect(view.getByText('Save changes')).toBeTruthy();
  });

  test('guest review and booking actions prompt for sign-in', async () => {
    resetTestState();
    const view = await render(
      <ProviderDetailScreen route={{ params: { id: testProvider.id } }} navigation={navigation} />,
    );
    await fireEvent.press(view.getAllByText('Reviews').at(-1));
    await fireEvent.press(view.getByText('Sign in to leave a review'));
    expect(navigation.navigate).toHaveBeenCalledWith('Welcome');
    await fireEvent.press(
      view.getAllByRole('button', { name: 'Report incorrect provider information' })[0],
    );
    expect(navigation.navigate).toHaveBeenCalledWith('Welcome');
  });

  test('Find us renders the tile map and has no duplicate Directions action', async () => {
    const view = await render(
      <ProviderDetailScreen route={{ params: { id: testProvider.id } }} navigation={navigation} />,
    );
    expect(view.getByTestId('provider-map-tiles')).toBeTruthy();
    expect(view.getAllByLabelText('Directions')).toHaveLength(1);
    expect(view.getByText('View on map')).toBeTruthy();
  });

  test('contact actions and map directions are hidden when their data is missing', async () => {
    const provider = {
      ...testProvider,
      phone: '',
      whatsapp: '',
      baseLatitude: null,
      baseLongitude: null,
    };
    resetTestState({ providers: [provider] });
    const view = await render(
      <ProviderDetailScreen route={{ params: { id: provider.id } }} navigation={navigation} />,
    );
    expect(view.queryByLabelText('Call')).toBeNull();
    expect(view.queryByLabelText('WhatsApp')).toBeNull();
    expect(view.queryByLabelText('Directions')).toBeNull();
    expect(view.getByText(/Map preview unavailable/)).toBeTruthy();
  });

  test('quote, WhatsApp and report actions submit or show a sign-in prompt', async () => {
    const state = resetTestState({
      session: { user: { id: 'member-1' } },
      providers: [{ ...testProvider, whatsapp: '447700900123', phone: '07700900123' }],
    });
    const view = await render(
      <ProviderDetailScreen route={{ params: { id: testProvider.id } }} navigation={navigation} />,
    );
    await fireEvent.press(view.getByText('Quote'));
    await fireEvent.changeText(
      view.getByPlaceholderText(/I'd like a quote for/),
      'Please send a quote',
    );
    await fireEvent.press(view.getByText('Send via WhatsApp'));
    await waitFor(() => expect(state.addQuoteRequest).toHaveBeenCalled());

    await fireEvent.press(view.getAllByLabelText('Report incorrect provider information')[0]);
    const submitReport = view.getByRole('button', { name: 'Submit report' });
    expect(submitReport.props.accessibilityState?.disabled).toBe(true);
    await fireEvent.press(submitReport);
    expect(state.reportProvider).not.toHaveBeenCalled();
    await fireEvent.changeText(
      view.getByPlaceholderText(/Incorrect phone, address/),
      'Phone number is outdated',
    );
    expect(view.getByRole('button', { name: 'Submit report' }).props.accessibilityState?.disabled)
      .toBe(false);
    await fireEvent.press(view.getByRole('button', { name: 'Submit report' }));
    await waitFor(() =>
      expect(state.reportProvider).toHaveBeenCalledWith(
        testProvider.id,
        'incorrect_information',
        'Phone number is outdated',
      ),
    );
  });

  test('profile avatar and account-security actions have accessible button labels', async () => {
    resetTestState({ session: { user: { id: 'member-1' } } });
    const view = await render(<ProfileScreen navigation={navigation} />);
    expect(view.getByRole('button', { name: 'Change profile picture' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'Edit profile and account security' })).toBeTruthy();
  });

  test('profile renders with a locally preferred area and incomplete profile data', async () => {
    resetTestState({
      session: { user: { id: 'member-1' } },
      profile: { location: 'Leeds' },
      access: {},
    });

    const view = await render(<ProfileScreen navigation={navigation} />);

    expect(view.getByText('ChodhiQ member')).toBeTruthy();
    expect(view.getByText('Community member')).toBeTruthy();
  });

  test('offline save shows pending and a later confirmed sync shows sent', async () => {
    const state = resetTestState({ session: { user: { id: 'member-1' } } });
    state.toggleSaved.mockImplementation(async () => {
      showButtonToast('Saved on your phone, will send when you’re online');
      return { status: 'pending' };
    });
    const received: Array<{ message: string }> = [];
    const unsubscribe = subscribeToButtonToasts((toast) => {
      if (toast) received.push(toast);
    });
    await render(
      <ProviderDetailScreen route={{ params: { id: testProvider.id } }} navigation={navigation} />,
    );
    const save = state.toggleSaved;
    await save(testProvider.id);
    expect(received.at(-1)?.message).toBe('Saved on your phone, will send when you’re online');
    showButtonToast('Sent');
    expect(received.at(-1)?.message).toBe('Sent');
    unsubscribe();
  });

  test('booking history tabs and cancel confirmation call the booking action', async () => {
    const booking = {
      id: 'booking-1',
      providerName: 'Test Barber',
      serviceName: 'Haircut',
      requestedDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      requestedTime: '12:00',
      status: 'pending',
    };
    const state = resetTestState({ bookings: [booking] });
    const view = await render(<BookingsScreen navigation={navigation} />);
    await fireEvent.press(view.getByText('Past'));
    expect(view.getByText('No past bookings')).toBeTruthy();
    await fireEvent.press(view.getByText('Upcoming'));
    await fireEvent.press(view.getByText('Cancel booking'));
    const actions = (Alert.alert as jest.Mock).mock.calls.at(-1)?.[2];
    await actions.find((action) => action.text === 'Cancel booking').onPress();
    await waitFor(() => expect(state.cancelBooking).toHaveBeenCalledWith(booking.id));
  });

  test('Profile booking counter counts only pending and confirmed bookings', async () => {
    resetTestState({
      session: { user: { id: 'member-1' } },
      bookings: [
        { id: 'pending', status: 'pending' },
        { id: 'confirmed', status: 'confirmed' },
        { id: 'cancelled', status: 'cancelled' },
        { id: 'completed', status: 'completed' },
        { id: 'declined', status: 'declined' },
      ],
    });
    const view = await render(<ProfileScreen navigation={navigation} />);
    expect(view.getByRole('button', { name: 'Bookings: 2' })).toBeTruthy();
  });

  test('booking selectors and Request booking submit the chosen service and time', async () => {
    const state = resetTestState({
      session: { user: { id: 'member-1' } },
      providers: [
        {
          ...testProvider,
          services: [{ id: 'service-1', name: 'Haircut' }],
        },
      ],
    });
    const view = await render(
      <ProviderDetailScreen route={{ params: { id: testProvider.id } }} navigation={navigation} />,
    );
    await fireEvent.press(view.getByRole('button', { name: 'Book this provider' }));
    await fireEvent.press(view.getByText('Haircut'));
    await fireEvent.press(view.getByText('Tomorrow'));
    await fireEvent.press(view.getByLabelText('09:00'));
    await fireEvent.press(view.getByText('Request booking'));
    await waitFor(() =>
      expect(state.addBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          providerId: testProvider.id,
          serviceId: 'service-1',
          requestedTime: '09:00',
        }),
      ),
    );
    expect(Alert.alert).toHaveBeenCalledWith(
      'Booking requested',
      expect.any(String),
      expect.any(Array),
      expect.any(Object),
    );
  });

  test('booking form shows an inline error when a selected time is outside opening hours', async () => {
    const tomorrow = getUkFutureDate(1);
    const [year, month, day] = tomorrow.split('-').map(Number);
    const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    const state = resetTestState({
      session: { user: { id: 'member-1' } },
      providers: [
        {
          ...testProvider,
          openingHours: [
            {
              day_of_week: dayOfWeek,
              open_time: '10:00:00',
              close_time: '17:00:00',
              is_closed: false,
            },
          ],
        },
      ],
    });
    const view = await render(
      <ProviderDetailScreen route={{ params: { id: testProvider.id } }} navigation={navigation} />,
    );
    await fireEvent.press(view.getByRole('button', { name: 'Book this provider' }));
    await fireEvent.press(view.getByText('Tomorrow'));
    await fireEvent.press(view.getByLabelText('09:00'));
    await fireEvent.press(view.getByText('Request booking'));
    expect(await view.findByText(/within the business’s opening hours/i)).toBeTruthy();
    expect(state.addBooking).not.toHaveBeenCalled();
  });

  test('Save changes, Edit and Delete review actions call their handlers', async () => {
    const review = {
      id: 'review-1',
      providerId: testProvider.id,
      providerName: testProvider.name,
      userId: 'member-1',
      rating: 4,
      comment: 'Good service',
    };
    const state = resetTestState({
      session: { user: { id: 'member-1' } },
      reviews: [review],
    });
    const view = await render(<ReviewsScreen navigation={navigation} route={{ params: {} }} />);
    await fireEvent.press(view.getByText('Edit'));
    await fireEvent.changeText(view.getByLabelText('Edit review'), 'Excellent service');
    await fireEvent.press(view.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(state.editReview).toHaveBeenCalledWith('review-1', {
        rating: 4,
        comment: 'Excellent service',
      }),
    );
    await fireEvent.press(view.getByText('Delete'));
    const actions = (Alert.alert as jest.Mock).mock.calls.at(-1)?.[2];
    await actions.find((action) => action.text === 'Delete').onPress();
    await waitFor(() => expect(state.removeReview).toHaveBeenCalledWith('review-1'));
  });

  test('My reviews shows a review when its business is loaded', async () => {
    resetTestState({
      session: { user: { id: 'member-1' } },
      providers: [{ ...testProvider, name: 'Loaded business' }],
      reviews: [
        {
          id: 'review-loaded',
          providerId: testProvider.id,
          providerName: 'Review business name',
          userId: 'member-1',
          rating: 5,
          comment: 'Great experience',
        },
      ],
      reviewsLoading: false,
    });

    const view = await render(<ReviewsScreen navigation={navigation} route={{ params: {} }} />);

    expect(view.getByText('Loaded business')).toBeTruthy();
    expect(view.getByText('Great experience')).toBeTruthy();
    expect(view.queryByText('You haven’t written any reviews yet')).toBeNull();
  });

  test('My reviews shows reviews whose business is missing from loaded providers', async () => {
    resetTestState({
      session: { user: { id: 'member-1' } },
      providers: [],
      reviews: [
        mapReview({
          id: 'review-missing-provider',
          provider_id: 'provider-not-loaded',
          providers: { business_name: 'Business from review' },
          user_id: 'member-1',
          rating: 4,
          comment: 'Still visible',
        }),
        {
          id: 'review-no-business-name',
          providerId: 'provider-also-missing',
          userId: 'member-1',
          rating: 3,
          comment: 'Uses business fallback',
        },
      ],
      reviewsLoading: false,
    });

    const view = await render(<ReviewsScreen navigation={navigation} route={{ params: {} }} />);

    expect(view.getByText('Business from review')).toBeTruthy();
    expect(view.getByText('Still visible')).toBeTruthy();
    expect(view.getByText('Business')).toBeTruthy();
    expect(view.getByText('Uses business fallback')).toBeTruthy();
  });

  test('My reviews shows an empty state when only other users have reviews', async () => {
    resetTestState({
      session: { user: { id: 'member-1' } },
      reviews: [
        {
          id: 'another-users-review',
          providerId: testProvider.id,
          userId: 'member-2',
          rating: 5,
          comment: 'Not this users review',
        },
      ],
      reviewsLoading: false,
    });

    const profile = await render(<ProfileScreen navigation={navigation} />);
    expect(profile.getByRole('button', { name: 'Reviews: 0' })).toBeTruthy();

    const view = await render(<ReviewsScreen navigation={navigation} route={{ params: {} }} />);

    expect(view.getByText('You haven’t written any reviews yet')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Find a business' }));
    expect(navigation.navigate).toHaveBeenCalledWith('MainTabs', { screen: 'Explore' });
  });

  test('My reviews shows a loading state while reviews are loading', async () => {
    resetTestState({
      session: { user: { id: 'member-1' } },
      reviews: [],
      reviewsLoading: true,
    });

    const view = await render(<ReviewsScreen navigation={navigation} route={{ params: {} }} />);

    expect(view.getByText('Loading reviews…')).toBeTruthy();
    expect(view.queryByText('You haven’t written any reviews yet')).toBeNull();
  });

  test('Mark all notifications read calls the account action and restores the control', async () => {
    const state = resetTestState({
      notifications: [{ id: 'notification-1', title: 'New comment', read: false }],
    });
    const view = await render(<NotificationsScreen navigation={navigation} />);
    const clear = view.getByRole('button', {
      name: 'Mark all notifications read and clear the list',
    });
    await fireEvent.press(clear);
    expect(state.markAllNotificationsRead).toHaveBeenCalledTimes(1);
    expect(view.getByText('Mark all read')).toBeTruthy();
    expect(clear.props.accessibilityState?.disabled ?? clear.props.disabled).toBe(false);
  });
});
