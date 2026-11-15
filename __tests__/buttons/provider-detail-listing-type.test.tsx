import React from 'react';
import { render } from '@testing-library/react-native';
import ProviderDetailScreen from '../../src/screens/ProviderDetailScreen';
import { resetTestState, testProvider } from './helpers';

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
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { ScrollView, TextInput, View } = require('react-native');
  const BottomSheetModal = ({ children }) =>
    React.createElement(View, { testID: 'quote-sheet-component' }, children);
  return {
    BottomSheetBackdrop: View,
    BottomSheetModal,
    BottomSheetScrollView: ScrollView,
    BottomSheetTextInput: TextInput,
  };
});

const navigation = globalThis.__CHODHIQ_TEST_NAVIGATION__;

describe('ProviderDetailScreen listing type actions', () => {
  beforeEach(() => resetTestState());

  test('hides quote and booking actions for places and keeps report available', async () => {
    resetTestState({ providers: [{ ...testProvider, listingType: 'place' }] });
    const placeView = await render(
      <ProviderDetailScreen
        route={{ params: { id: testProvider.id } }}
        navigation={navigation}
      />,
    );

    expect(() => placeView.getByTestId('btn-book-provider')).toThrow();
    expect(() => placeView.getByTestId('btn-request-quote')).toThrow();
    expect(() => placeView.getByTestId('btn-close-booking')).toThrow();
    expect(() => placeView.getByTestId('btn-request-booking')).toThrow();
    expect(() => placeView.getByTestId('quote-sheet-component')).toThrow();
    expect(() => placeView.getByTestId('provider-sticky-action-bar')).toThrow();
    expect(
      placeView.getByRole('button', { name: 'Report incorrect provider information' }),
    ).toBeTruthy();
    await placeView.unmount();

    const state = resetTestState({ providers: [{ ...testProvider, listingType: 'provider' }] });
    const providerView = await render(
      <ProviderDetailScreen
        route={{ params: { id: testProvider.id } }}
        navigation={navigation}
      />,
    );
    expect(providerView.getByTestId('provider-sticky-action-bar')).toBeTruthy();
    expect(providerView.getByTestId('btn-book-provider')).toBeTruthy();
    expect(providerView.getByTestId('btn-request-quote')).toBeTruthy();
    expect(providerView.getByTestId('quote-sheet-component')).toBeTruthy();

    state.providers = [{ ...testProvider }];
    await providerView.rerender(
      <ProviderDetailScreen
        route={{ params: { id: testProvider.id } }}
        navigation={navigation}
      />,
    );
    expect(providerView.getByTestId('provider-sticky-action-bar')).toBeTruthy();
    expect(providerView.getByTestId('btn-book-provider')).toBeTruthy();
    expect(providerView.getByTestId('btn-request-quote')).toBeTruthy();
    await providerView.unmount();
  });
});
