import React from 'react';
import { Platform } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import OpeningScreen from '../../src/screens/OpeningScreen';
import { ResetPasswordScreen, WelcomeScreen } from '../../src/screens/AccountScreens';
import GlowButton from '../../components/ui/GlowButton';
import {
  preparePasswordRecovery,
  requestPasswordReset,
  resendEmailConfirmation,
  updatePassword,
} from '../../src/lib/supabase';
import { openExternalUrl } from '../../src/lib/openExternalUrl';
import { resetTestState } from './helpers';
import { StyleSheet } from 'react-native';

jest.mock('../../src/config/legal', () => ({
  legalLinks: {
    terms: 'https://legal.example/terms',
    privacy: 'https://legal.example/privacy',
  },
  publishedLegalLinksReady: true,
}));
jest.mock('../../src/lib/openExternalUrl', () => ({
  openExternalUrl: jest.fn().mockResolvedValue(true),
}));

const navigation = globalThis.__CHODHIQ_TEST_NAVIGATION__;

describe('onboarding and authentication buttons', () => {
  beforeEach(() => resetTestState());

  test('Skip continues to the main tabs', async () => {
    const view = await render(<OpeningScreen navigation={navigation} />);
    await fireEvent.press(view.getAllByRole('button', { name: 'Skip' })[0]);
    expect(navigation.replace).toHaveBeenCalledWith('MainTabs');
  });

  test('Continue advances onboarding and Sign in opens the sign-in flow', async () => {
    const view = await render(<OpeningScreen navigation={navigation} />);
    await fireEvent.press(view.getAllByText('Continue')[0]);
    await fireEvent.press(view.getAllByRole('button', { name: 'Sign in' })[0]);
    expect(navigation.navigate).toHaveBeenCalledWith('Welcome', { initialMode: 'signin' });
  });

  test('Continue as guest enters the app without starting an authenticated session', async () => {
    const state = resetTestState();
    const view = await render(<OpeningScreen navigation={navigation} />);
    await fireEvent.press(view.getAllByText('Continue as guest')[0]);
    expect(navigation.replace).toHaveBeenCalledWith('MainTabs');
    expect(state.continueAsGuest).not.toHaveBeenCalled();
    expect(state.session).toBeNull();
  });

  test('Go back delegates to navigation', async () => {
    const view = await render(<WelcomeScreen navigation={navigation} route={{ params: {} }} />);
    await fireEvent.press(view.getByRole('button', { name: 'Go back' }));
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  test('Welcome renders without raw text outside Text components', async () => {
    const loggedErrors: string[] = [];
    const errorSpy = jest.spyOn(console, 'error').mockImplementation((...args) => {
      loggedErrors.push(args.map(String).join(' '));
    });

    try {
      await render(<WelcomeScreen navigation={navigation} route={{ params: {} }} />);
      expect(
        loggedErrors.some((message) =>
          message.includes('Text strings must be rendered within a <Text> component'),
        ),
      ).toBe(false);
    } finally {
      errorSpy.mockRestore();
    }
  });

  test('GlowButton wraps string children and icon slots in Text', async () => {
    const loggedErrors: string[] = [];
    const errorSpy = jest.spyOn(console, 'error').mockImplementation((...args) => {
      loggedErrors.push(args.map(String).join(' '));
    });

    try {
      const view = await render(
        <GlowButton label="Action" leftIcon="Left" rightIcon="Right">
          Child
        </GlowButton>,
      );
      expect(view.getByText('Left')).toBeTruthy();
      expect(view.getByText('Child')).toBeTruthy();
      expect(view.getByText('Right')).toBeTruthy();
      expect(
        loggedErrors.some((message) =>
          message.includes('Text strings must be rendered within a <Text> component'),
        ),
      ).toBe(false);
    } finally {
      errorSpy.mockRestore();
    }
  });

  test('disabled primary uses a dark theme-tinted fill and muted light text', async () => {
    const view = await render(<GlowButton variant="primary" label="Sign in" disabled />);
    const shell = StyleSheet.flatten(view.getByTestId('button-shell').props.style);
    expect(shell.backgroundColor).toMatch(/rgba\(32,199,103,0\.35\)/);
    expect(shell.borderColor).toMatch(/rgba\(32,199,103,0\.38\)/);
    expect(view.getByText('Sign in').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: '#F3F6F4' })]),
    );
    expect(shell.backgroundColor).not.toBe('#CED4D1');
  });

  test('enabled primary retains its emerald gradient', async () => {
    const view = await render(<GlowButton variant="primary" label="Sign in" />);
    expect(view.getByText('Sign in')).toBeTruthy();
    expect(view.getByTestId('button-gradient')).toBeTruthy();
    expect(view.getByText('Sign in').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: '#FFFFFF' })]),
    );
  });

  test('Sign in authenticates, finishes on success, and exposes failures', async () => {
    const state = resetTestState();
    const view = await render(<WelcomeScreen navigation={navigation} route={{ params: {} }} />);
    await fireEvent.changeText(view.getByLabelText('Email address'), 'person@example.com');
    await fireEvent.changeText(view.getByLabelText('Password'), 'password123');
    await fireEvent.press(view.getByText('Sign in', { exact: true }));
    await waitFor(() =>
      expect(state.authenticate).toHaveBeenCalledWith('email', {
        name: '',
        email: 'person@example.com',
        password: 'password123',
      }),
    );
    expect(navigation.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });

    state.authenticate.mockRejectedValueOnce(new Error('Invalid credentials'));
    await fireEvent.press(view.getByText('Sign in', { exact: true }));
    await waitFor(() => expect(view.getByText(/Invalid credentials/i)).toBeTruthy());
  });

  test('Create account stays disabled until required values and consent are provided', async () => {
    resetTestState();
    const view = await render(
      <WelcomeScreen navigation={navigation} route={{ params: { initialMode: 'signup' } }} />,
    );
    const submitButton = view.getAllByRole('button', { name: 'Create account' })[0];
    expect(submitButton.props.accessibilityState?.disabled ?? submitButton.props.disabled).toBe(
      true,
    );
    await fireEvent.changeText(view.getByLabelText('Full name'), 'Test Person');
    await fireEvent.changeText(view.getByLabelText('Email address'), 'person@example.com');
    await fireEvent.changeText(view.getByLabelText('Password'), 'newpassword123');
    await fireEvent.changeText(view.getByLabelText('Confirm password'), 'newpassword123');
    await fireEvent.press(view.getByRole('checkbox'));
    await waitFor(() => {
      const currentButton = view.getAllByRole('button', { name: 'Create account' })[0];
      expect(currentButton.props.accessibilityState?.disabled ?? currentButton.props.disabled).toBe(
        false,
      );
    });
  });

  test('Create account requests confirmation and Resend confirmation retries it', async () => {
    const state = resetTestState();
    state.authenticate.mockResolvedValueOnce(null);
    const view = await render(
      <WelcomeScreen navigation={navigation} route={{ params: { initialMode: 'signup' } }} />,
    );
    await fireEvent.changeText(view.getByLabelText('Full name'), 'Test Person');
    await fireEvent.changeText(view.getByLabelText('Email address'), 'person@example.com');
    await fireEvent.changeText(view.getByLabelText('Password'), 'newpassword123');
    await fireEvent.changeText(view.getByLabelText('Confirm password'), 'newpassword123');
    await fireEvent.press(view.getByRole('checkbox'));
    await fireEvent.press(view.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(view.getByText(/Signup was accepted/)).toBeTruthy());
    expect(state.authenticate).toHaveBeenCalledWith('signup', {
      name: 'Test Person',
      email: 'person@example.com',
      password: 'newpassword123',
    });

    await fireEvent.press(view.getByRole('button', { name: 'Resend confirmation email' }));
    await waitFor(() => expect(resendEmailConfirmation).toHaveBeenCalledWith('person@example.com'));
  });

  test('Read terms and privacy open their published destinations', async () => {
    const view = await render(
      <WelcomeScreen navigation={navigation} route={{ params: { initialMode: 'signup' } }} />,
    );
    await fireEvent.press(view.getByText('Read terms'));
    await fireEvent.press(view.getByText('Read privacy policy'));
    expect(openExternalUrl).toHaveBeenNthCalledWith(
      1,
      'https://legal.example/terms',
      expect.objectContaining({ title: 'Terms unavailable' }),
    );
    expect(openExternalUrl).toHaveBeenNthCalledWith(
      2,
      'https://legal.example/privacy',
      expect.objectContaining({ title: 'Privacy policy unavailable' }),
    );
  });

  test('Forgot password sends a reset request and reports success', async () => {
    resetTestState();
    const view = await render(<WelcomeScreen navigation={navigation} route={{ params: {} }} />);
    await fireEvent.changeText(view.getByLabelText('Email address'), 'person@example.com');
    await fireEvent.press(view.getByText('Forgot password?'));
    await waitFor(() => expect(requestPasswordReset).toHaveBeenCalledWith('person@example.com'));
    expect(await view.findByText(/Check your email/)).toBeTruthy();
  });

  test('Apple sign-in is available only on iOS', async () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    const ios = await render(<WelcomeScreen navigation={navigation} route={{ params: {} }} />);
    expect(ios.getByTestId('btn-continue-with-apple')).toBeTruthy();
    await ios.unmount();

    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    const android = await render(<WelcomeScreen navigation={navigation} route={{ params: {} }} />);
    expect(android.queryByTestId('btn-continue-with-apple')).toBeNull();
    await android.unmount();
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS });
  });

  test('Update password persists the new value and Go to sign in returns to Welcome', async () => {
    resetTestState();
    (preparePasswordRecovery as jest.Mock).mockResolvedValue(undefined);
    const view = await render(
      <ResetPasswordScreen navigation={navigation} route={{ params: { code: 'test-code' } }} />,
    );
    await waitFor(() => expect(view.getByLabelText('New password')).toBeTruthy());
    expect(preparePasswordRecovery).toHaveBeenCalledWith('test-code');
    await fireEvent.changeText(view.getByLabelText('New password'), 'updatedpassword123');
    await fireEvent.changeText(view.getByLabelText('Confirm new password'), 'updatedpassword123');
    await fireEvent.press(view.getByText('Update password'));
    await waitFor(() => expect(updatePassword).toHaveBeenCalledWith('updatedpassword123'));
    await fireEvent.press(view.getByText('Back to sign in'));
    expect(navigation.replace).toHaveBeenCalledWith('Welcome');
    await view.unmount();
  });
});
