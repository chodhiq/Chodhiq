import { motion } from '../theme/motion';
import { notificationDestination } from '../lib/notificationDestination';
import { isSafeAppLink } from '../lib/authCallback';
import useEffectsLevel from '../hooks/useEffectsLevel';
import { withScreenMotion } from '../components/Motion';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator, View } from 'react-native';
import Text from '../components/AppText';
import {
  NavigationContainer,
  createNavigationContainerRef,
  useIsFocused,
} from '@react-navigation/native';
import { getNotificationsModule } from '../lib/notificationRuntime';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/HomeScreen';
import CommunityScreen from '../screens/CommunityScreen';
import CommunityFeedScreen from '../../screens/CommunityFeedScreen';
import DevUIGallery from '../../screens/DevUIGallery';
import ExploreScreen from '../screens/ExploreScreen';
import SavedScreen from '../screens/SavedScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ProviderDetailScreen from '../screens/ProviderDetailScreen';
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
import { BlurTargetView } from 'expo-blur';
import { setActiveScreenName } from '../lib/activeScreen';
import PendingWriteAlerts from '../components/PendingWriteAlerts';
import ProfileScreenErrorBoundary from '../components/ProfileScreenErrorBoundary';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const notificationNavigationRef = createNavigationContainerRef();
const AnimatedHomeScreen = withScreenMotion(HomeScreen, 'default');
const AnimatedExploreScreen = withScreenMotion(ExploreScreen, 'default');
const AnimatedMapScreen = withScreenMotion(MapScreen, 'default');
const AnimatedCommunityScreen = withScreenMotion(CommunityScreen, 'default');
const AnimatedCommunityFeedScreen = withScreenMotion(CommunityFeedScreen, 'default');
const AnimatedSavedScreen = withScreenMotion(SavedScreen, 'default');
const AnimatedProfileScreen = withScreenMotion(ProfileScreen, 'subtle');
function ProfileTabScreen(props) {
  return (
    <ProfileScreenErrorBoundary navigation={props.navigation}>
      <AnimatedProfileScreen {...props} />
    </ProfileScreenErrorBoundary>
  );
}
const AnimatedOpeningScreen = withScreenMotion(OpeningScreen, 'intense');
const AnimatedProviderDetailScreen = withScreenMotion(ProviderDetailScreen, 'default');
const AnimatedWelcomeScreen = withScreenMotion(WelcomeScreen, 'intense');
const AnimatedEmailConfirmationScreen = withScreenMotion(EmailConfirmationScreen, 'intense');
const AnimatedResetPasswordScreen = withScreenMotion(ResetPasswordScreen, 'intense');
const AnimatedLocationScreen = withScreenMotion(LocationScreen, 'subtle');
const AnimatedNotificationsScreen = withScreenMotion(NotificationsScreen, 'subtle');
const AnimatedQuoteRequestsScreen = withScreenMotion(QuoteRequestsScreen, 'default');
const AnimatedBookingsScreen = withScreenMotion(BookingsScreen, 'default');
const AnimatedReviewsScreen = withScreenMotion(ReviewsScreen, 'default');
const AnimatedEditProfileScreen = withScreenMotion(EditProfileScreen, 'subtle');
const AnimatedSettingsScreen = withScreenMotion(SettingsScreen, 'subtle');
const AnimatedPrivacyScreen = withScreenMotion(PrivacyScreen, 'subtle');
const AnimatedHelpScreen = withScreenMotion(HelpScreen, 'subtle');
const AnimatedBecomeProviderScreen = withScreenMotion(BecomeProviderScreen, 'subtle');
const AnimatedClaimListingScreen = withScreenMotion(ClaimListingScreen, 'subtle');
const AnimatedCategoriesScreen = withScreenMotion(CategoriesScreen, 'default');
const AnimatedCreatePostScreen = withScreenMotion(CreatePostScreen, 'subtle');
const AnimatedCommunityProfileScreen = withScreenMotion(CommunityProfileScreen, 'subtle');
const AnimatedOffersScreen = withScreenMotion(OffersScreen, 'default');
const AnimatedEventsScreen = withScreenMotion(EventsScreen, 'default');
const AnimatedStandaloneMapScreen = withScreenMotion(MapScreen, 'default');

const TabBlurTargetRegistry = createContext(null);

function createTabBlurTargetScreen(ScreenComponent, routeName) {
  function TabScreenWithBlurTarget(props) {
    const registerTarget = useContext(TabBlurTargetRegistry);
    const focused = useIsFocused();
    const targetRef = useRef(null);

    useEffect(() => {
      if (focused && targetRef.current) registerTarget?.(routeName, targetRef.current);
    }, [focused, registerTarget]);

    return (
      <BlurTargetView ref={targetRef} style={{ flex: 1 }}>
        <ScreenComponent {...props} />
      </BlurTargetView>
    );
  }

  TabScreenWithBlurTarget.displayName = `BlurTarget(${ScreenComponent.displayName || ScreenComponent.name})`;
  return TabScreenWithBlurTarget;
}

const TargetedHomeScreen = createTabBlurTargetScreen(AnimatedHomeScreen, 'Home');
const TargetedExploreScreen = createTabBlurTargetScreen(AnimatedExploreScreen, 'Explore');
const TargetedMapScreen = createTabBlurTargetScreen(AnimatedMapScreen, 'MapTab');
const TargetedCommunityScreen = createTabBlurTargetScreen(
  AnimatedCommunityFeedScreen,
  'CommunityTab',
);
const TargetedSavedScreen = createTabBlurTargetScreen(AnimatedSavedScreen, 'Saved');
const TargetedProfileScreen = createTabBlurTargetScreen(ProfileTabScreen, 'Profile');

