import { motion } from '../theme/motion';
import { notificationDestination } from '../lib/notificationDestination';
import { isSafeAppLink } from '../lib/authCallback';
import useReducedMotion from '../hooks/useMotionPreferences';
import { withScreenMotion } from '../components/Motion';
import React, { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Text from '../components/AppText';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { getNotificationsModule } from '../lib/notificationRuntime';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/HomeScreen';
import ExploreScreen from '../screens/ExploreScreen';
import SavedScreen from '../screens/SavedScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ProviderDetailScreen from '../screens/ProviderDetailScreen';
import CommunityScreen from '../screens/CommunityScreen';
import CommunityProfileScreen from '../screens/CommunityProfileScreen';
import OpeningScreen from '../screens/OpeningScreen';
import EmailConfirmationScreen from '../screens/EmailConfirmationScreen';
import { CategoriesScreen, CreatePostScreen } from '../screens/MarketplaceScreens';
import { EventsScreen, MapScreen, OffersScreen } from '../screens/DiscoveryScreens';
import {
  BecomeProviderScreen,
  BookingsScreen,
  EditProfileScreen,
  HelpScreen,
  LocationScreen,
  NotificationsScreen,
  QuoteRequestsScreen,
  ReviewsScreen,
  ResetPasswordScreen,
  SettingsScreen,
  WelcomeScreen,
} from '../screens/AccountScreens';
import ClaimListingScreen from '../screens/ClaimListingScreen';
import PrivacyScreen from '../screens/PrivacyScreen';
import { fonts } from '../theme/theme';
import { useChodhiQTheme } from '../context/ThemeContext';
import { useAppState } from '../context/AppStateContext';
import * as ExpoLinking from 'expo-linking';
import GlassTabBar from '../components/GlassTabBar';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const notificationNavigationRef = createNavigationContainerRef();
const AnimatedHomeScreen = withScreenMotion(HomeScreen);
const AnimatedExploreScreen = withScreenMotion(ExploreScreen);
const AnimatedMapScreen = withScreenMotion(MapScreen);
const AnimatedCommunityScreen = withScreenMotion(CommunityScreen);
const AnimatedSavedScreen = withScreenMotion(SavedScreen);
const AnimatedProfileScreen = withScreenMotion(ProfileScreen);

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={AnimatedHomeScreen} />
      <Tab.Screen name="Explore" component={AnimatedExploreScreen} options={{ title: 'Search' }} />
      <Tab.Screen name="MapTab" component={AnimatedMapScreen} options={{ title: 'Map' }} />
      <Tab.Screen
        name="CommunityTab"
        component={AnimatedCommunityScreen}
        options={{ title: 'Community' }}
      />
      <Tab.Screen name="Saved" component={AnimatedSavedScreen} />
      <Tab.Screen name="Profile" component={AnimatedProfileScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { palette, isDark } = useChodhiQTheme();
  const reducedMotion = useReducedMotion();
  const { session, authReady, hasCompletedOnboarding } = useAppState();
  const pendingPush = useRef(null);
  const handledPush = useRef(null);
  const openPendingPush = () => {
    if (!notificationNavigationRef.isReady() || !pendingPush.current || !session) return;
    const destination = pendingPush.current;
    pendingPush.current = null;
    const target = notificationDestination(destination, session.user.id);
    if (target) notificationNavigationRef.navigate(target.route, target.params);
  };
  useEffect(() => {
    const notifications = getNotificationsModule();
    if (!notifications) return undefined;
    let active = true;
    const receiveResponse = (response) => {
      if (!active || !response) return;
      const identifier = response.notification.request.identifier;
      if (handledPush.current === identifier) return;
      const data = response.notification.request.content.data;
      handledPush.current = identifier;
      pendingPush.current = data;
      openPendingPush();
    };
    const listener = notifications.addNotificationResponseReceivedListener(receiveResponse);
    notifications
      .getLastNotificationResponseAsync()
      .then(receiveResponse)
      .catch(() => {});
    openPendingPush();
    return () => {
      active = false;
      listener.remove();
    };
  }, [session?.user?.id, authReady]);
  const navigationTheme = useMemo(
    () => ({
      dark: isDark,
      colors: {
        primary: palette.primary,
        background: palette.background,
        card: palette.surface,
        text: palette.text,
        border: palette.border,
        notification: palette.coral,
      },
      fonts: {
        regular: { fontFamily: fonts.regular, fontWeight: '400' },
        medium: { fontFamily: fonts.medium, fontWeight: '500' },
        bold: { fontFamily: fonts.bold, fontWeight: '700' },
        heavy: { fontFamily: fonts.extraBold, fontWeight: '800' },
      },
    }),
    [palette, isDark],
  );
  if (!authReady)
    return (
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Loading ChodhiQ"
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          backgroundColor: palette.background,
        }}
      >
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={{ color: palette.text2, fontSize: 14 }}>Getting things ready…</Text>
      </View>
    );
  const initialRouteName = session || hasCompletedOnboarding ? 'MainTabs' : 'Opening';
  return (
    <NavigationContainer
      ref={notificationNavigationRef}
      onReady={openPendingPush}
      linking={{
        filter: isSafeAppLink,
        prefixes: ['chodhiq://', ExpoLinking.createURL('/')],
        config: { screens: { EmailConfirmation: 'auth/callback', ResetPassword: 'auth/reset' } },
      }}
      theme={navigationTheme}
    >
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{
          headerShown: false,
          animation: reducedMotion ? 'none' : 'fade',
          animationDuration: motion.navigation.duration,
          contentStyle: { backgroundColor: palette.background },
        }}
      >
        <Stack.Screen name="Opening" component={OpeningScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="ProviderDetail" component={ProviderDetailScreen} />
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="EmailConfirmation" component={EmailConfirmationScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        <Stack.Screen name="Location" component={LocationScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="QuoteRequests" component={QuoteRequestsScreen} />
        <Stack.Screen name="Bookings" component={BookingsScreen} />
        <Stack.Screen name="Reviews" component={ReviewsScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Privacy" component={PrivacyScreen} />
        <Stack.Screen name="Help" component={HelpScreen} />
        <Stack.Screen name="BecomeProvider" component={BecomeProviderScreen} />
        <Stack.Screen name="ClaimListing" component={ClaimListingScreen} />
        <Stack.Screen name="Categories" component={CategoriesScreen} />
        <Stack.Screen name="CreatePost" component={CreatePostScreen} />
        <Stack.Screen name="Community" component={CommunityScreen} />
        <Stack.Screen name="CommunityProfile" component={CommunityProfileScreen} />
        <Stack.Screen name="Offers" component={OffersScreen} />
        <Stack.Screen name="Events" component={EventsScreen} />
        <Stack.Screen name="Map" component={MapScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
