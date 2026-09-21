import React, { useCallback, useMemo, useRef } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import {
  BadgeCheck,
  Building2,
  ChevronRight,
  LogIn,
  LogOut,
  Pencil,
  ShieldCheck,
  Sparkles,
} from 'lucide-react-native';
import { colors, radius, shadows, spacing, typography } from '../theme/theme';
import { useAppState } from '../context/AppStateContext';
import { useChodhiQTheme } from '../context/ThemeContext';
import { FadeInView, PressableScale } from '../components/Motion';
import { accountMenu } from './AccountScreens';

export default function ProfileScreen({ navigation }) {
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
  } = useAppState();
  const { palette, mode: themeMode, setMode: setThemeMode } = useChodhiQTheme();
  const logoutSheetRef = useRef(null);
  const snapPoints = useMemo(() => ['34%'], []);
  const initials =
    profile.name
      ?.split(/\s+/)
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
    Haptics.selectionAsync().catch(() => {});
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.82,
    });
    if (!result.canceled && result.assets?.[0]?.uri)
      await saveProfile({ ...profile, avatarUri: result.assets[0].uri });
  };

  const confirmLogout = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    logoutSheetRef.current?.dismiss();
    await signOut();
    navigation.navigate('Welcome');
  };

  if (!session)
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.guest}>
          <LogIn size={38} color={palette.primary} />
          <Text style={[typography.h2, { color: palette.text }]}>Sign in to your profile</Text>
          <Text style={[styles.sheetBody, { color: palette.text2, textAlign: 'center' }]}>
            Saved providers, quotes, reviews and business tools require a verified account.
          </Text>
          <View
            style={[
              styles.guestTheme,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <Text style={[styles.guestThemeLabel, { color: palette.text }]}>Appearance</Text>
            <TouchableOpacity
              accessibilityRole="switch"
              accessibilityState={{ checked: themeMode === 'dark' }}
              accessibilityLabel="Toggle dark mode"
              onPress={() => setThemeMode(themeMode === 'dark' ? 'fresh' : 'dark')}
              style={[styles.themeToggle, { backgroundColor: palette.surfaceAlt }]}
            >
              <Text style={[styles.themeToggleLabel, { color: palette.text }]}>Light</Text>
              <View style={[styles.themeTrack, { backgroundColor: palette.border }]}>
                <View
                  style={[
                    styles.themeThumb,
                    {
                      backgroundColor: palette.primary,
                      transform: [{ translateX: themeMode === 'dark' ? 22 : 0 }],
                    },
                  ]}
                />
              </View>
              <Text style={[styles.themeToggleLabel, { color: palette.text }]}>Dark</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Sign in or create account"
            style={[styles.guestSignInButton, { backgroundColor: palette.primary }]}
            onPress={() => navigation.navigate('Welcome')}
          >
            <Text style={{ color: palette.primaryActionText, fontWeight: '800' }}>
              Sign in or create account
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <FadeInView
          style={[
            styles.profileHeader,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <TouchableOpacity
            accessibilityLabel="Change profile picture"
            onPress={chooseAvatar}
            style={styles.avatarWrap}
          >
            {profile.avatarUri ? (
              <Image source={{ uri: profile.avatarUri }} style={styles.avatar} />
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
            <Text style={[typography.h2, { color: palette.text }]}>{profile.name}</Text>
            <Text style={[typography.caption, { color: palette.text2 }]}>{profile.email}</Text>
            <Text style={[styles.member, { color: palette.primary }]}>
              Community member since {profile.memberSince || '2026'}
            </Text>
          </View>
          <PressableScale
            style={[styles.modeButton, { backgroundColor: palette.goldSoft }]}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <ShieldCheck size={20} color={palette.dark ? palette.saffron : palette.primary} />
          </PressableScale>
        </FadeInView>

        <FadeInView
          delay={70}
          style={[styles.stats, { backgroundColor: palette.surface, borderColor: palette.border }]}
        >
          <Stat value={savedIds.length} label="Saved" palette={palette} />
          <View style={[styles.divider, { backgroundColor: palette.border }]} />
          <Stat value={reviews.length} label="Reviews" palette={palette} />
          <View style={[styles.divider, { backgroundColor: palette.border }]} />
          <Stat value={bookings.length} label="Bookings" palette={palette} />
        </FadeInView>

        <FadeInView delay={170}>
          <Text style={[styles.sectionLabel, { color: palette.text2 }]}>ACCOUNT</Text>
          <MenuCard items={accountItems} palette={palette} navigation={navigation} />
        </FadeInView>
        {!access.ownedProviders.length && (
          <FadeInView delay={195}>
            <View
              style={[
                styles.providerCard,
                { backgroundColor: palette.primarySoft, borderColor: palette.primary },
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
                style={[styles.providerButton, { backgroundColor: palette.primary }]}
                onPress={() => navigation.navigate('ClaimListing')}
              >
                <Text style={{ color: palette.background, fontWeight: '900' }}>
                  Join as a provider
                </Text>
                <ChevronRight size={18} color={palette.background} />
              </PressableScale>
              <Text style={[styles.providerNote, { color: palette.text2 }]}>
                You’ll need basic business details and proof of ownership for verification.
              </Text>
            </View>
          </FadeInView>
        )}
        <FadeInView delay={220}>
          <Text style={[styles.sectionLabel, { color: palette.text2, marginTop: spacing.lg }]}>
            COMMUNITY & BUSINESS
          </Text>
          <MenuCard items={communityItems} palette={palette} navigation={navigation} emphasized />
        </FadeInView>
        <FadeInView delay={270}>
          <PressableScale
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
        backgroundStyle={{ backgroundColor: palette.surface }}
        handleIndicatorStyle={{ backgroundColor: palette.muted }}
      >
        <BottomSheetView style={styles.sheet}>
          <Text style={[typography.h2, { color: palette.text }]}>Log out of ChodhiQ?</Text>
          <Text style={[styles.sheetBody, { color: palette.text2 }]}>
            Your saved businesses and community activity will remain connected to your account.
          </Text>
          <View style={styles.sheetActions}>
            <TouchableOpacity
              style={[styles.sheetButton, { backgroundColor: palette.surfaceAlt }]}
              onPress={() => logoutSheetRef.current?.dismiss()}
            >
              <Text style={{ color: palette.text, fontWeight: '800' }}>Stay signed in</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sheetButton, { backgroundColor: colors.accentHalal }]}
              onPress={confirmLogout}
            >
              <Text style={{ color: '#fff', fontWeight: '800' }}>Log out</Text>
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </SafeAreaView>
  );
}

function Stat({ value, label, palette }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: palette.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: palette.text2 }]}>{label}</Text>
    </View>
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
    <View
      style={[styles.menuCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
    >
      {items.map((item, index) => (
        <PressableScale key={item.route} onPress={() => navigation.navigate(item.route)}>
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
                      : 'Grow with the ChodhiQ community'}
                </Text>
              )}
            </View>
            <ChevronRight size={16} color={palette.muted} />
          </View>
        </PressableScale>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  guest: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  guestTheme: { width: '100%', maxWidth: 420, padding: 14, borderRadius: 18, borderWidth: 1 },
  guestThemeLabel: { fontSize: 13, fontWeight: '900', marginBottom: 10 },
  guestThemeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  themeToggle: {
    height: 52,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 18,
  },
  themeToggleLabel: { fontSize: 13, fontWeight: '800' },
  themeTrack: { width: 48, height: 26, borderRadius: 999, padding: 3 },
  themeThumb: { width: 20, height: 20, borderRadius: 10 },
  guestThemeOption: {
    width: '31%',
    minHeight: 62,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 13,
    borderWidth: 1,
  },
  swatches: { flexDirection: 'row' },
  swatch: {
    width: 13,
    height: 13,
    borderRadius: 7,
    marginLeft: -2,
    borderWidth: 1,
    borderColor: '#FFFFFF88',
  },
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
  identity: { flex: 1 },
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
    padding: 20,
    ...shadows.soft,
  },
  providerTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  providerIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerHeading: { flex: 1 },
  providerKicker: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  providerTitle: { fontSize: 20, lineHeight: 25, fontWeight: '900', marginTop: 3 },
  providerBody: { fontSize: 13, lineHeight: 20, marginTop: 14 },
  providerBenefits: { gap: 10, marginVertical: 16 },
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
    minHeight: 50,
    borderRadius: radius.md,
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