function MainTabs() {
  const [blurTargets, setBlurTargets] = useState({});
  const registerBlurTarget = useCallback((routeName, target) => {
    if (!target) return;
    setBlurTargets((current) =>
      current[routeName] === target ? current : { ...current, [routeName]: target },
    );
  }, []);

  return (
    <TabBlurTargetRegistry.Provider value={registerBlurTarget}>
      <Tab.Navigator
        tabBar={(props) => {
          const activeRoute = props.state.routes[props.state.index]?.name;
          const activeTarget = blurTargets[activeRoute];
          return (
            <GlassTabBar
              {...props}
              blurTarget={activeTarget ? { current: activeTarget } : undefined}
            />
          );
        }}
        sceneContainerStyle={{ flex: 1, backgroundColor: 'transparent' }}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tab.Screen name="Home" component={TargetedHomeScreen} />
        <Tab.Screen
          name="Explore"
          component={TargetedExploreScreen}
          options={{ title: 'Search' }}
        />
        <Tab.Screen name="MapTab" component={TargetedMapScreen} options={{ title: 'Map' }} />
        <Tab.Screen
          name="CommunityTab"
          component={TargetedCommunityScreen}
          options={{ title: 'Community' }}
        />
        <Tab.Screen name="Saved" component={TargetedSavedScreen} />
        <Tab.Screen name="Profile" component={TargetedProfileScreen} />
      </Tab.Navigator>
    </TabBlurTargetRegistry.Provider>
  );
}

export default function RootNavigator() {
  const { palette, isDark } = useChodhiQTheme();
  const reducedMotion = useEffectsLevel() !== 'full';
  const {
    session,
    authReady,
    hasCompletedOnboarding,
    syncStatus,
    authWritePrompt,
    clearAuthWritePrompt,
    retryFailedOperation,
    discardFailedOperation,
  } = useAppState();
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
        background: 'transparent',
        card: 'transparent',
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
          backgroundColor: 'transparent',
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
      onReady={() => {
        setActiveScreenName(notificationNavigationRef.getCurrentRoute()?.name);
        openPendingPush();
      }}
      onStateChange={() => setActiveScreenName(notificationNavigationRef.getCurrentRoute()?.name)}
      linking={{
        filter: isSafeAppLink,
        prefixes: ['chodhiq://', ExpoLinking.createURL('/')],
        config: { screens: { EmailConfirmation: 'auth/callback', ResetPassword: 'auth/reset' } },
      }}
      theme={navigationTheme}
    >
      <PendingWriteAlerts
        failedOperations={syncStatus?.failedOperations || []}
        authRequiredOperations={syncStatus?.authRequiredOperations || []}
        authWritePrompt={authWritePrompt}
        onRetry={retryFailedOperation}
        onDiscard={discardFailedOperation}
        onSignIn={() => notificationNavigationRef.navigate('Welcome')}
        onClearAuthPrompt={clearAuthWritePrompt}
      />
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{
          headerShown: false,
          animation: reducedMotion ? 'none' : 'fade',
          animationDuration: motion.navigation.duration,
          contentStyle: { backgroundColor: 'transparent' },
        }}
      >
        <Stack.Screen name="Opening" component={AnimatedOpeningScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="ProviderDetail" component={AnimatedProviderDetailScreen} />
        <Stack.Screen name="Welcome" component={AnimatedWelcomeScreen} />
        <Stack.Screen name="EmailConfirmation" component={AnimatedEmailConfirmationScreen} />
        <Stack.Screen name="ResetPassword" component={AnimatedResetPasswordScreen} />
        <Stack.Screen name="Location" component={AnimatedLocationScreen} />
        <Stack.Screen name="Notifications" component={AnimatedNotificationsScreen} />
        <Stack.Screen name="QuoteRequests" component={AnimatedQuoteRequestsScreen} />
        <Stack.Screen name="Bookings" component={AnimatedBookingsScreen} />
        <Stack.Screen name="Reviews" component={AnimatedReviewsScreen} />
        <Stack.Screen name="EditProfile" component={AnimatedEditProfileScreen} />
        <Stack.Screen name="Settings" component={AnimatedSettingsScreen} />
        <Stack.Screen name="Privacy" component={AnimatedPrivacyScreen} />
        <Stack.Screen name="Help" component={AnimatedHelpScreen} />
        <Stack.Screen name="BecomeProvider" component={AnimatedBecomeProviderScreen} />
        <Stack.Screen name="ClaimListing" component={AnimatedClaimListingScreen} />
        <Stack.Screen name="Categories" component={AnimatedCategoriesScreen} />
        <Stack.Screen name="CreatePost" component={AnimatedCreatePostScreen} />
        <Stack.Screen name="Community" component={AnimatedCommunityScreen} />
        <Stack.Screen name="CommunityProfile" component={AnimatedCommunityProfileScreen} />
        <Stack.Screen name="Offers" component={AnimatedOffersScreen} />
        <Stack.Screen name="Events" component={AnimatedEventsScreen} />
        <Stack.Screen name="Map" component={AnimatedStandaloneMapScreen} />
        {__DEV__ ? <Stack.Screen name="DevUIGallery" component={DevUIGallery} /> : null}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
