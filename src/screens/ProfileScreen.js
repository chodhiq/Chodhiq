import { MotionScrollView as ScrollView } from '../components/Motion';
import { MotionTouchable as TouchableOpacity } from '../components/Motion';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Image, Platform, StyleSheet, Switch, View } from 'react-native';
import Text from '../components/AppText';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import * as ImagePicker from 'expo-image-picker';
import { AppAlert as Alert } from '../components/AppDialog';
import {
  BadgeCheck,
  Building2,
  ChevronRight,
  ChevronDown,
  LogIn,
  LogOut,
  Pencil,
  ShieldCheck,
  Sparkles,
} from 'lucide-react-native';
import { colors, radius, shadows, spacing, typography } from '../theme/theme';
import { motion } from '../theme/motion';
import { useAppState } from '../context/AppStateContext';
import { useChodhiQTheme } from '../context/ThemeContext';
import { FadeInView, PressableScale } from '../components/Motion';
import GlassView from '../components/GlassView';
import { accountMenu } from './AccountScreens';
import AsyncGlowButton from '../../components/ui/AsyncGlowButton';
import GlowButton from '../../components/ui/GlowButton';
import { GlowProfileCard } from '../../components/ui/GlowSurfaces';
import { openPermissionSettings, showPermissionRecovery } from '../lib/permissionRecovery';
import { getTabBarContentPadding } from '../navigation/tabBarLayout';

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const {
    profile,
    saveProfile,
    signOut,
    savedIds,
    reviews,
    quoteRequests,
    bookings,
    session,
    access,
    preferences,
    preferencesError,
    preferencesSyncing,
    permissionDenied,
    retryPreferencesSync,
    setPreferences,
  } = useAppState();
  const { palette } = useChodhiQTheme();
  const logoutSheetRef = useRef(null);
  const [expandedSection, setExpandedSection] = useState(null);
  const safeProfile = profile && typeof profile === 'object' ? profile : {};
  const safeBookings = Array.isArray(bookings) ? bookings : [];
  const activeBookingCount = safeBookings.filter((booking) =>
    ['pending', 'confirmed'].includes(booking?.status),
  ).length;
  const safeSavedIds = Array.isArray(savedIds) ? savedIds : [];
  const safeReviews = Array.isArray(reviews)
    ? reviews.filter((review) => review.userId === session?.user?.id)
    : [];
  const ownedProviders = Array.isArray(access?.ownedProviders) ? access.ownedProviders : [];
  const snapPoints = useMemo(() => ['34%'], []);
  const initials = (typeof safeProfile.name === 'string' ? safeProfile.name : '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'S';
  const accountItems = accountMenu.filter((item) => item.group === 'account');
  const communityItems = accountMenu.filter(
    (item) => item.group === 'community' && item.route !== 'ClaimListing',
  );
  const renderBackdrop = useCallback(
    (props) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />,
    [],
  );

  const chooseAvatar = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showPermissionRecovery(
          'Photo access needed',
          'Allow photo library access to choose a profile picture.',
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.82,
      });
      if (!result.canceled && result.assets?.[0]?.uri)
        await saveProfile({ ...safeProfile, avatarUri: result.assets[0].uri });
    } catch (error) {
      Alert.alert('Could not update profile picture', error?.message || 'Please try again.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Retry', onPress: () => void chooseAvatar() },
      ]);
    }
  };

  const confirmLogout = async () => {
    logoutSheetRef.current?.dismiss();
    try {
      const rootNavigation = navigation.getParent?.();
      if (rootNavigation) {
        await new Promise((resolve) => {
          let removeTransitionListener = () => {};
          const timeout = setTimeout(finishTransition, motion.navigation.duration + 100);
          function finishTransition() {
            clearTimeout(timeout);
            removeTransitionListener();
            resolve();
          }
          removeTransitionListener = rootNavigation.addListener('transitionEnd', (event) => {
            if (!event.data?.closing) finishTransition();
          });
          rootNavigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
        });
      } else {
        navigation.navigate('Welcome');
        await new Promise((resolve) =>
          setTimeout(resolve, motion.navigation.duration + 100),
        );
      }
      await signOut();
    } catch (error) {
      Alert.alert('Could not log out', error?.message || 'Please try again.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Retry', onPress: () => void confirmLogout() },
      ]);
    }
  };
  if (!session)
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
        <View style={styles.guest}>
          <LogIn size={38} color={palette.primary} />
          <Text style={[typography.h2, { color: palette.text }]}>Sign in to your profile</Text>
          <Text style={[styles.sheetBody, { color: palette.text2, textAlign: 'center' }]}>
            Saved providers, quotes, reviews and business tools require a verified account.
          </Text>
          <GlowButton
            variant="primary"
            label="Sign in or create account"
            accessibilityRole="button"
            accessibilityLabel="Sign in or create account"
            buttonStyle={styles.guestSignInButton}
            onPress={() => navigation.navigate('Welcome')}
          />
        </View>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: getTabBarContentPadding(insets.bottom) },
        ]}
      >
        <FadeInView>
          <GlowProfileCard
            showAccentDecoration={false}
            shadowTint="none"
            style={[
              {
                marginBottom: 14,
                borderRadius: radius.xl,
                borderWidth: 1,
                backgroundColor: palette.surface,
                borderColor: palette.border,
              },
            ]}
            contentStyle={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              padding: 18,
            }}
          >
            <TouchableOpacity
              testID="btn-change-profile-picture"
              accessibilityRole="button"
              accessibilityLabel="Change profile picture"
              onPress={chooseAvatar}
              style={styles.avatarWrap}
            >
              {safeProfile.avatarUri ? (
                <Image source={{ uri: safeProfile.avatarUri }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: palette.primarySoft }]}>
                  <Text style={[styles.initials, { color: palette.primary }]}>{initials}</Text>
                </View>
              )}
              <View
                style={[
                  styles.editBadge,
                  { backgroundColor: palette.primary, borderColor: palette.surface },
                ]}
              >
                <Pencil size={11} color={palette.background} />
              </View>
            </TouchableOpacity>
            <View style={styles.identity}>
              <Text style={[typography.h2, { color: palette.text }]}>
                {!safeProfile.name || safeProfile.name === 'Guest'
                  ? 'ChodhiQ member'
                  : safeProfile.name}
              </Text>
              <Text style={[typography.caption, { color: palette.text2 }]}>
                {safeProfile.email || ''}
              </Text>
              <Text style={[styles.member, { color: palette.primary }]}>
                {safeProfile.memberSince
                  ? `Community member since ${safeProfile.memberSince}`
                  : 'Community member'}
              </Text>
            </View>
            <PressableScale
              testID="btn-profile-edit"
              accessibilityRole="button"
              accessibilityLabel="Edit profile and account security"
              style={[styles.modeButton, { backgroundColor: palette.goldSoft }]}
              onPress={() => navigation.navigate('EditProfile')}
            >
              <ShieldCheck size={20} color={palette.dark ? palette.saffron : palette.primary} />
            </PressableScale>
          </GlowProfileCard>
        </FadeInView>

        <FadeInView
          delay={70}
          style={[styles.stats, { backgroundColor: palette.surface, borderColor: palette.border }]}
        >
          <Stat
            testID="btn-profile-saved"
            value={safeSavedIds.length}
            label="Saved"
            palette={palette}
            onPress={() => navigation.navigate('Saved')}
          />
          <View style={[styles.divider, { backgroundColor: palette.border }]} />
          <Stat
            testID="btn-profile-reviews"
            value={safeReviews.length}
            label="Reviews"
            palette={palette}
            onPress={() => navigation.navigate('Reviews')}
          />
          <View style={[styles.divider, { backgroundColor: palette.border }]} />
          <Stat
            testID="btn-profile-bookings"
            value={activeBookingCount}
            label="Bookings"
            palette={palette}
            onPress={() => navigation.navigate('Bookings')}
          />
        </FadeInView>

        <FadeInView delay={170}>
          <ProfileGroup
            title="Account & preferences"
            hint="Notifications, location, privacy and settings"
            expanded={expandedSection === 'account'}
            onPress={() => setExpandedSection(expandedSection === 'account' ? null : 'account')}
            palette={palette}
          >
            <View style={[styles.groupContent, { borderTopColor: palette.border }]}>
              <View style={styles.menuRow}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: palette.text, fontWeight: '700' }}>
                    Notification vibration
                  </Text>
                  <Text style={[styles.preferenceHint, { color: palette.text2 }]}>
                    {preferencesSyncing
                      ? 'Syncing notification settings...'
                      : preferencesError || 'Vibrate when a new phone notification arrives'}
                  </Text>
                </View>
                <Switch
                  testID="switch-notification-vibration"
                  accessibilityLabel="Notification vibration"
                  value={preferences.vibration}
                  onValueChange={(vibration) =>
                    setPreferences((current) => ({ ...current, vibration }))
                  }
                  trackColor={{ false: palette.border, true: palette.primary }}
                  thumbColor={palette.onPrimary}
                />
              </View>
              {!!preferencesError && (
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={preferencesSyncing}
                  onPress={retryPreferencesSync}
                  style={styles.inlineAction}
                >
                  <Text style={{ color: palette.primary, fontWeight: '700' }}>
                    {preferencesSyncing ? 'Syncing...' : "Couldn't sync. Retry"}
                  </Text>
                </TouchableOpacity>
              )}
              {permissionDenied && Platform.OS !== 'web' && (
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={openPermissionSettings}
                  style={styles.inlineAction}
                >
                  <Text style={{ color: palette.primary, fontWeight: '700' }}>
                    Open phone notification settings
                  </Text>
                </TouchableOpacity>
              )}
              <MenuCard items={accountItems} palette={palette} navigation={navigation} />
            </View>
          </ProfileGroup>
        </FadeInView>
        {!ownedProviders.length && (
          <FadeInView delay={195}>
            <ProfileGroup
              title="Grow your business"
              hint="Join ChodhiQ as a local provider"
              expanded={expandedSection === 'provider'}
              onPress={() => setExpandedSection(expandedSection === 'provider' ? null : 'provider')}
              palette={palette}
            >
              <View
                style={[
                  styles.providerCard,
                  { backgroundColor: palette.primaryTint, borderColor: palette.primary },
                ]}
              >
                <View style={styles.providerTop}>
                  <View style={[styles.providerIcon, { backgroundColor: palette.primary }]}>
                    <Building2 size={24} color={palette.background} />
                  </View>
                  <View style={styles.providerHeading}>
                    <Text style={[styles.providerKicker, { color: palette.primary }]}>
                      FOR BUSINESSES & PROFESSIONALS
                    </Text>
                    <Text style={[styles.providerTitle, { color: palette.text }]}>
                      Grow your business on ChodhiQ
                    </Text>
                  </View>
                </View>
                <Text style={[styles.providerBody, { color: palette.text2 }]}>
                  Claim an existing listing or create a new profile so local customers can discover,
                  trust and contact you.
                </Text>
                <Text style={[styles.providerBody, { color: palette.text2 }]}>
                  Put your services in front of local customers, build confidence with a reviewed
                  business identity, and make it easier for people to ask about your availability.
                  Your profile brings your services, location and contact options together.
                </Text>
                <View style={styles.providerBenefits}>
                  <Benefit Icon={BadgeCheck} text="Apply for verified status" palette={palette} />
                  <Benefit
                    Icon={Sparkles}
                    text="Share services, offers and updates"
                    palette={palette}
                  />
                  <Benefit
                    Icon={ChevronRight}
                    text="Receive enquiries in one place"
                    palette={palette}
                  />
                </View>
                <PressableScale
                  testID="btn-claim-listing"
                  style={styles.providerButton}
                  onPress={() => navigation.navigate('ClaimListing')}
                >
                  <View
                    style={[styles.providerButtonContent, { backgroundColor: palette.primary }]}
                  >
                    <Text style={{ color: palette.onPrimary, fontWeight: '900' }}>
                      Join as a provider
                    </Text>
                    <ChevronRight size={18} color={palette.onPrimary} />
                  </View>
                </PressableScale>
                <Text style={[styles.providerNote, { color: palette.text2 }]}>
                  You’ll need basic business details and proof of ownership for verification.
                </Text>
              </View>
            </ProfileGroup>
          </FadeInView>
        )}
        <FadeInView delay={220}>
          <ProfileGroup
            title="Community & business"
            hint="Your posts, reviews and provider tools"
            expanded={expandedSection === 'community'}
            onPress={() => setExpandedSection(expandedSection === 'community' ? null : 'community')}
            palette={palette}
          >
            <View style={[styles.groupContent, { borderTopColor: palette.border }]}>
              <MenuCard
                items={communityItems}
                palette={palette}
                navigation={navigation}
                emphasized
              />
            </View>
          </ProfileGroup>
        </FadeInView>
        <FadeInView delay={270}>
          <PressableScale
            testID="btn-open-logout"
            style={styles.logoutRow}
            onPress={() => logoutSheetRef.current?.present()}
          >
            <LogOut size={18} color={colors.accentHalal} />
            <Text style={styles.logoutText}>Log out</Text>
          </PressableScale>
        </FadeInView>
      </ScrollView>

      <BottomSheetModal
        ref={logoutSheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundComponent={({ style }) => (
          <GlassView
            intensity={54}
            style={[style, { borderColor: palette.border, backgroundColor: palette.surface }]}
          />
        )}
        handleIndicatorStyle={{ backgroundColor: palette.muted }}
      >
        <BottomSheetView style={styles.sheet}>
          <Text style={[typography.h2, { color: palette.text }]}>Log out of ChodhiQ?</Text>
          <Text style={[styles.sheetBody, { color: palette.text2 }]}>
            Your saved businesses and community activity will remain connected to your account.
          </Text>
          <View style={styles.sheetActions}>
            <GlowButton
              testID="btn-cancel-logout"
              label="Stay signed in"
              variant="secondary"
              size="md"
              buttonStyle={styles.sheetButton}
              onPress={() => logoutSheetRef.current?.dismiss()}
            />
            <AsyncGlowButton
              testID="btn-confirm-logout"
              label="Log out"
              variant="danger"
              size="md"
              buttonStyle={styles.sheetButton}
              onPress={confirmLogout}
            />
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </SafeAreaView>
  );
}

