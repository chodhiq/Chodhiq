import { motion } from '../theme/motion';
import { notificationDestination } from '../lib/notificationDestination';
import { isSafeAppLink } from '../lib/authCallback';
import useReducedMotion from '../hooks/useMotionPreferences';
import { withScreenMotion } from '../components/Motion';
import React, { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, View, useWindowDimensions } from 'react-native';
import Text from '../components/AppText';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { getNotificationsModule } from '../lib/notificationRuntime';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, Search, Heart, Map, User, Users } from 'lucide-react-native';

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
import { colors, fonts, radius, shadows } from '../theme/theme';
import { useChodhiQTheme } from '../context/ThemeContext';
import { useAppState } from '../context/AppStateContext';
import * as ExpoLinking from 'expo-linking';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const { palette } = useChodhiQTheme();
  const insets = useSafeAreaInsets();
  const bottomSpace = Math.max(insets.bottom, 10);
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.muted,
        tabBarStyle: {
          backgroundColor: palette.nav,
          borderTopWidth: 1,
          borderTopColor: palette.border,
          paddingTop: 6,
          paddingBottom: bottomSpace,
          height: 56 + bottomSpace,
          ...shadows.soft,
        },
        tabBarItemStyle: { height: 50, flex: 1, minWidth: 0, paddingHorizontal: 0 },
        tabBarIconStyle: { marginTop: 0 },
        tabBarLabelStyle: {
          fontSize: 9,
          lineHeight: 11,
          fontFamily: fonts.semibold,
          marginBottom: 1,
          letterSpacing: -0.25,
          textAlign: 'center',
          includeFontPadding: false,
          flexShrink: 1,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={AnimatedHomeScreen}
        options={{
          tabBarLabel: (props) => <TabLabel title="Home" {...props} />,
          tabBarIcon: (props) => <TabIcon Icon={Home} {...props} />,
        }}
      />
      <Tab.Screen
        name="Explore"
        component={AnimatedExploreScreen}
        options={{
          title: 'Search',
          tabBarLabel: (props) => <TabLabel title="Search" {...props} />,
          tabBarIcon: (props) => <TabIcon Icon={Search} {...props} />,
        }}
      />
      <Tab.Screen
        name="MapTab"
        component={AnimatedMapScreen}
        options={{
          title: 'Map',
          tabBarLabel: (props) => <TabLabel title="Map" {...props} />,
          tabBarIcon: (props) => <TabIcon Icon={Map} {...props} />,
        }}
      />
      <Tab.Screen
        name="CommunityTab"
        component={AnimatedCommunityScreen}
        options={{
          title: 'Community',
          tabBarLabel: (props) => <TabLabel title="Community" {...props} />,
          tabBarIcon: (props) => <TabIcon Icon={Users} {...props} />,
        }}
      />
      <Tab.Screen
        name="Saved"
        component={AnimatedSavedScreen}
        options={{
          tabBarLabel: (props) => <TabLabel title="Saved" {...props} />,
          tabBarIcon: (props) => <TabIcon Icon={Heart} {...props} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={AnimatedProfileScreen}
        options={{
          tabBarLabel: (props) => <TabLabel title="Profile" {...props} />,
          tabBarIcon: (props) => <TabIcon Icon={User} {...props} />,
        }}
      />
    </Tab.Navigator>
  );
}

function TabLabel({ title, color }) {
  const { width } = useWindowDimensions();
  return (
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.68}
      style={{
        color,
        width: '100%',
        textAlign: 'center',
        fontSize: width < 390 ? 8 : 9,
        lineHeight: 11,
        fontFamily: fonts.semibold,
        letterSpacing: -0.25,
        includeFontPadding: false,
      }}
    >
      {title}
    </Text>
  );
}

function TabIcon({ Icon, color, size, focused }) {
  const reducedMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const lift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reducedMotion) {
      scale.setValue(1);
      lift.setValue(0);
      return undefined;
    }
    const animation = Animated.parallel([
      Animated.timing(scale, {
        toValue: focused ? motion.tab.scale : 1,
        duration: motion.tab.duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(lift, {
        toValue: focused ? -2 : 0,
        duration: motion.tab.duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [focused, lift, scale, reducedMotion]);
  return (
    <Animated.View
      style={{
        width: 42,
        height: 30,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        borderWidth: 0,
        transform: [{ scale }, { translateY: lift }],
      }}
    >
      <Icon color={color} size={focused ? 21 : size} strokeWidth={focused ? 2.7 : 2} />
    </Animated.View>
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
