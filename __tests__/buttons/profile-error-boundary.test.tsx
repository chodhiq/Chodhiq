import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import Text from '../../src/components/AppText';
import ProfileScreenErrorBoundary from '../../src/components/ProfileScreenErrorBoundary';
import * as sentryUtils from '../../src/lib/sentryUtils';
import { resetTestState } from './helpers';

describe('Profile screen error boundary', () => {
  let originalDiagnostics: string | undefined;

  beforeEach(() => {
    originalDiagnostics = process.env.EXPO_PUBLIC_DIAGNOSTICS;
    process.env.EXPO_PUBLIC_DIAGNOSTICS = 'true';
    resetTestState();
  });

  afterEach(() => {
    if (originalDiagnostics === undefined) delete process.env.EXPO_PUBLIC_DIAGNOSTICS;
    else process.env.EXPO_PUBLIC_DIAGNOSTICS = originalDiagnostics;
  });

  test('keeps recovery actions in Profile and can navigate Home', async () => {
    const navigation = globalThis.__CHODHIQ_TEST_NAVIGATION__;
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const captureError = jest.spyOn(sentryUtils, 'captureError');
    let shouldThrow = true;
    const BrokenProfile = () => {
      if (shouldThrow) throw new Error('Profile render failed');
      return <Text>Profile restored</Text>;
    };

    const view = await render(
      <ProfileScreenErrorBoundary navigation={navigation}>
        <BrokenProfile />
      </ProfileScreenErrorBoundary>,
    );

    expect(view.getByText('Profile couldn’t load')).toBeTruthy();
    expect(view.getByTestId('error-diagnostics').props.children).toContain(
      'Message: Profile render failed',
    );
    expect(view.getByRole('button', { name: 'Try again' })).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Go to Home' }));
    expect(navigation.navigate).toHaveBeenCalledWith('Home');
    shouldThrow = false;
    await fireEvent.press(view.getByRole('button', { name: 'Try again' }));
    expect(view.getByText('Profile restored')).toBeTruthy();
    expect(consoleError).toHaveBeenCalledWith(
      '[Profile screen error]',
      expect.objectContaining({ message: 'Profile render failed' }),
      expect.any(String),
    );
    expect(captureError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Profile render failed' }),
      expect.objectContaining({
        operation: 'profile_screen_render',
        componentStack: expect.any(String),
      }),
    );
    captureError.mockRestore();
    consoleError.mockRestore();
  });
});
