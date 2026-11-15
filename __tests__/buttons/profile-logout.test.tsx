import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import RootNavigator from '../../src/navigation/RootNavigator';
import { resetTestState } from './helpers';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

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

function StatefulRootNavigator() {
  const [session, setSession] = React.useState(
    globalThis.__CHODHIQ_TEST_APP_STATE__.session,
  );
  const state = globalThis.__CHODHIQ_TEST_APP_STATE__;
  const signOut = React.useRef(null);
  if (!signOut.current)
    signOut.current = jest.fn(async () => {
      await act(async () => {
        setSession(null);
        state.profile = { name: 'Guest', email: '', avatarUri: null };
      });
    });
  state.session = session;
  state.signOut = signOut.current;
  return <RootNavigator />;
}

describe('Profile tab logout', () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    const calls = consoleError.mock.calls;
    consoleError.mockRestore();
    expect(calls).toEqual([]);
  });

  async function renderProfileWithSignOut(signOut: jest.Mock) {
    resetTestState({
      authReady: true,
      hasCompletedOnboarding: true,
      session: { user: { id: 'test-user', email: 'test@example.invalid' } },
      profile: { name: 'Test User', email: 'test@example.invalid', avatarUri: null },
      signOut,
    });
    const view = await render(<RootNavigator />);
    await fireEvent.press(view.getByTestId('tab-profile'));
    await waitFor(() => expect(view.getByTestId('btn-open-logout')).toBeTruthy());
    await fireEvent.press(view.getByTestId('btn-open-logout'));
    return view;
  }

  async function renderProfileWithSessionClearingSignOut() {
    resetTestState({
      authReady: true,
      hasCompletedOnboarding: true,
      session: { user: { id: 'test-user', email: 'test@example.invalid' } },
      profile: { name: 'Test User', email: 'test@example.invalid', avatarUri: null },
    });
    const view = await render(<StatefulRootNavigator />);
    await fireEvent.press(view.getByTestId('tab-profile'));
    await waitFor(() => expect(view.getByTestId('btn-open-logout')).toBeTruthy());
    await fireEvent.press(view.getByTestId('btn-open-logout'));
    return view;
  }

  test('keeps the navigator usable when signOut cleanup rejects', async () => {
    const signOut = jest.fn().mockRejectedValue(new Error('Sign-out failed'));
    const view = await renderProfileWithSignOut(signOut);

    await fireEvent.press(view.getByTestId('btn-confirm-logout'));

    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    expect(view.getByText('Welcome back')).toBeTruthy();
    expect(view.queryByText('Oops, something went wrong!')).toBeNull();
    view.unmount();
  });

  test('navigates to the registered Welcome route after a resolved signOut', async () => {
    const signOut = jest.fn().mockResolvedValue(undefined);
    const view = await renderProfileWithSignOut(signOut);

    await fireEvent.press(view.getByTestId('btn-confirm-logout'));

    await waitFor(() => expect(view.getByText('Welcome back')).toBeTruthy());
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    expect(view.queryByText('Oops, something went wrong!')).toBeNull();
    view.unmount();
  });

  test('resets the real navigator before clearing session and unmounts without errors', async () => {
    const view = await renderProfileWithSessionClearingSignOut();

    await fireEvent.press(view.getByTestId('btn-confirm-logout'));

    await waitFor(() => expect(view.getByText('Welcome back')).toBeTruthy());
    await waitFor(() =>
      expect(globalThis.__CHODHIQ_TEST_APP_STATE__.session).toBeNull(),
    );
    expect(globalThis.__CHODHIQ_TEST_APP_STATE__.signOut).toHaveBeenCalledTimes(1);
    expect(view.queryByTestId('glass-tabbar-container')).toBeNull();
    expect(view.queryByText('Oops, something went wrong!')).toBeNull();
    view.unmount();
  });
});
