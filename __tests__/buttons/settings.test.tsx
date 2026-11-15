import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { HelpScreen, SettingsScreen } from '../../src/screens/AccountScreens';
import { openPermissionSettings } from '../../src/lib/permissionRecovery';
import { openExternalUrl } from '../../src/lib/openExternalUrl';
import ProfileScreen from '../../src/screens/ProfileScreen';
import { setVisualEffectsLevel } from '../../src/hooks/useMotionPreferences';
import { resetTestState } from './helpers';

jest.mock('../../src/lib/permissionRecovery', () => ({
  openPermissionSettings: jest.fn(),
  showPermissionRecovery: jest.fn(),
}));
jest.mock('../../src/lib/openExternalUrl', () => ({
  openExternalUrl: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../src/hooks/useMotionPreferences', () => {
  const actual = jest.requireActual('../../src/hooks/useMotionPreferences');
  return { ...actual, setVisualEffectsLevel: jest.fn().mockResolvedValue(undefined) };
});

const navigation = globalThis.__CHODHIQ_TEST_NAVIGATION__;

describe('settings and support buttons', () => {
  beforeEach(() => resetTestState());

  test.each(['Push notifications', 'Notification vibration', 'Email updates', 'Tips and offers'])(
    '%s switch saves the changed preference',
    async (label) => {
      const state = resetTestState({ preferences: { push: true } });
      const view = await render(<SettingsScreen navigation={navigation} />);
      await fireEvent(view.getByRole('switch', { name: label }), 'valueChange', true);
      expect(state.setPreferences).toHaveBeenCalledWith(expect.any(Function));
      const updater = state.setPreferences.mock.calls[0][0];
      expect(updater({})).toEqual({
        [label === 'Push notifications'
          ? 'push'
          : label === 'Notification vibration'
            ? 'vibration'
            : label === 'Email updates'
              ? 'email'
              : 'marketing']: true,
      });
    },
  );

  test('permission recovery opens the device notification settings', async () => {
    const state = resetTestState({
      permissionDenied: true,
      preferences: { push: true },
    });
    const view = await render(<SettingsScreen navigation={navigation} />);
    await fireEvent.press(view.getByRole('button', { name: 'Open device notification settings' }));
    await waitFor(() => expect(openPermissionSettings).toHaveBeenCalledTimes(1));
    expect(state.permissionDenied).toBe(true);
  });

  test('Help & support navigates to help; Contact support launches the mail client', async () => {
    const settings = await render(<SettingsScreen navigation={navigation} />);
    await fireEvent.press(settings.getByText('Help & support'));
    expect(navigation.navigate).toHaveBeenCalledWith('Help');

    const help = await render(<HelpScreen navigation={navigation} />);
    await fireEvent.press(help.getByText('Contact support'));
    await waitFor(() =>
      expect(openExternalUrl).toHaveBeenCalledWith(
        expect.stringMatching(/^mailto:/),
        expect.any(Object),
      ),
    );
  });

  test('Log out confirmation supports both cancel and confirm', async () => {
    const state = resetTestState({
      session: { user: { id: 'member-1' } },
      profile: { name: 'Test Person', email: 'person@example.com', avatarUri: null },
    });
    const view = await render(<ProfileScreen navigation={navigation} />);
    await fireEvent.press(view.getAllByText('Log out')[0]);
    expect(view.getByText('Log out of ChodhiQ?')).toBeTruthy();
    await fireEvent.press(view.getByText('Stay signed in'));
    expect(state.signOut).not.toHaveBeenCalled();

    await fireEvent.press(view.getAllByText('Log out')[0]);
    await fireEvent.press(view.getAllByText('Log out').at(-1));
    await waitFor(() => expect(state.signOut).toHaveBeenCalledTimes(1));
    expect(navigation.navigate).toHaveBeenCalledWith('Welcome');
  });

  test('Profile handles a missing bookings collection after returning from bookings', async () => {
    resetTestState({
      session: { user: { id: 'member-1' } },
      profile: { name: 'Test Person', email: 'person@example.com', avatarUri: null },
      bookings: null,
    });

    const view = await render(<ProfileScreen navigation={navigation} />);

    expect(view.getByRole('button', { name: 'Bookings: 0' })).toBeTruthy();
  });
});

  test('Visual effects stores the selected level', async () => {
    const view = await render(<SettingsScreen navigation={navigation} />);
    await fireEvent.press(view.getByTestId('btn-effects-level-off'));
    expect(setVisualEffectsLevel).toHaveBeenCalledWith('off');
  });
