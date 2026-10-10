import { AppAlert as Alert } from '../components/AppDialog';
import ScrollView from '../components/KeyboardAwareScrollView';
import { MotionTouchable as TouchableOpacity } from '../components/Motion';
import React, { useEffect, useState } from 'react';
import AppTextInput from '../components/AppTextInput';
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  StyleSheet,
  Switch,
  View,
} from 'react-native';

import Text from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  FileText,
  Gauge,
  Eye,
  EyeOff,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Star,
  UserRound,
} from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import { colors, radius, spacing, typography } from '../theme/theme';
import { ukCities } from '../data/mockData';
import { useAppState } from '../context/AppStateContext';
import { useChodhiQTheme } from '../context/ThemeContext';
import { FadeInView, FloatingView, PressableScale } from '../components/Motion';
import * as ExpoLocation from 'expo-location';
import { openPermissionSettings, showPermissionRecovery } from '../lib/permissionRecovery';
import { getDeviceLocation } from '../lib/deviceLocation';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { generatedAssets } from '../data/assetCatalog';
import { brand } from '../config/brand';
import { legalLinks, publishedLegalLinksReady } from '../config/legal';
import {
  preparePasswordRecovery,
  requestPasswordReset,
  resendEmailConfirmation,
  updatePassword,
} from '../lib/supabase';
import { cleanEmail, cleanPassword } from '../lib/validation';
import { authErrorMessage } from '../lib/authOperations';

const pageStyles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  tab: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.pill,
    flex: 1,
    paddingVertical: 10,
  },
  grow: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  body: { fontSize: 13, lineHeight: 19, color: colors.textSecondary },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 13,
    color: colors.textPrimary,
  },
  passwordField: { position: 'relative', justifyContent: 'center' },
  passwordInput: { paddingRight: 52 },
  passwordToggle: { position: 'absolute', right: 4, padding: 10 },
  button: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700' },
  link: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  empty: {
    alignItems: 'center',
    paddingVertical: 56,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  muted: { color: colors.textMuted, fontSize: 13 },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
});

