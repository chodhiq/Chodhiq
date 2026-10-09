import ScrollView from '../components/KeyboardAwareScrollView';
import { AppAlert as Alert } from '../components/AppDialog';
import { MotionTouchable as TouchableOpacity } from '../components/Motion';
import React, { useEffect, useMemo, useState } from 'react';
import AppTextInput from '../components/AppTextInput';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import Text from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  Clock3,
  FileUp,
  Search,
  Store,
} from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import { useAppState } from '../context/AppStateContext';
import { useChodhiQTheme } from '../context/ThemeContext';
import {
  claimProvider,
  createProvider,
  ensureVerificationDraft,
  listClaimableProviders,
  listProviderCategories,
  submitProviderVerification,
  uploadVerificationDocument,
} from '../data/claimRepository';
import { radius, spacing } from '../theme/theme';

export default function ClaimListingScreen({ navigation }) {
  const { session } = useAppState();
  const { palette } = useChodhiQTheme();
  const [mode, setMode] = useState('claim');
  const [showBenefits, setShowBenefits] = useState(false);
  const [query, setQuery] = useState('');
  const [listings, setListings] = useState([]),
    [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ businessName: '', city: '', postcode: '', categoryId: '' });
  const [provider, setProvider] = useState(null),
    [requestId, setRequestId] = useState('');
  const [documentType, setDocumentType] = useState('business_registration'),
    [document, setDocument] = useState(null),
    [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }
    Promise.all([listClaimableProviders(), listProviderCategories()])
      .then(([providers, values]) => {
        setListings(providers);
        setCategories(values);
        setForm((current) => ({ ...current, categoryId: values[0]?.id || '' }));
      })
      .catch((value) => setError(value.message))
      .finally(() => setLoading(false));
  }, [session]);
  const matches = useMemo(() => {
    const value = query.trim().toLowerCase();
    return listings.filter(
      (item) =>
        !value ||
        `${item.business_name} ${item.base_city || ''} ${item.base_postcode || ''}`
          .toLowerCase()
          .includes(value),
    );
  }, [listings, query]);
  async function chooseListing(item) {
    setBusy(true);
    setError('');
    try {
      const claim = await claimProvider(item.id);
      setRequestId(claim.request_id);
      setProvider({
        id: claim.provider_id,
        business_name: claim.business_name || item.business_name,
      });
    } catch (value) {
      setError(value.message);
    } finally {
      setBusy(false);
    }
  }
  async function createNew() {
    if (!form.businessName.trim() || !form.city.trim() || !form.categoryId)
      return setError('Business name, city and category are required.');
    setBusy(true);
    setError('');
    try {
      setProvider(await createProvider(session.user.id, form));
    } catch (value) {
      setError(value.message);
    } finally {
      setBusy(false);
    }
  }
  async function pickDocument() {
    setBusy(true);
    setError('');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const draftId =
        requestId || (await ensureVerificationDraft(provider.id, session.user.id, notes));
      setRequestId(draftId);
      const uploaded = await uploadVerificationDocument({
        providerId: provider.id,
        requestId: draftId,
        userId: session.user.id,
        documentType,
        asset: result.assets[0],
      });
      setDocument(uploaded);
    } catch (value) {
      setError(value.message);
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    if (!document) return setError('Upload a PDF or image before submitting verification.');
    setBusy(true);
    setError('');
    try {
      await submitProviderVerification(provider.id, notes);
      Alert.alert(
        'Submitted',
        'Your listing is claimed and the verification team will review your document.',
      );
      navigation.goBack();
    } catch (value) {
      setError(value.message);
    } finally {
      setBusy(false);
    }
  }
  const card = { backgroundColor: palette.surface, borderColor: palette.border };
  if (!session)
    return (
      <SafeAreaView
        style={[styles.page, { backgroundColor: palette.background }]}
        edges={['left', 'right', 'bottom']}
      >
        <ScreenHeader navigation={navigation} title="Claim a listing" />
        <View style={styles.center}>
          <Text style={{ color: palette.text }}>
            Sign in before claiming or creating a business listing.
          </Text>
          <TouchableOpacity
            style={[styles.primary, { backgroundColor: palette.primary }]}
            onPress={() => navigation.navigate('Welcome')}
          >
            <Text style={styles.primaryText}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  if (loading)
    return (
      <SafeAreaView style={[styles.page, styles.center, { backgroundColor: palette.background }]}>
        <ActivityIndicator color={palette.primary} />
        <Text style={{ color: palette.text2 }}>Loading available listings…</Text>
      </SafeAreaView>
    );
  return (
    <SafeAreaView
      style={[styles.page, { backgroundColor: palette.background }]}
      edges={['left', 'right', 'bottom']}
    >
      <ScreenHeader
        navigation={navigation}
        title={provider ? 'Verify your business' : 'Claim listing / Create new'}
        subtitle={provider ? provider.business_name : 'Set up your business workspace'}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {error ? (
          <View style={[styles.error, { borderColor: palette.coral }]}>
            <Text style={{ color: palette.coral }}>{error}</Text>
          </View>
        ) : null}
        {!provider ? (
          <>
            <View
              style={[
                styles.intro,
                { backgroundColor: palette.primarySoft, borderColor: palette.primary },
              ]}
            >
              <Text style={[styles.introTitle, { color: palette.text }]}>
                Become a ChodhiQ provider
              </Text>
              <Text style={[styles.introBody, { color: palette.text2 }]}>
                Build a trusted business profile, appear in local discovery and receive enquiries
                directly from the community.
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={{ expanded: showBenefits }}
                onPress={() => setShowBenefits((value) => !value)}
                style={{ paddingVertical: 12 }}
              >
                <Text style={{ color: palette.primary, fontWeight: '800' }}>
                  {showBenefits ? 'Hide joining details' : 'Why join? Benefits and what you need'}
                </Text>
              </TouchableOpacity>
              {showBenefits && (
                <View style={styles.infoGrid}>
                  <Info
                    Icon={Store}
                    title="Be discovered"
                    body="Show your services, location and contact details."
                    palette={palette}
                  />
                  <Info
                    Icon={BadgeCheck}
                    title="Build trust"
                    body="Submit ownership evidence for verification."
                    palette={palette}
                  />
                  <Info
                    Icon={Clock3}
                    title="A clear review process"
                    body="Claim or create your listing, then submit ownership evidence for administrator review. Verification is granted after approval."
                    palette={palette}
                  />
                  <Info
                    Icon={Building2}
                    title="A profile that represents your business"
                    body="Describe your services, display your business name and service area, and help customers decide whether you are the right fit."
                    palette={palette}
                  />
                  <Info
                    Icon={CheckCircle2}
                    title="Turn interest into conversations"
                    body="Customers can discover your listing and send enquiries or quote requests. Availability and customer demand determine results."
                    palette={palette}
                  />
                  <Info
                    Icon={FileUp}
                    title="Have these details ready"
                    body="Business name, service category, city and postcode. Prepare a PDF, JPEG or PNG showing your right to manage the business, such as registration evidence. Contact details and services can be completed on your profile."
                    palette={palette}
                  />
                  <Text style={{ color: palette.text2, lineHeight: 21 }}>
                    Listing verification and business-dashboard access are separate review
                    processes. Business-dashboard applications require trading evidence and contact
                    details; access stays locked until approval. A verified listing does not
                    guarantee bookings.
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.stepLabel, { color: palette.text2 }]}>1 CHOOSE HOW TO JOIN</Text>
            <View style={[styles.tabs, card]}>
              <TouchableOpacity
                style={[styles.tab, mode === 'claim' && { backgroundColor: palette.primary }]}
                onPress={() => setMode('claim')}
              >
                <Text
                  style={[styles.tabTitle, { color: mode === 'claim' ? '#fff' : palette.text }]}
                >
                  Claim existing
                </Text>
                <Text
                  style={[
                    styles.tabHint,
                    { color: mode === 'claim' ? 'rgba(255,255,255,.8)' : palette.text2 },
                  ]}
                >
                  My business is listed
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, mode === 'create' && { backgroundColor: palette.primary }]}
                onPress={() => setMode('create')}
              >
                <Text
                  style={[styles.tabTitle, { color: mode === 'create' ? '#fff' : palette.text }]}
                >
                  Create new
                </Text>
                <Text
                  style={[
                    styles.tabHint,
                    { color: mode === 'create' ? 'rgba(255,255,255,.8)' : palette.text2 },
                  ]}
                >
                  Add a new business
                </Text>
              </TouchableOpacity>
            </View>
            {mode === 'claim' ? (
              <>
                <View style={[styles.search, card]}>
                  <Search size={18} color={palette.muted} />
                  <AppTextInput
                    style={[styles.grow, { color: palette.text }]}
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Business, city or postcode"
                    placeholderTextColor={palette.muted}
                  />
                </View>
                <Text style={{ color: palette.text2, marginVertical: 10 }}>
                  {query.trim()
                    ? matches.length
                      ? 'Choose your business from the results below.'
                      : 'No matching listing. Try another city or postcode, or choose Create new.'
                    : 'Search for your business name, city or postcode. If it is already listed, claim it to avoid creating a duplicate.'}
                </Text>
                {matches.map((item) => (
                  <TouchableOpacity
                    disabled={busy}
                    key={item.id}
                    style={[styles.card, card]}
                    onPress={() => chooseListing(item)}
                  >
                    <Building2 size={21} color={palette.primary} />
                    <View style={styles.grow}>
                      <Text style={[styles.title, { color: palette.text }]}>
                        {item.business_name}
                      </Text>
                      <Text style={{ color: palette.text2 }}>
                        {item.base_city}
                        {item.base_postcode ? ` · ${item.base_postcode}` : ''}
                      </Text>
                    </View>
                    <Text style={{ color: palette.primary, fontWeight: '800' }}>Claim</Text>
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <View style={[styles.card, styles.form, styles.createForm, card]}>
                {[
                  ['Business name', 'businessName'],
                  ['Base city', 'city'],
                  ['Postcode', 'postcode'],
                ].map(([label, key]) => (
                  <View key={key} style={styles.formField}>
                    <Text style={[styles.label, { color: palette.text2 }]}>{label}</Text>
                    <AppTextInput
                      accessibilityLabel={label}
                      style={[styles.input, styles.formInput, card, { color: palette.text }]}
                      value={form[key]}
                      onChangeText={(value) => setForm((current) => ({ ...current, [key]: value }))}
                    />
                  </View>
                ))}
                <View style={styles.formField}>
                  <Text style={[styles.label, { color: palette.text2 }]}>Category</Text>
                  <View style={styles.categoryChoices}>
                    {categories.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.choice,
                          styles.categoryChoice,
                          { borderColor: palette.border },
                          form.categoryId === item.id && { backgroundColor: palette.primary },
                        ]}
                        onPress={() => setForm((current) => ({ ...current, categoryId: item.id }))}
                      >
                        <Text
                          style={[
                            styles.categoryText,
                            { color: form.categoryId === item.id ? '#fff' : palette.text },
                          ]}
                        >
                          {item.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <TouchableOpacity
                  disabled={busy}
                  style={[styles.primary, styles.formButton, { backgroundColor: palette.primary }]}
                  onPress={createNew}
                >
                  <Text style={styles.primaryText}>{busy ? 'Creating…' : 'Create workspace'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          <View style={[styles.card, styles.form, card]}>
            <Text style={[styles.title, { color: palette.text }]}>Ownership evidence</Text>
            <Text style={{ color: palette.text2 }}>
              Upload a Companies House document, licence, utility bill or other proof. PDF, JPG and
              PNG are accepted.
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[
                ['business_registration', 'Registration'],
                ['licence', 'Licence'],
                ['proof_of_address', 'Proof of address'],
                ['other', 'Other'],
              ].map(([value, label]) => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.choice,
                    { borderColor: palette.border },
                    documentType === value && { backgroundColor: palette.primary },
                  ]}
                  onPress={() => setDocumentType(value)}
                >
                  <Text style={{ color: documentType === value ? '#fff' : palette.text }}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <AppTextInput
              multiline
              style={[styles.input, styles.formInput, styles.notes, card, { color: palette.text }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional note for the verification team"
              placeholderTextColor={palette.muted}
            />
            <TouchableOpacity
              disabled={busy}
              style={[styles.upload, styles.formButton, { borderColor: palette.primary }]}
              onPress={pickDocument}
            >
              {document ? (
                <CheckCircle2 color={palette.primary} />
              ) : (
                <FileUp color={palette.primary} />
              )}
              <Text style={{ color: palette.primary, fontWeight: '800' }}>
                {document ? document.name : busy ? 'Uploading…' : 'Upload PDF or image'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={busy || !document}
              style={[
                styles.primary,
                styles.formButton,
                { backgroundColor: palette.primary, opacity: busy || !document ? 0.45 : 1 },
              ]}
              onPress={submit}
            >
              <Text style={styles.primaryText}>{busy ? 'Submitting…' : 'Submit verification'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Info({ Icon, title, body, palette }) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIcon, { backgroundColor: palette.surface }]}>
        <Icon size={17} color={palette.primary} />
      </View>
      <View style={styles.grow}>
        <Text style={[styles.infoTitle, { color: palette.text }]}>{title}</Text>
        <Text style={[styles.infoBody, { color: palette.text2 }]}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 80,
    gap: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  grow: { flex: 1 },
  intro: { borderWidth: 1, borderRadius: radius.xl, padding: 20 },
  introTitle: { fontSize: 22, lineHeight: 28, fontWeight: '900' },
  introBody: { fontSize: 13, lineHeight: 20, marginTop: 7 },
  infoGrid: { gap: 12, marginTop: 18 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitle: { fontSize: 13, fontWeight: '900' },
  infoBody: { fontSize: 11, lineHeight: 16, marginTop: 1 },
  stepLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1, marginTop: 4 },
  tabs: { flexDirection: 'row', borderWidth: 1, borderRadius: radius.lg, padding: 5, gap: 5 },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 62,
    paddingHorizontal: 8,
    borderRadius: radius.md,
  },
  tabTitle: { fontSize: 13, fontWeight: '900' },
  tabHint: { fontSize: 9, marginTop: 3 },
  search: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  // Forms also use the shared card style, so explicitly override its row layout.
  form: { flexDirection: 'column', alignItems: 'stretch', width: '100%' },
  createForm: { maxWidth: 680, alignSelf: 'center', padding: 20, gap: 18 },
  formField: { width: '100%', minWidth: 0 },
  categoryChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChoice: { marginRight: 0, maxWidth: '100%', minHeight: 44, justifyContent: 'center' },
  categoryText: { fontSize: 13, lineHeight: 18, flexShrink: 1 },
  formInput: { width: '100%' },
  formButton: { width: '100%', flex: 0 },
  title: { fontSize: 16, fontWeight: '800' },
  label: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 5 },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  notes: { minHeight: 100, textAlignVertical: 'top' },
  choice: {
    paddingVertical: 10,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderRadius: radius.pill,
    marginRight: 8,
  },
  primary: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  primaryText: { color: '#fff', fontWeight: '900' },
  upload: {
    minHeight: 82,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  error: { padding: spacing.md, borderWidth: 1, borderRadius: radius.md },
});
