import ScrollView from '../components/KeyboardAwareScrollView';
import { AppAlert as Alert } from '../components/AppDialog';
import { MotionTouchable as TouchableOpacity } from '../components/Motion';
import React, { useState } from 'react';
import AppTextInput from '../components/AppTextInput';
import { Linking, Share, StyleSheet, View } from 'react-native';

import Text from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Database, Download, FileLock2, Trash2 } from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import { useAppState } from '../context/AppStateContext';
import { useChodhiQTheme } from '../context/ThemeContext';
import { exportCurrentAccount } from '../data/accountRepository';
import { radius, spacing } from '../theme/theme';
import { useAdvertisingConsent } from '../hooks/useAdvertisingConsent';
import { legalLinks } from '../config/legal';
import { features } from '../config/features';

export default function PrivacyScreen({ navigation }) {
  const { session, deleteAccount } = useAppState();
  const { palette } = useChodhiQTheme();
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const {
    allowed: advertisingAllowed,
    loaded: consentLoaded,
    error: consentError,
    manageChoices,
  } = useAdvertisingConsent();
  const exportData = async () => {
    if (!session) return navigation.navigate('Welcome');
    setBusy(true);
    try {
      const data = await exportCurrentAccount(session.user.id);
      await Share.share({
        title: 'My ChodhiQ data export',
        message: JSON.stringify(data, null, 2),
      });
    } catch (error) {
      Alert.alert('Export unavailable', error.message);
    } finally {
      setBusy(false);
    }
  };
  const remove = () => {
    if (confirmation !== 'DELETE')
      return Alert.alert(
        'Confirmation required',
        'Type DELETE exactly to permanently remove your account.',
      );
    Alert.alert(
      'Permanently delete account?',
      'Your profile, saved providers, bookings, reviews, claims, community posts and uploaded photos will be deleted. Some records may be retained where the published policy or law requires it. This cannot be undone.',
      [
        { text: 'Keep account', style: 'cancel' },
        {
          text: 'Delete permanently',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await deleteAccount();
              navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
            } catch (error) {
              if (error.message?.startsWith('Account deleted,')) {
                Alert.alert('Account deleted', error.message);
                navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
              } else {
                Alert.alert('Deletion failed', error.message);
              }
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };
  const card = { backgroundColor: palette.surface, borderColor: palette.border };
  return (
    <SafeAreaView style={[styles.page, { backgroundColor: palette.background }]}>
      <ScreenHeader navigation={navigation} title="Privacy & your data" />
      <ScrollView contentContainerStyle={styles.content}>
        {legalLinks.privacy ? (
          <TouchableOpacity
            accessibilityRole="link"
            style={[
              styles.action,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
            onPress={() => void Linking.openURL(legalLinks.privacy)}
          >
            <Text style={[styles.actionText, { color: palette.primary }]}>Read privacy policy</Text>
          </TouchableOpacity>
        ) : null}
        {legalLinks.terms ? (
          <TouchableOpacity
            accessibilityRole="link"
            style={[
              styles.action,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
            onPress={() => void Linking.openURL(legalLinks.terms)}
          >
            <Text style={[styles.actionText, { color: palette.primary }]}>
              Read terms of service
            </Text>
          </TouchableOpacity>
        ) : null}
        {legalLinks.deletion ? (
          <TouchableOpacity
            accessibilityRole="link"
            style={[
              styles.action,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
            onPress={() => void Linking.openURL(legalLinks.deletion)}
          >
            <Text style={[styles.actionText, { color: palette.primary }]}>
              Account deletion information
            </Text>
          </TouchableOpacity>
        ) : null}
        <View style={[styles.card, card]}>
          <FileLock2 color={palette.primary} />
          <View style={styles.grow}>
            <Text style={[styles.title, { color: palette.text }]}>How ChodhiQ uses data</Text>
            <Text style={[styles.body, { color: palette.text2 }]}>
              Profile and location details support account and discovery features. Push tokens
              deliver opted-in alerts. Verification documents are private and used only to review
              business ownership. Community posts and photos are shared with people who can access
              the relevant space. Approved sponsored cards use anonymous session events for delivery
              counts.
            </Text>
          </View>
        </View>
        {features.googleAds ? (
          <View style={[styles.card, card]}>
            <FileLock2 color={palette.primary} />
            <View style={styles.grow}>
              <Text style={[styles.title, { color: palette.text }]}>Advertising choice</Text>
              <Text style={[styles.body, { color: palette.text2 }]}>
                Google advertising is disabled until you opt in. If enabled, ChodhiQ requests
                non-personalised ads only. Google may still process device identifiers and network
                information to deliver, limit and measure ads. You can withdraw permission here at
                any time.
              </Text>
              <TouchableOpacity
                accessibilityRole="switch"
                accessibilityState={{ checked: advertisingAllowed, disabled: !consentLoaded }}
                disabled={!consentLoaded}
                onPress={manageChoices}
                style={[
                  styles.consent,
                  { backgroundColor: advertisingAllowed ? palette.primary : palette.surfaceAlt },
                ]}
              >
                <Text
                  style={{
                    color: advertisingAllowed ? '#FFFFFF' : palette.text,
                    fontWeight: '800',
                  }}
                >
                  Manage Google privacy choices
                </Text>
              </TouchableOpacity>
              {consentError ? (
                <Text style={[styles.body, { color: palette.coral }]}>{consentError}</Text>
              ) : null}
            </View>
          </View>
        ) : null}
        <View style={[styles.card, card]}>
          <Database color={palette.indigo} />
          <View style={styles.grow}>
            <Text style={[styles.title, { color: palette.text }]}>Retention</Text>
            <Text style={[styles.body, { color: palette.text2 }]}>
              Account records remain while your account is active. Expired claim drafts close after
              24 hours. Account deletion removes account-linked product records and uploaded
              community or verification media, subject to lawful retention.
            </Text>
          </View>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Export my ChodhiQ account data"
          disabled={busy}
          style={[styles.action, card]}
          onPress={exportData}
        >
          <Download color={palette.primary} />
          <Text style={[styles.actionText, { color: palette.text }]}>
            {busy ? 'Preparing…' : 'Export my data'}
          </Text>
        </TouchableOpacity>
        {session ? (
          <View style={[styles.danger, { borderColor: palette.coral }]}>
            <Trash2 color={palette.coral} />
            <Text style={[styles.title, { color: palette.text }]}>Delete account permanently</Text>
            <Text style={[styles.body, { color: palette.text2 }]}>
              Type DELETE to enable permanent deletion.
            </Text>
            <AppTextInput
              accessibilityLabel="Type DELETE to confirm account deletion"
              autoCapitalize="characters"
              value={confirmation}
              onChangeText={setConfirmation}
              style={[
                styles.input,
                {
                  color: palette.text,
                  borderColor: palette.border,
                  backgroundColor: palette.surface,
                },
              ]}
            />
            <TouchableOpacity
              accessibilityRole="button"
              disabled={busy || confirmation !== 'DELETE'}
              onPress={remove}
              style={[
                styles.delete,
                {
                  backgroundColor: palette.coral,
                  opacity: busy || confirmation !== 'DELETE' ? 0.45 : 1,
                },
              ]}
            >
              <Text style={styles.deleteText}>{busy ? 'Deleting…' : 'Delete my account'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={[styles.body, { color: palette.text2 }]}>
            Sign in to export or delete account data.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    padding: spacing.lg,
    paddingBottom: 60,
    gap: spacing.md,
  },
  card: { flexDirection: 'row', gap: 12, borderWidth: 1, borderRadius: radius.lg, padding: 16 },
  grow: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, fontWeight: '900' },
  body: { fontSize: 13, lineHeight: 20, marginTop: 5 },
  action: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
  },
  actionText: { fontSize: 15, fontWeight: '800' },
  consent: {
    marginTop: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    paddingHorizontal: 14,
  },
  danger: { gap: 10, borderWidth: 1, borderRadius: radius.lg, padding: 16 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  delete: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  deleteText: { color: '#FFFFFF', fontWeight: '900' },
});
