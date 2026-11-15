import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import OpeningScreen from '../../src/screens/OpeningScreen';
import {
  HelpScreen,
  NotificationsScreen,
  SettingsScreen,
  WelcomeScreen,
} from '../../src/screens/AccountScreens';
import ClaimListingScreen from '../../src/screens/ClaimListingScreen';
import CommunityFeedScreen from '../../screens/CommunityFeedScreen';
import CommunityScreen from '../../src/screens/CommunityScreen';
import { HomeHeader } from '../../src/components/HomeComponents';
import { ExploreHeader } from '../../src/components/ExploreComponents';
import PrivacyScreen from '../../src/screens/PrivacyScreen';
import ProfileScreen from '../../src/screens/ProfileScreen';
import { resetTestState } from './helpers';

const navigation = globalThis.__CHODHIQ_TEST_NAVIGATION__;
const palette = globalThis.__CHODHIQ_TEST_PALETTE__;

describe('no dead buttons in registered screen groups', () => {
  beforeEach(() => resetTestState());

  test.each([
    ['onboarding', () => <OpeningScreen navigation={navigation} />],
    ['authentication', () => <WelcomeScreen navigation={navigation} route={{ params: {} }} />],
    ['home controls', () => <HomeHeader palette={palette} location="Birmingham" />],
    ['discovery header', () => <ExploreHeader palette={palette} onBack={jest.fn()} />],
    ['community feed', () => <CommunityFeedScreen navigation={navigation} />],
    [
      'registered community',
      () => <CommunityScreen navigation={navigation} route={{ params: {} }} />,
    ],
    ['notifications', () => <NotificationsScreen navigation={navigation} />],
    ['settings', () => <SettingsScreen navigation={navigation} />],
    ['help', () => <HelpScreen navigation={navigation} />],
    ['claim listing', () => <ClaimListingScreen navigation={navigation} />],
    ['privacy', () => <PrivacyScreen navigation={navigation} />],
    ['profile', () => <ProfileScreen navigation={navigation} />],
  ])(
    '%s has handlers on all rendered interactive controls',
    async (_screenName, makeScreen) => {
      const view = await render(makeScreen());
      const buttons = view.queryAllByRole('button');
      for (const button of buttons) {
        expect(
          typeof (button.props.onPress ?? button.props.onClick ?? button.props.onResponderRelease),
        ).toBe('function');
        if (button.props.accessibilityState?.disabled ?? button.props.disabled) {
          await fireEvent.press(button);
        }
      }
      await view.unmount();
    },
  );
});