function ProfileGroup({ title, hint, expanded, onPress, palette, children }) {
  return (
    <GlowProfileCard
      showAccentDecoration={false}
      shadowTint="none"
      style={[styles.groupCard, { borderColor: palette.border }]}
      contentStyle={{ padding: 0, gap: 0 }}
    >
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={onPress}
        style={styles.groupHeader}
      >
        <View style={styles.groupCopy}>
          <Text style={[styles.groupTitle, { color: palette.text }]}>{title}</Text>
          <Text style={[styles.groupHint, { color: palette.text2 }]}>{hint}</Text>
        </View>
        <ChevronDown
          size={19}
          color={palette.muted}
          style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
        />
      </TouchableOpacity>
      {expanded && children}
    </GlowProfileCard>
  );
}

function Stat({ value, label, palette, onPress, testID }) {
  return (
    <TouchableOpacity
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      onPress={onPress}
      style={styles.stat}
    >
      <Text style={[styles.statValue, { color: palette.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: palette.text2 }]}>{label}</Text>
    </TouchableOpacity>
  );
}
function Benefit({ Icon, text, palette }) {
  return (
    <View style={styles.benefit}>
      <View style={[styles.benefitIcon, { backgroundColor: palette.surface }]}>
        <Icon size={14} color={palette.primary} />
      </View>
      <Text style={[styles.benefitText, { color: palette.text }]}>{text}</Text>
    </View>
  );
}

