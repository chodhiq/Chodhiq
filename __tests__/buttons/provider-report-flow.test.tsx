import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Keyboard } from 'react-native';
import ProviderDetailScreen from '../../src/screens/ProviderDetailScreen';
import { resetTestState, testProvider } from './helpers';

jest.mock('../../src/context/AppStateContext', () => ({
  useAppState: () => globalThis.__CHODHIQ_TEST_APP_STATE__,
}));
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { ScrollView, TextInput, View } = require('react-native');
  const BottomSheetModal = React.forwardRef(({ children }, _ref) =>
    React.createElement(View, null, children),
  );
  return {
    BottomSheetBackdrop: View,
    BottomSheetModal,
    BottomSheetScrollView: ScrollView,
    BottomSheetTextInput: TextInput,
  };
});
jest.mock('../../src/components/Motion', () => {
  const React = require('react');
  const { View } = require('react-native');
  const actual = jest.requireActual('../../src/components/Motion');
  return {
    ...actual,
    MotionModal: ({ visible, children }) =>
      visible ? React.createElement(View, null, children) : null,
  };
});
jest.mock('../../src/components/ProviderDetailComponents', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Placeholder = () => React.createElement(View);
  return {
    EmptyBlock: Placeholder,
    PhotoGallery: Placeholder,
    ProviderHero: Placeholder,
    ProviderIdentity: Placeholder,
    ProviderMapPreview: Placeholder,
    ProviderVerified: Placeholder,
    ReviewCard: Placeholder,
    ReviewSummary: Placeholder,
  };
});

describe('provider report sheet', () => {
  beforeEach(() => {
    resetTestState({
      session: { user: { id: 'report-user' } },
      providers: [testProvider],
      reportProvider: jest.fn().mockResolvedValue({ status: 'sent' }),
    });
  });

  test('can type, close, reopen, and submit without a stale keyboard update', async () => {
    const keyboardListeners = [];
    const addListener = jest
      .spyOn(Keyboard, 'addListener')
      .mockImplementation((event, listener) => {
        if (event === 'keyboardDidHide') keyboardListeners.push(listener);
        return { remove: jest.fn() };
      });
    const navigation = globalThis.__CHODHIQ_TEST_NAVIGATION__;
    const view = await render(
      <ProviderDetailScreen route={{ params: { id: testProvider.id } }} navigation={navigation} />,
    );

    expect(view.getByText('Report listing')).toBeTruthy();
    const reportButton = view.getByRole('button', { name: 'Report incorrect provider information' });
    expect(reportButton).toBeTruthy();

    await fireEvent.press(
      view.getByRole('button', { name: 'Report incorrect provider information' }),
    );
    const firstInput = view.getByTestId('input-provider-report-details');
    fireEvent.changeText(firstInput, 'Wrong phone number');
    fireEvent(firstInput, 'focus');
    await fireEvent.press(view.getByTestId('btn-close-report'));
    await act(() => keyboardListeners.forEach((listener) => listener()));

    await fireEvent.press(
      view.getByRole('button', { name: 'Report incorrect provider information' }),
    );
    await waitFor(() => view.getByTestId('input-provider-report-details'));
    fireEvent.changeText(view.getByTestId('input-provider-report-details'), 'Wrong phone number');
    await fireEvent.press(view.getByTestId('btn-submit-provider-report'));

    await waitFor(() => {
      expect(globalThis.__CHODHIQ_TEST_APP_STATE__.reportProvider).toHaveBeenCalledWith(
        testProvider.id,
        'incorrect_information',
        'Wrong phone number',
      );
    });

    addListener.mockRestore();
    view.unmount();
  });
});