function PasswordInput({ value, onChangeText, placeholder, palette, style, ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={pageStyles.passwordField}>
      <AppTextInput
        {...props}
        style={[style, pageStyles.passwordInput]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={!visible}
        placeholderTextColor={palette.muted}
      />
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={
          visible ? `Hide ${placeholder.toLowerCase()}` : `Show ${placeholder.toLowerCase()}`
        }
        onPress={() => setVisible((current) => !current)}
        style={pageStyles.passwordToggle}
      >
        {visible ? (
          <EyeOff size={20} color={palette.muted} />
        ) : (
          <Eye size={20} color={palette.muted} />
        )}
      </TouchableOpacity>
    </View>
  );
}

export function WelcomeScreen({ navigation, route }) {
  const { authenticate, continueAsGuest } = useAppState();
  const { palette } = useChodhiQTheme();
  const [mode, setMode] = useState(route.params?.initialMode === 'signup' ? 'signup' : 'signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  useEffect(() => {
    const requestedMode = route.params?.initialMode;
    if (requestedMode === 'signup' || requestedMode === 'signin') {
      setMode(requestedMode);
      setAuthMessage(null);
    }
  }, [route.params?.initialMode]);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passwordValid = password.length >= 10;
  const signupValid =
    name.trim().length >= 2 &&
    emailValid &&
    passwordValid &&
    password === confirmPassword &&
    consent;
  const submitDisabled = busy || (mode === 'signup' ? !signupValid : !emailValid || !password);
  const finish = () => navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  const submit = async (method) => {
    try {
      setBusy(true);
      setAuthMessage(null);

      const nextSession = await authenticate(method, { name, email: email.trim(), password });
      if (method === 'signup' && !nextSession) {
        setAwaitingConfirmation(true);
        setMode('signin');
        setAuthMessage({
          type: 'success',
          text: 'Check your email. Confirm your address, then return to ChodhiQ and sign in.',
        });
        return;
      }
      if (!nextSession) throw new Error('Authentication completed without creating a session.');

      finish();
    } catch (error) {
      setAuthMessage({ type: 'error', text: authErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  };
  const guest = () => {
    continueAsGuest();
    finish();
  };
  const forgotPassword = async () => {
    try {
      const safeEmail = cleanEmail(email);
      setBusy(true);
      setAuthMessage(null);
      await requestPasswordReset(safeEmail);
      setAuthMessage({
        type: 'success',
        text: 'Check your email. If an account exists, a secure reset link has been sent.',
      });
    } catch (error) {
      setAuthMessage({
        type: 'error',
        text: authErrorMessage(
          error,
          'Password reset is temporarily unavailable. Please try again.',
        ),
      });
    } finally {
      setBusy(false);
    }
  };
  const resendConfirmation = async () => {
    try {
      setBusy(true);
      await resendEmailConfirmation(cleanEmail(email));
      setAwaitingConfirmation(true);
      setAuthMessage({
        type: 'success',
        text: 'If this account needs confirmation, a new email has been sent. Use the latest link, then return here to sign in.',
      });
    } catch (error) {
      setAuthMessage({ type: 'error', text: authErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  };
  const inputStyle = [
    pageStyles.input,
    stylesWelcome.authInput,
    { backgroundColor: palette.field, borderColor: 'transparent', color: palette.text },
  ];
  return (
    <SafeAreaView style={[pageStyles.page, { backgroundColor: palette.background }]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={stylesWelcome.content}
      >
        <View style={stylesWelcome.column}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => navigation.goBack()}
            style={[stylesWelcome.backButton, { borderColor: palette.border }]}
          >
            <ChevronLeft size={20} strokeWidth={1.75} color={palette.text} />
          </TouchableOpacity>
          <FadeInView>
            <View style={stylesWelcome.brandLockup}>
              <Image
                source={require('../../assets/chodhiq-full-logo-transparent.png')}
                style={stylesWelcome.brandLogo}
                resizeMode="contain"
                accessibilityLabel={`${brand.name} logo`}
              />
              <Text style={[stylesWelcome.tagline, { color: palette.textTertiary }]}>
                ASK · CONNECT · GROW
              </Text>
            </View>
          </FadeInView>
          <FadeInView delay={80}>
            <Text style={[typography.h1, stylesWelcome.welcomeTitle, { color: palette.text }]}>
              {mode === 'signup' ? 'Create your account' : 'Welcome back'}
            </Text>
            <Text style={[pageStyles.body, { fontSize: 15, lineHeight: 22, color: palette.text2 }]}>
              {mode === 'signup'
                ? "Start discovering what's around you."
                : 'Sign in to continue discovering.'}
            </Text>
          </FadeInView>
          <FadeInView
            delay={150}
            style={[
              stylesWelcome.form,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            {mode === 'signup' && (
              <AppTextInput
                accessibilityLabel="Full name"
                style={inputStyle}
                value={name}
                onChangeText={setName}
                placeholder="Full name"
                placeholderTextColor={palette.muted}
              />
            )}
            <AppTextInput
              accessibilityLabel="Email address"
              style={inputStyle}
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor={palette.muted}
            />
            <PasswordInput
              accessibilityLabel="Password"
              style={inputStyle}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              autoCapitalize="none"
              palette={palette}
            />
            {mode === 'signup' && (
              <PasswordInput
                accessibilityLabel="Confirm password"
                style={[
                  ...inputStyle,
                  confirmPassword && confirmPassword !== password && { borderColor: '#E5484D' },
                ]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm password"
                autoCapitalize="none"
                palette={palette}
              />
            )}
            {email.length > 0 && !emailValid ? (
              <Text style={stylesWelcome.validation}>Enter a valid email address.</Text>
            ) : null}
            {password.length > 0 && !passwordValid ? (
              <Text style={stylesWelcome.validation}>Use at least 10 characters.</Text>
            ) : null}
            {mode === 'signup' && confirmPassword.length > 0 && confirmPassword !== password ? (
              <Text style={stylesWelcome.validation}>Passwords do not match.</Text>
            ) : null}
            {mode === 'signup' ? (
              <TouchableOpacity
                accessibilityRole="checkbox"
                accessibilityState={{ checked: consent }}
                onPress={() => setConsent((value) => !value)}
                style={stylesWelcome.consentRow}
              >
                <View
                  style={[
                    stylesWelcome.checkbox,
                    {
                      backgroundColor: consent ? palette.primary : palette.surface,
                      borderColor: consent ? palette.primary : palette.border,
                    },
                  ]}
                >
                  {consent ? <Check size={13} color="#FFFFFF" /> : null}
                </View>
                <Text style={[stylesWelcome.consentText, { color: palette.text2 }]}>
                  {publishedLegalLinksReady
                    ? 'I agree to the Terms of Service and have read the Privacy Policy.'
                    : 'I understand ChodhiQ uses my account details, posts and bookings to provide this test service.'}
                </Text>
              </TouchableOpacity>
            ) : null}
            {mode === 'signup' && publishedLegalLinksReady ? (
              <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
                <TouchableOpacity
                  accessibilityRole="link"
                  onPress={() => void Linking.openURL(legalLinks.terms)}
                >
                  <Text style={{ color: palette.primary, fontWeight: '700' }}>Read terms</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="link"
                  onPress={() => void Linking.openURL(legalLinks.privacy)}
                >
                  <Text style={{ color: palette.primary, fontWeight: '700' }}>
                    Read privacy policy
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {authMessage ? (
              <View
                accessibilityRole="alert"
                style={[
                  stylesWelcome.message,
                  {
                    backgroundColor:
                      authMessage.type === 'error' ? `${palette.coral}18` : `${palette.primary}18`,
                    borderColor:
                      authMessage.type === 'error' ? `${palette.coral}66` : `${palette.primary}66`,
                  },
                ]}
              >
                <Text
                  style={{
                    color: authMessage.type === 'error' ? palette.coral : palette.text,
                    fontSize: 12,
                    lineHeight: 17,
                    fontWeight: '700',
                  }}
                >
                  {authMessage.text}
                </Text>
              </View>
            ) : null}
            <PressableScale
              disabled={submitDisabled}
              style={[
                pageStyles.button,
                stylesWelcome.authButton,
                { backgroundColor: palette.primary, opacity: submitDisabled ? 0.4 : 1 },
              ]}
              onPress={() => submit(mode === 'signup' ? 'signup' : 'email')}
            >
              {busy ? (
                <ActivityIndicator size={18} color={palette.onPrimary} />
              ) : (
                <Text style={[pageStyles.buttonText, { color: palette.onPrimary, fontSize: 16 }]}>
                  {mode === 'signup' ? 'Create account' : 'Sign in'}
                </Text>
              )}
            </PressableScale>
            {mode === 'signin' ? (
              <TouchableOpacity disabled={busy} onPress={forgotPassword}>
                <Text style={{ textAlign: 'right', color: palette.primary, fontWeight: '800' }}>
                  Forgot password?
                </Text>
              </TouchableOpacity>
            ) : null}
            {awaitingConfirmation || (mode === 'signin' && emailValid) ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Resend confirmation email"
                disabled={busy || !emailValid}
                onPress={resendConfirmation}
              >
                <Text style={{ textAlign: 'center', color: palette.primary, fontWeight: '700' }}>
                  Resend confirmation email
                </Text>
              </TouchableOpacity>
            ) : null}
            <View style={stylesWelcome.orRow}>
              <View style={[stylesWelcome.orLine, { backgroundColor: palette.border }]} />
              <Text style={{ color: palette.text2, fontSize: 12 }}>or continue with</Text>
              <View style={[stylesWelcome.orLine, { backgroundColor: palette.border }]} />
            </View>
            <View style={stylesWelcome.socialRow}>
              <PressableScale
                disabled={busy}
                style={[
                  stylesWelcome.social,
                  { backgroundColor: palette.background, borderColor: palette.border },
                ]}
                onPress={() => submit('google')}
              >
                <Text style={{ color: palette.text, fontWeight: '600' }}>Continue with Google</Text>
              </PressableScale>
              {Platform.OS === 'ios' ? (
                <PressableScale
                  disabled={busy}
                  style={[
                    stylesWelcome.social,
                    { backgroundColor: palette.surface, borderColor: palette.border },
                  ]}
                  onPress={() => submit('apple')}
                >
                  <Text style={{ color: palette.text, fontWeight: '600' }}>
                    Continue with Apple
                  </Text>
                </PressableScale>
              ) : null}
            </View>
          </FadeInView>
          <FadeInView delay={220}>
            <TouchableOpacity
              onPress={() => {
                setMode((value) => (value === 'signup' ? 'signin' : 'signup'));
                setAuthMessage(null);
                setAwaitingConfirmation(false);
              }}
            >
              <Text style={{ textAlign: 'center', color: palette.primary, fontWeight: '800' }}>
                {mode === 'signup'
                  ? 'Already have an account? Sign in'
                  : 'New to ChodhiQ? Create an account'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={guest}>
              <Text
                style={[
                  pageStyles.muted,
                  { textAlign: 'center', color: palette.text2, marginTop: 14 },
                ]}
              >
                Continue as guest
              </Text>
            </TouchableOpacity>
          </FadeInView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function ResetPasswordScreen({ navigation, route }) {
  const { palette } = useChodhiQTheme();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [preparing, setPreparing] = useState(true);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setPreparing(true);
    setRecoveryReady(false);
    setError('');
    preparePasswordRecovery(route.params?.code)
      .then(() => {
        if (!active) return;
        setRecoveryReady(true);
        setPreparing(false);
      })
      .catch((recoveryError) => {
        if (!active) return;
        setError(
          authErrorMessage(recoveryError, 'We could not open this reset link. Request a new one.'),
        );
        setPreparing(false);
      });
    return () => {
      active = false;
    };
  }, [route.params?.code]);

  const submit = async () => {
    try {
      setBusy(true);
      setError('');
      const safePassword = cleanPassword(password);
      if (safePassword !== confirmPassword) throw new Error('The passwords do not match.');
      await updatePassword(safePassword);
      Alert.alert('Password updated', 'You can now sign in with your new password.', [
        { text: 'Continue', onPress: () => navigation.replace('Welcome') },
      ]);
    } catch (updateError) {
      setError(
        authErrorMessage(updateError, 'Your password could not be updated. Please try again.'),
      );
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = [
    pageStyles.input,
    { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text },
  ];
  return (
    <SafeAreaView style={[pageStyles.page, { backgroundColor: palette.background }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[pageStyles.content, { flexGrow: 1, justifyContent: 'center' }]}
      >
        <Text style={[typography.h1, { color: palette.text }]}>Choose a new password</Text>
        <Text style={[pageStyles.body, { color: palette.text2 }]}>
          Use at least 10 characters. Avoid reusing a password from another account.
        </Text>
        {preparing ? <ActivityIndicator color={palette.primary} /> : null}
        {error ? (
          <Text accessibilityRole="alert" style={{ color: palette.coral, fontWeight: '700' }}>
            {error}
          </Text>
        ) : null}
        {!preparing && recoveryReady ? (
          <>
            <PasswordInput
              accessibilityLabel="New password"
              autoCapitalize="none"
              autoComplete="new-password"
              style={inputStyle}
              value={password}
              onChangeText={setPassword}
              placeholder="New password"
              palette={palette}
            />
            <PasswordInput
              accessibilityLabel="Confirm new password"
              autoCapitalize="none"
              autoComplete="new-password"
              style={inputStyle}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              palette={palette}
            />
            <TouchableOpacity
              disabled={busy}
              style={[pageStyles.button, { opacity: busy ? 0.6 : 1 }]}
              onPress={submit}
            >
              <Text style={pageStyles.buttonText}>{busy ? 'Updating…' : 'Update password'}</Text>
            </TouchableOpacity>
          </>
        ) : null}
        <TouchableOpacity onPress={() => navigation.replace('Welcome')}>
          <Text style={{ textAlign: 'center', color: palette.primary, fontWeight: '800' }}>
            Back to sign in
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const stylesWelcome = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  column: { width: '100%', maxWidth: 480, gap: 14 },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLockup: {
    alignSelf: 'center',
    alignItems: 'center',
  },
  brandLogo: { width: 170, height: 56, alignSelf: 'center' },
  tagline: {
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: -8,
  },
  welcomeTitle: { fontSize: 24, lineHeight: 30, flexShrink: 1, textAlign: 'center' },
  message: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10 },
  hero: {
    height: 210,
    borderRadius: radius.xl,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  heroImage: { borderRadius: radius.xl },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(3,8,18,.34)' },
  heroMark: {
    position: 'absolute',
    top: 14,
    left: 14,
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: 'rgba(217,138,72,.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroKicker: { color: '#E7B86D', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  heroTitle: { color: '#F7F4EF', fontSize: 28, fontWeight: '900', marginTop: 3 },
  logo: {
    width: 78,
    height: 78,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 8,
  },
  logoGlow: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    right: -18,
    top: -18,
    opacity: 0.45,
  },
  form: { padding: 0, borderRadius: 0, borderWidth: 0, gap: 10 },
  authInput: {
    height: 52,
    borderRadius: 999,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    fontSize: 15,
  },
  authButton: { height: 54, borderRadius: 999, paddingVertical: 0, justifyContent: 'center' },
  validation: { color: '#E5484D', fontSize: 12, lineHeight: 16, marginTop: -5 },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginTop: 2 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  consentText: { flex: 1, fontSize: 14, lineHeight: 19 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginVertical: 2 },
  orLine: { height: 1, flex: 1 },
  socialRow: { gap: 10 },
  social: {
    flex: 1,
    alignItems: 'center',
    height: 54,
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
  },
});

export function LocationScreen({ navigation }) {
  const { location, selectLocation, setCurrentLocation } = useAppState();
  const { palette } = useChodhiQTheme();
  const [selected, setSelected] = useState(location);
  const [detecting, setDetecting] = useState(false);
  const choose = (city, coordinates = null) => {
    setSelected(city);
    if (coordinates) setCurrentLocation(city, coordinates);
    else selectLocation(city);
    setTimeout(() => navigation.goBack(), 190);
  };
  const detect = async () => {
    try {
      setDetecting(true);
      const detectedLocation = await getDeviceLocation(ExpoLocation);
      const detected = detectedLocation.city;
      if (!detected) {
        Alert.alert(
          'Location found',
          'Your coordinates were found, but the area name could not be determined. Choose a city from the list.',
        );
        return;
      }
      const match = ukCities.find(
        (city) =>
          city.toLowerCase() === detected.toLowerCase() ||
          detected.toLowerCase().includes(city.toLowerCase()),
      );
      choose(match || detected, detectedLocation);
    } catch (error) {
      if (error.code === 'LOCATION_PERMISSION_DENIED') {
        showPermissionRecovery('Location permission needed', error.message);
      } else {
        Alert.alert('Could not detect location', error.message);
      }
    } finally {
      setDetecting(false);
    }
  };
  return (
    <View style={[pageStyles.page, { backgroundColor: palette.background }]}>
      <ScreenHeader
        navigation={navigation}
        title="Choose location"
        subtitle="Find businesses serving your area"
      />
      <ScrollView contentContainerStyle={pageStyles.content}>
        <FadeInView>
          <PressableScale onPress={detect} disabled={detecting}>
            <View
              style={[
                stylesLocation.detect,
                { backgroundColor: palette.primarySoft, borderColor: palette.primary },
              ]}
            >
              {detecting ? (
                <ActivityIndicator color={palette.primary} />
              ) : (
                <MapPin size={20} color={palette.primary} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={[pageStyles.title, { color: palette.text }]}>
                  Use my current location
                </Text>
                <Text style={[pageStyles.body, { color: palette.text2 }]}>
                  Detect your city automatically
                </Text>
              </View>
            </View>
          </PressableScale>
        </FadeInView>
        {ukCities.map((city, index) => (
          <FadeInView key={city} delay={0} duration={0} distance={0}>
            <PressableScale onPress={() => choose(city)}>
              <View
                style={[
                  pageStyles.card,
                  pageStyles.row,
                  {
                    backgroundColor: palette.surface,
                    borderColor: selected === city ? palette.primary : palette.border,
                  },
                ]}
              >
                <MapPin size={18} color={selected === city ? palette.primary : palette.muted} />
                <Text style={[pageStyles.title, pageStyles.grow, { color: palette.text }]}>
                  {city}
                </Text>
                {selected === city && (
                  <Animated.View
                    entering={ZoomIn.springify().damping(12)}
                    style={[stylesLocation.check, { backgroundColor: palette.primary }]}
                  >
                    <Check size={13} color={palette.background} />
                  </Animated.View>
                )}
              </View>
            </PressableScale>
          </FadeInView>
        ))}
      </ScrollView>
    </View>
  );
}

const stylesLocation = StyleSheet.create({
  detect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  check: {
    width: 25,
    height: 25,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export function NotificationsScreen({ navigation }) {
  const { notifications, markAllNotificationsRead } = useAppState();
  const { palette } = useChodhiQTheme();
  const [clearing, setClearing] = useState(false);
  const unread = notifications.filter((item) => !item.read);
  const clearAll = async () => {
    if (clearing) return;
    setClearing(true);
    try {
      await markAllNotificationsRead();
    } catch {
      Alert.alert('Could not clear notifications', 'Please check your connection and try again.');
    } finally {
      setClearing(false);
    }
  };
  return (
    <View style={[pageStyles.page, { backgroundColor: palette.background }]}>
      <ScreenHeader
        navigation={navigation}
        title="Notifications"
        right={
          <TouchableOpacity
            style={{ minHeight: 44, justifyContent: 'center' }}
            accessibilityRole="button"
            accessibilityLabel="Mark all notifications read and clear the list"
            disabled={clearing || !unread.length}
            onPress={clearAll}
          >
            <Text style={{ color: palette.primary, fontSize: 12 }}>
              {clearing ? 'Clearing…' : 'Read all'}
            </Text>
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={pageStyles.content}>
        {!unread.length && <Text style={{ color: palette.text2 }}>You're all caught up.</Text>}
        {unread.map((item) => (
          <TouchableOpacity
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={item.communityPostId ? `Open ${item.title}` : item.title}
            disabled={!item.communityPostId}
            onPress={() => navigation.navigate('Community', { postId: item.communityPostId })}
            style={[
              pageStyles.card,
              pageStyles.row,
              {
                backgroundColor: palette.surface,
                borderColor: !item.read ? palette.primary : palette.border,
              },
            ]}
          >
            <Bell size={18} color={item.read ? palette.muted : palette.primary} />
            <View style={pageStyles.grow}>
              <Text style={[pageStyles.title, { color: palette.text }]}>{item.title}</Text>
              <Text style={[pageStyles.body, { color: palette.text2 }]}>{item.body}</Text>
              <Text style={[pageStyles.muted, { color: palette.muted }]}>{item.time}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

export function QuoteRequestsScreen({ navigation }) {
  const { quoteRequests } = useAppState();
  const { palette } = useChodhiQTheme();
  return (
    <View style={[pageStyles.page, { backgroundColor: palette.background }]}>
      <ScreenHeader
        navigation={navigation}
        title="Quote requests"
        subtitle="Track businesses you contacted"
      />
      <ScrollView contentContainerStyle={pageStyles.content}>
        {!quoteRequests.length ? (
          <View style={pageStyles.empty}>
            <MessageCircle size={34} color={palette.text2} />
            <Text style={[pageStyles.title, { color: palette.text }]}>No quote requests yet</Text>
            <Text style={[pageStyles.body, { textAlign: 'center', color: palette.text2 }]}>
              Open a provider and request a quote to track it here.
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              style={[pageStyles.button, { backgroundColor: palette.primary }]}
              onPress={() => navigation.navigate('MainTabs', { screen: 'Explore' })}
            >
              <Text style={{ color: palette.onPrimary, fontWeight: '700' }}>Find a business</Text>
            </TouchableOpacity>
          </View>
        ) : (
          quoteRequests.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                pageStyles.card,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ]}
              onPress={() => navigation.navigate('ProviderDetail', { id: item.providerId })}
            >
              <View style={pageStyles.row}>
                <View style={pageStyles.grow}>
                  <Text style={[pageStyles.title, { color: palette.text }]}>
                    {item.providerName}
                  </Text>
                  <Text style={[pageStyles.body, { color: palette.text2 }]} numberOfLines={2}>
                    {item.message}
                  </Text>
                  {item.responseMessage ? (
                    <View
                      style={{
                        marginTop: 10,
                        padding: 10,
                        borderRadius: 10,
                        backgroundColor: palette.primarySoft,
                      }}
                    >
                      <Text style={{ color: palette.primary, fontSize: 10, fontWeight: '900' }}>
                        BUSINESS RESPONSE
                      </Text>
                      <Text style={[pageStyles.body, { color: palette.text }]}>
                        {item.responseMessage}
                      </Text>
                    </View>
                  ) : null}
                  <Text style={[pageStyles.muted, { color: palette.muted }]}>{item.createdAt}</Text>
                </View>
                <Text
                  style={[
                    pageStyles.badge,
                    { backgroundColor: palette.primarySoft, color: palette.primary },
                  ]}
                >
                  {item.status}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

export function BookingsScreen({ navigation }) {
  const { bookings, cancelBooking } = useAppState();
  const { palette } = useChodhiQTheme();
  const [bookingTab, setBookingTab] = useState('Upcoming');
  const now = Date.now();
  const timestamp = (item) =>
    new Date(`${item.requestedDate}T${item.requestedTime || '00:00'}:00`).getTime();
  const isUpcoming = (item) =>
    !['completed', 'cancelled', 'declined'].includes(item.status) && timestamp(item) >= now;
  const visibleBookings = bookings
    .filter((item) => (bookingTab === 'Upcoming' ? isUpcoming(item) : !isUpcoming(item)))
    .sort((a, b) =>
      bookingTab === 'Upcoming' ? timestamp(a) - timestamp(b) : timestamp(b) - timestamp(a),
    );
  const cancel = (item) =>
    Alert.alert(
      'Cancel booking?',
      'The business will be notified that you no longer need this time.',
      [
        { text: 'Keep booking' },
        {
          text: 'Cancel booking',
          style: 'destructive',
          onPress: () =>
            cancelBooking(item.id).catch((error) => Alert.alert('Could not cancel', error.message)),
        },
      ],
    );
  return (
    <View style={[pageStyles.page, { backgroundColor: palette.background }]}>
      <ScreenHeader
        navigation={navigation}
        title="My bookings"
        subtitle="Track requested and confirmed appointments"
      />
      <View style={[pageStyles.row, { paddingHorizontal: spacing.lg, gap: spacing.sm }]}>
        {['Upcoming', 'Past'].map((tab) => (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ selected: bookingTab === tab }}
            key={tab}
            onPress={() => setBookingTab(tab)}
            style={[
              pageStyles.tab,
              {
                backgroundColor: bookingTab === tab ? palette.primarySoft : palette.surface,
                borderColor: bookingTab === tab ? palette.primary : palette.border,
              },
            ]}
          >
            <Text style={{ color: bookingTab === tab ? palette.primary : palette.text2 }}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView contentContainerStyle={pageStyles.content}>
        {!visibleBookings.length ? (
          <View style={pageStyles.empty}>
            <CalendarDays size={34} color={palette.muted} />
            <Text style={[pageStyles.title, { color: palette.text }]}>
              {bookings.length ? `No ${bookingTab.toLowerCase()} bookings` : 'No bookings yet'}
            </Text>
            <Text style={[pageStyles.body, { color: palette.text2, textAlign: 'center' }]}>
              Open a provider and select Book to request an appointment.
            </Text>
          </View>
        ) : (
          visibleBookings.map((item) => (
            <View
              key={item.id}
              style={[
                pageStyles.card,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ]}
            >
              <View style={pageStyles.row}>
                <CalendarDays size={21} color={palette.primary} />
                <View style={pageStyles.grow}>
                  <Text style={[pageStyles.title, { color: palette.text }]}>
                    {item.providerName}
                  </Text>
                  <Text style={[pageStyles.body, { color: palette.text2 }]}>
                    {item.serviceName} · {item.requestedDate} at {item.requestedTime}
                  </Text>
                </View>
                <Text
                  style={[
                    pageStyles.badge,
                    { backgroundColor: palette.primarySoft, color: palette.primary },
                  ]}
                >
                  {item.status}
                </Text>
              </View>
              {item.providerMessage ? (
                <Text style={[pageStyles.body, { color: palette.text, marginTop: 10 }]}>
                  {item.providerMessage}
                </Text>
              ) : null}
              {['pending', 'confirmed'].includes(item.status) && (
                <TouchableOpacity
                  onPress={() => cancel(item)}
                  style={{ alignSelf: 'flex-start', marginTop: 12 }}
                >
                  <Text style={{ color: colors.accentHalal, fontWeight: '800' }}>
                    Cancel booking
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

export function ReviewsScreen({ navigation, route }) {
  const { providers, reviews, addReview, editReview, removeReview, session } = useAppState();
  const providerId = route.params?.providerId;
  const provider = providers.find((p) => p.id === providerId);
  const { palette } = useChodhiQTheme();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [editingId, setEditingId] = useState(null);
  const ownProviderReview = reviews.find(
    (item) => item.providerId === providerId && item.userId === session?.user?.id,
  );
  const visibleReviews = reviews.filter(
    (item) => item.userId === session?.user?.id && (!providerId || item.providerId === providerId),
  );
  useEffect(() => {
    if (!ownProviderReview) return;
    setEditingId(ownProviderReview.id);
    setRating(ownProviderReview.rating);
    setComment(ownProviderReview.comment || ownProviderReview.text || '');
  }, [ownProviderReview?.id]);
  const submit = async () => {
    if (!comment.trim())
      return Alert.alert('Add a review', 'Tell the community about your experience.');
    try {
      if (editingId) {
        await editReview(editingId, { rating, comment: comment.trim() });
        Alert.alert('Review updated', 'Your review has been saved.');
      } else {
        await addReview({
          providerId,
          providerName: provider?.name || 'Provider',
          rating,
          comment: comment.trim(),
        });
        Alert.alert('Thank you', 'Your review has been added.');
      }
      setComment('');
    } catch (error) {
      Alert.alert(
        editingId ? 'Could not update review' : 'Could not publish review',
        error.message,
      );
    }
  };
  const saveEdit = async (item) => {
    if (!comment.trim())
      return Alert.alert('Add a review', 'Tell the community about your experience.');
    try {
      await editReview(item.id, { rating, comment: comment.trim() });
      setEditingId(null);
      setComment('');
      Alert.alert('Review updated', 'Your review has been saved.');
    } catch (error) {
      Alert.alert('Could not update review', error.message);
    }
  };
  const confirmDelete = (item) =>
    Alert.alert('Delete review?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeReview(item.id);
          } catch (error) {
            Alert.alert('Could not delete review', error.message);
          }
        },
      },
    ]);
  return (
    <View style={[pageStyles.page, { backgroundColor: palette.background }]}>
      <ScreenHeader navigation={navigation} title={provider ? 'Write a review' : 'My reviews'} />
      <ScrollView contentContainerStyle={pageStyles.content}>
        {provider && (
          <View
            style={[
              pageStyles.card,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <Text style={[pageStyles.title, { color: palette.text }]}>{provider.name}</Text>
            <View style={[pageStyles.row, { marginVertical: spacing.md }]}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`${n} star${n === 1 ? '' : 's'}`}
                  accessibilityState={{ selected: n === rating }}
                  key={n}
                  onPress={() => setRating(n)}
                >
                  <Star size={28} color={colors.star} fill={n <= rating ? colors.star : 'none'} />
                </TouchableOpacity>
              ))}
            </View>
            <AppTextInput
              accessibilityLabel="Review"
              style={[pageStyles.input, { minHeight: 100, textAlignVertical: 'top' }]}
              multiline
              value={comment}
              onChangeText={setComment}
              placeholder="How was your experience?"
              placeholderTextColor={colors.textMuted}
            />
            <TouchableOpacity
              style={[pageStyles.button, { marginTop: spacing.md }]}
              onPress={submit}
            >
              <Text style={pageStyles.buttonText}>
                {editingId ? 'Save changes' : 'Publish review'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        {visibleReviews.map((item) => (
          <View key={item.id} style={pageStyles.card}>
            {editingId === item.id ? (
              <>
                <AppTextInput
                  accessibilityLabel="Edit review"
                  style={[pageStyles.input, { minHeight: 90, textAlignVertical: 'top' }]}
                  multiline
                  value={comment}
                  onChangeText={setComment}
                />
                <TouchableOpacity
                  style={[pageStyles.button, { marginTop: spacing.sm }]}
                  onPress={() => saveEdit(item)}
                >
                  <Text style={pageStyles.buttonText}>Save changes</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setEditingId(null);
                    setComment('');
                  }}
                >
                  <Text style={[pageStyles.muted, { marginTop: spacing.sm }]}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={pageStyles.row}>
                  <Text style={[pageStyles.title, pageStyles.grow]}>{item.providerName}</Text>
                  <Text style={{ color: colors.star }}>★ {item.rating}</Text>
                </View>
                <Text style={[pageStyles.body, { color: palette.text2 }]}>{item.comment}</Text>
                <Text style={pageStyles.muted}>{item.createdAt}</Text>
                {item.userId && (
                  <View style={[pageStyles.row, { marginTop: spacing.sm }]}>
                    <TouchableOpacity
                      onPress={() => {
                        setEditingId(item.id);
                        setRating(item.rating);
                        setComment(item.comment || item.text || '');
                      }}
                    >
                      <Text style={pageStyles.link}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => confirmDelete(item)}>
                      <Text style={[pageStyles.link, { color: colors.danger }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        ))}
        {!provider && !reviews.length && (
          <View style={pageStyles.empty}>
            <Star size={34} color={palette.text2} />
            <Text style={[pageStyles.title, { color: palette.text }]}>No reviews yet</Text>
            <Text style={[pageStyles.body, { color: palette.text2 }]}>
              Reviews you publish will appear here.
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              style={[pageStyles.button, { backgroundColor: palette.primary }]}
              onPress={() => navigation.navigate('MainTabs', { screen: 'Explore' })}
            >
              <Text style={{ color: palette.onPrimary, fontWeight: '700' }}>Browse providers</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

export function EditProfileScreen({ navigation }) {
  const { profile, saveProfile } = useAppState();
  const [draft, setDraft] = useState(profile);
  const { palette } = useChodhiQTheme();
  const save = async () => {
    await saveProfile(draft);
    navigation.goBack();
  };
  return (
    <View style={[pageStyles.page, { backgroundColor: palette.background }]}>
      <ScreenHeader navigation={navigation} title="Edit profile" />
      <ScrollView contentContainerStyle={pageStyles.content}>
        {[
          ['Name', 'name'],
          ['Email', 'email'],
          ['Phone', 'phone'],
        ].map(([label, key]) => (
          <View key={key}>
            <Text style={[pageStyles.label, { color: palette.text2 }]}>{label}</Text>
            <AppTextInput
              accessibilityLabel={label}
              style={[
                pageStyles.input,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                  color: palette.text,
                },
              ]}
              value={draft[key]}
              onChangeText={(value) => setDraft((p) => ({ ...p, [key]: value }))}
              keyboardType={
                key === 'email' ? 'email-address' : key === 'phone' ? 'phone-pad' : 'default'
              }
            />
          </View>
        ))}
        <TouchableOpacity
          style={[pageStyles.button, { backgroundColor: palette.primary }]}
          onPress={save}
        >
          <Text style={[pageStyles.buttonText, { color: palette.dark ? '#081B2C' : '#FFFFFF' }]}>
            Save changes
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

export function SettingsScreen({ navigation }) {
  const { preferences, setPreferences } = useAppState();
  const { palette, mode, setMode } = useChodhiQTheme();
  return (
    <View style={[pageStyles.page, { backgroundColor: palette.background }]}>
      <ScreenHeader navigation={navigation} title="Settings" />
      <ScrollView contentContainerStyle={pageStyles.content}>
        <Text style={[pageStyles.label, { color: palette.text2 }]}>Appearance</Text>
        <View
          style={[
            pageStyles.card,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <TouchableOpacity
            accessibilityRole="switch"
            accessibilityState={{ checked: mode === 'dark' }}
            accessibilityLabel="Toggle dark mode"
            onPress={() => setMode(mode === 'dark' ? 'fresh' : 'dark')}
            style={[
              pageStyles.row,
              { height: 48, justifyContent: 'space-between', paddingHorizontal: 4 },
            ]}
          >
            <Text style={[pageStyles.title, { color: palette.text }]}>Light</Text>
            <Switch
              accessibilityLabel="Dark mode"
              value={mode === 'dark'}
              onValueChange={(enabled) => setMode(enabled ? 'dark' : 'fresh')}
              trackColor={{ false: palette.border, true: palette.primaryTint }}
              thumbColor={palette.primary}
              pointerEvents="none"
            />
            <Text style={[pageStyles.title, { color: palette.text }]}>Dark</Text>
          </TouchableOpacity>
        </View>
        <Text style={[pageStyles.label, { color: palette.text2 }]}>Communication</Text>
        {[
          ['push', 'Push notifications'],
          ['vibration', 'Notification vibration'],
          ['email', 'Email updates'],
          ['marketing', 'Tips and offers'],
        ].map(([key, label]) => (
          <View
            key={key}
            style={[
              pageStyles.card,
              pageStyles.row,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <Text style={[pageStyles.title, pageStyles.grow, { color: palette.text }]}>
              {label}
            </Text>
            <Switch
              accessibilityLabel={label}
              value={preferences[key]}
              onValueChange={(value) => setPreferences((p) => ({ ...p, [key]: value }))}
              trackColor={{ false: palette.surfaceAlt, true: palette.goldSoft }}
              thumbColor={preferences[key] ? palette.saffron : palette.muted}
            />
          </View>
        ))}
        {Platform.OS !== 'web' && preferences.push && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open device notification settings"
            onPress={openPermissionSettings}
            style={[
              pageStyles.card,
              pageStyles.row,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <Text style={[pageStyles.title, { color: palette.text }]}>
              Notifications denied? Open device settings
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          accessibilityRole="button"
          style={[
            pageStyles.card,
            pageStyles.row,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
          onPress={() => navigation.navigate('Privacy')}
        >
          <ShieldCheck size={18} color={palette.primary} />
          <Text style={[pageStyles.title, pageStyles.grow, { color: palette.text }]}>
            Privacy & your data
          </Text>
          <ChevronRight size={17} color={palette.muted} />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          style={[
            pageStyles.card,
            pageStyles.row,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
          onPress={() => navigation.navigate('Help')}
        >
          <CircleHelp size={18} color={palette.indigo} />
          <Text style={[pageStyles.title, pageStyles.grow, { color: palette.text }]}>
            Help & support
          </Text>
          <ChevronRight size={17} color={palette.muted} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

export function HelpScreen({ navigation }) {
  const { palette } = useChodhiQTheme();
  const card = [pageStyles.card, { backgroundColor: palette.surface, borderColor: palette.border }];
  return (
    <View style={[pageStyles.page, { backgroundColor: palette.background }]}>
      <ScreenHeader navigation={navigation} title="Help & support" />
      <ScrollView contentContainerStyle={pageStyles.content}>
        <View style={card}>
          <Text style={[pageStyles.title, { color: palette.text }]}>
            How do quote requests work?
          </Text>
          <Text style={[pageStyles.body, { color: palette.text2 }]}>
            ChodhiQ opens WhatsApp with your message and records the request locally so you can keep
            track of who you contacted.
          </Text>
        </View>
        <View style={card}>
          <Text style={[pageStyles.title, { color: palette.text }]}>
            How are businesses verified?
          </Text>
          <Text style={[pageStyles.body, { color: palette.text2 }]}>
            Verified badges are intended for businesses whose identity and registration have been
            reviewed.
          </Text>
        </View>
        <TouchableOpacity
          style={[pageStyles.button, { backgroundColor: palette.primary }]}
          onPress={() =>
            Linking.openURL(
              `mailto:${brand.supportEmail}?subject=${encodeURIComponent(`${brand.name} support request`)}`,
            ).catch(() => Alert.alert('Support', `Email ${brand.supportEmail}`))
          }
        >
          <Text style={[pageStyles.buttonText, { color: palette.dark ? '#081B2C' : '#FFFFFF' }]}>
            Contact support
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

export function BecomeProviderScreen({ navigation }) {
  const { palette } = useChodhiQTheme();
  return (
    <View style={[pageStyles.page, { backgroundColor: palette.background }]}>
      <ScreenHeader
        navigation={navigation}
        title="Grow your business"
        subtitle="Join the ChodhiQ community"
      />
      <View style={pageStyles.content}>
        <Text style={[pageStyles.title, { color: palette.text }]}>
          Help local customers find your services
        </Text>
        <Text style={[pageStyles.body, { color: palette.text2 }]}>
          Build a business listing, describe what you offer and submit ownership evidence for
          review. Claim an existing listing or create a new one through the business setup flow.
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          style={[pageStyles.button, { backgroundColor: palette.primary }]}
          onPress={() => navigation.replace('ClaimListing')}
        >
          <Text style={{ color: palette.onPrimary, fontWeight: '700' }}>Set up my business</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export const accountMenu = [
  { icon: UserRound, label: 'Edit profile', route: 'EditProfile', group: 'account' },
  { icon: Bell, label: 'Notifications', route: 'Notifications', group: 'account' },
  { icon: MapPin, label: 'Location', route: 'Location', group: 'account' },
  { icon: FileText, label: 'Settings', route: 'Settings', group: 'account' },
  { icon: Star, label: 'My reviews', route: 'Reviews', group: 'community', accent: '#E97362' },
  {
    icon: MessageCircle,
    label: 'Quote requests',
    route: 'QuoteRequests',
    group: 'community',
    accent: '#8A76D5',
  },
  {
    icon: CalendarDays,
    label: 'My bookings',
    route: 'Bookings',
    group: 'community',
    accent: '#D98A48',
  },
  {
    icon: BriefcaseBusiness,
    label: 'Claim listing / Create new',
    route: 'ClaimListing',
    group: 'community',
    accent: '#7056C9',
  },
];