function MenuCard({ items, palette, navigation, emphasized = false }) {
  return (
    <GlowProfileCard
      showAccentDecoration={false}
      shadowTint="none"
      style={[styles.menuCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
      contentStyle={{ padding: 0, gap: 0 }}
    >
      {items.map((item, index) => (
        <PressableScale
          key={item.route}
          testID={`btn-profile-${String(item.route).toLowerCase()}`}
          onPress={() => navigation.navigate(item.route)}
        >
          <View
            style={[
              styles.menuRow,
              index !== items.length - 1 && {
                borderBottomWidth: 1,
                borderBottomColor: palette.border,
              },
            ]}
          >
            <View
              style={[
                styles.menuIcon,
                { backgroundColor: emphasized ? `${item.accent}20` : palette.surfaceAlt },
              ]}
            >
              <item.icon size={18} color={emphasized ? item.accent : palette.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuLabel, { color: palette.text }]}>{item.label}</Text>
              {emphasized && (
                <Text style={[styles.menuHint, { color: palette.text2 }]}>
                  {item.route === 'Reviews'
                    ? 'Share trusted experiences'
                    : item.route === 'QuoteRequests'
                      ? 'Track conversations with providers'
                      : item.route === 'Bookings'
                        ? 'Track your appointments'
                        : 'Grow with the ChodhiQ community'}
                </Text>
              )}
            </View>
            <ChevronRight size={16} color={palette.muted} />
          </View>
        </PressableScale>
      ))}
    </GlowProfileCard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  guest: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    padding: spacing.lg,
    paddingBottom: 120,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    ...shadows.soft,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontSize: 23, fontWeight: '900' },
  editBadge: {
    position: 'absolute',
    right: -2,
    bottom: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identity: { flex: 1, minWidth: 0 },
  member: { fontSize: 10, fontWeight: '800', marginTop: 5 },
  modeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.lg,
    marginTop: spacing.md,
    paddingVertical: 13,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '900' },
  statLabel: { fontSize: 10, fontWeight: '700', marginTop: 2 },
  divider: { width: 1, height: 28 },
  groupCard: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  groupHeader: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
  },
  groupCopy: { flex: 1, gap: 3 },
  groupTitle: { fontSize: 14, fontWeight: '800' },
  groupHint: { fontSize: 11, lineHeight: 15 },
  groupContent: { borderTopWidth: 1, padding: 10, gap: 10 },
  inlineAction: { padding: 10 },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginTop: spacing.lg,
    marginBottom: 8,
  },
  providerCard: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.md,
    ...shadows.soft,
  },
  providerTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  providerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerHeading: { flex: 1 },
  providerKicker: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  providerTitle: { fontSize: 18, lineHeight: 22, fontWeight: '900', marginTop: 2 },
  providerBody: { fontSize: 12, lineHeight: 18, marginTop: 12 },
  providerBenefits: { gap: 8, marginVertical: 12 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  benefitIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: { flex: 1, fontSize: 12, fontWeight: '700' },
  providerButton: {
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  providerButtonContent: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  providerNote: { fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 10 },
  paletteRow: { flexDirection: 'row', gap: 8 },
  paletteFlex: { flex: 1 },
  paletteCard: { borderRadius: radius.md, padding: 7, borderWidth: 1.5 },
  miniPreview: { height: 50, borderRadius: 9, padding: 6 },
  miniCard: { width: '72%', height: 17, borderRadius: 5 },
  miniButton: { width: '42%', height: 8, borderRadius: 5, marginTop: 7 },
  paletteFooter: { flexDirection: 'row', alignItems: 'center', height: 28 },
  paletteName: { flex: 1, fontSize: 9, fontWeight: '800' },
  check: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  menuCard: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: 12 },
  preferenceHint: { fontSize: 12, minHeight: 34, lineHeight: 17 },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { fontSize: 14, fontWeight: '800' },
  menuHint: { fontSize: 10, marginTop: 2 },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  logoutText: { color: colors.accentHalal, fontWeight: '800' },
  sheet: { padding: spacing.lg, paddingBottom: 36 },
  sheetBody: { fontSize: 13, lineHeight: 19, marginTop: 7 },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: spacing.lg },
  sheetButton: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: radius.md },
  guestSignInButton: {
    minWidth: 220,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: radius.md,
  },
});
