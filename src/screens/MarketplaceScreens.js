import React, { useState } from 'react';
import AppTextInput from '../components/AppTextInput';
import { Alert, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import Text from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Icons from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import { colors, radius, shadows, spacing, typography } from '../theme/theme';
import { useAppState } from '../context/AppStateContext';
import { createLocalPost, enqueuePendingOperation } from '../data/localDatabase';
import { supabase } from '../lib/supabase';
import { useChodhiQTheme } from '../context/ThemeContext';
import { openSubscriptionCheckout } from '../data/subscriptionRepository';
import { features } from '../config/features';
import { cleanText } from '../lib/validation';

const iconMap = {
  sofa: 'Sofa',
  wrench: 'Wrench',
  zap: 'Zap',
  droplet: 'Droplet',
  scissors: 'Scissors',
  utensils: 'Utensils',
  sparkles: 'Sparkles',
  camera: 'Camera',
  calendar: 'CalendarDays',
  briefcase: 'BriefcaseBusiness',
  'heart-pulse': 'HeartPulse',
  'graduation-cap': 'GraduationCap',
  'shopping-basket': 'ShoppingBasket',
  users: 'Users',
  megaphone: 'Megaphone',
};

export function CategoriesScreen({ navigation }) {
  const { categories } = useAppState();
  const { palette } = useChodhiQTheme();
  return (
    <SafeAreaView style={[styles.page, { backgroundColor: palette.background }]}>
      <ScreenHeader
        navigation={navigation}
        title="Categories"
        subtitle="Browse trusted South Indian businesses"
      />
      <ScrollView contentContainerStyle={styles.categoryGrid}>
        {categories.map((item) => {
          const Icon = Icons[iconMap[item.icon]] || Icons.Store;
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.categoryCard,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ]}
              onPress={() =>
                navigation.navigate('MainTabs', {
                  screen: 'Explore',
                  params: { categoryId: item.id },
                })
              }
            >
              <View style={[styles.categoryIcon, { backgroundColor: `${item.color}18` }]}>
                <Icon size={24} color={item.color} />
              </View>
              <Text style={[styles.categoryName, { color: palette.text }]}>{item.name}</Text>
              <Text style={[styles.categoryNote, { color: palette.text2 }]}>Explore providers</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const plans = [
  {
    code: 'community',
    name: 'Community Plan',
    price: '£10 / month',
    tone: colors.primary,
    items: ['3 image posts monthly', 'Community visibility', 'Verified badge eligibility'],
  },
  {
    code: 'top10',
    name: 'Top 10 Plan',
    price: '£25 / month',
    tone: colors.plum,
    items: ['Everything in Community', 'Promoted Top 10 placement', 'Priority in search results'],
  },
  {
    code: 'top5',
    name: 'Top 5 Plan',
    price: '£50 / month',
    tone: colors.turmeric,
    items: ['Everything in Top 10', 'Promoted Top 5 placement', 'Maximum local visibility'],
  },
];
export function SubscriptionPlansScreen({ navigation }) {
  const { session, access } = useAppState();
  const { palette } = useChodhiQTheme();
  const [busy, setBusy] = useState('');
  const choose = async (code) => {
    if (!session) return navigation.navigate('Welcome');
    const provider = access.ownedProviders?.[0];
    if (!provider)
      return Alert.alert(
        'Business account required',
        'Claim or create a business listing before choosing a plan.',
      );
    if (!provider.is_verified || provider.verification_status !== 'verified')
      return Alert.alert(
        'Verification required',
        'Your business must be verified before purchasing a paid plan.',
      );
    setBusy(code);
    try {
      const result = await openSubscriptionCheckout(provider.id, code);
      if (result.status === 'success')
        Alert.alert(
          'Payment received',
          'Stripe is confirming your subscription. Your business benefits will update shortly.',
        );
      else if (result.status === 'cancelled')
        Alert.alert('Checkout cancelled', 'No subscription changes were made.');
    } catch (error) {
      Alert.alert('Checkout unavailable', error.message);
    } finally {
      setBusy('');
    }
  };
  return (
    <SafeAreaView style={[styles.page, { backgroundColor: palette.background }]}>
      <ScreenHeader
        navigation={navigation}
        title="Subscription plans"
        subtitle="Choose the right visibility for your business"
      />
      <ScrollView contentContainerStyle={styles.content}>
        {!features.payments && (
          <View
            style={[
              styles.planCard,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <Text style={[styles.planName, { color: palette.text }]}>Free launch period</Text>
            <Text style={[styles.planPrice, { color: palette.text2 }]}>
              Payments are paused for the initial release. We will announce paid business plans
              before they become available.
            </Text>
          </View>
        )}
        {plans.map((plan, i) => (
          <View
            key={plan.code}
            style={[
              styles.planCard,
              {
                backgroundColor: palette.surface,
                borderColor: i === 2 ? palette.saffron : palette.border,
              },
              i === 2 && styles.planFeatured,
            ]}
          >
            <View style={styles.planTop}>
              <View>
                <Text style={[styles.planName, { color: palette.text }]}>{plan.name}</Text>
                <Text
                  style={[styles.planPrice, { color: i === 2 ? palette.saffron : palette.text2 }]}
                >
                  {plan.price}
                </Text>
              </View>
              <Icons.Crown size={25} color={i === 2 ? palette.saffron : palette.muted} />
            </View>
            {plan.items.map((item) => (
              <View key={item} style={styles.feature}>
                <Icons.CheckCircle2 size={15} color={palette.muted} />
                <Text style={{ color: palette.text }}>{item}</Text>
              </View>
            ))}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Choose ${plan.name}, ${plan.price}`}
              disabled={!features.payments || Boolean(busy)}
              style={[
                styles.choose,
                {
                  backgroundColor: palette.primary,
                  opacity: !features.payments || (busy && busy !== plan.code) ? 0.55 : 1,
                },
              ]}
              onPress={() => choose(plan.code)}
            >
              <Text style={[styles.chooseText, { color: palette.background }]}>
                {!features.payments
                  ? 'Coming later'
                  : busy === plan.code
                    ? 'Opening Stripe…'
                    : 'Choose plan'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

export function CreatePostScreen({ navigation }) {
  const { session, providers, access } = useAppState();
  const { palette } = useChodhiQTheme();
  const [type, setType] = useState('promotion'),
    [title, setTitle] = useState(''),
    [body, setBody] = useState(''),
    [providerId, setProviderId] = useState(null),
    [busy, setBusy] = useState(false);
  const ownedIds = new Set(access.ownedProviders.map((provider) => String(provider.id)));
  const ownedProviders = providers.filter((provider) => ownedIds.has(String(provider.id)));
  const postTypes = [
    { value: 'promotion', label: 'Offer', hint: 'Special deals and discounts', Icon: Icons.Tag },
    { value: 'discussion', label: 'Update', hint: 'News and announcements', Icon: Icons.Megaphone },
    {
      value: 'experience',
      label: 'Event',
      hint: 'Upcoming events and activities',
      Icon: Icons.CalendarDays,
    },
  ];
  const publish = async () => {
    if (!session) return navigation.navigate('Welcome');
    if (!providerId || !ownedIds.has(String(providerId)))
      return Alert.alert('Choose your business', 'Select a business profile that you own.');
    let safeTitle;
    let safeBody;
    try {
      safeTitle = cleanText(title, { field: 'Title', min: 3, max: 120 });
      safeBody = cleanText(body, { field: 'Description', min: 5, max: 2000, multiline: true });
    } catch (error) {
      return Alert.alert('Check your post', error.message);
    }
    setBusy(true);
    const text = `${safeTitle}\n\n${safeBody}`,
      payload = {
        author_id: session.user.id,
        provider_id: providerId,
        post_type: type,
        body: text,
      };
    try {
      if (!supabase) throw new Error('Offline');
      const { error } = await supabase.from('community_posts').insert(payload);
      if (error) throw error;
      Alert.alert('Published', 'Your post is now visible to the community.');
      navigation.goBack();
    } catch (error) {
      try {
        const localPost = await createLocalPost(session.user.id, {
          providerId,
          postType: type,
          body: text,
        });
        await enqueuePendingOperation('community_post', { remote: payload, localId: localPost.id });
        Alert.alert(
          'Saved offline',
          'Your post will publish automatically after the connection returns.',
        );
        navigation.goBack();
      } catch {
        Alert.alert('Could not save', error.message);
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <SafeAreaView style={[styles.page, { backgroundColor: palette.background }]}>
      <ScreenHeader
        navigation={navigation}
        title="Create post"
        subtitle="Share offers, updates or events with your customers."
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.sectionHeading}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Post type</Text>
          <Text style={[styles.sectionHint, { color: palette.text2 }]}>
            Choose the type of post you want to create.
          </Text>
        </View>
        <View style={styles.postTypeRow}>
          {postTypes.map(({ value, label, hint, Icon }) => (
            <TouchableOpacity
              key={value}
              style={[
                styles.postTypeCard,
                { backgroundColor: palette.surface, borderColor: palette.border },
                type === value && {
                  backgroundColor: palette.primarySoft,
                  borderColor: palette.primary,
                },
              ]}
              onPress={() => setType(value)}
            >
              <View style={[styles.postTypeIcon, { backgroundColor: palette.surfaceAlt }]}>
                <Icon size={19} color={type === value ? palette.primary : palette.text2} />
              </View>
              <View style={styles.postTypeCopy}>
                <Text style={[styles.postTypeLabel, { color: palette.text }]}>{label}</Text>
                <Text numberOfLines={2} style={[styles.postTypeHint, { color: palette.text2 }]}>
                  {hint}
                </Text>
              </View>
              {type === value ? (
                <View style={[styles.selectedMark, { backgroundColor: palette.primary }]}>
                  <Icons.Check size={13} color="#FFFFFF" />
                </View>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.fieldHeading}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Title</Text>
          <Text style={[styles.counter, { color: palette.muted }]}>{title.length}/120</Text>
        </View>
        <AppTextInput
          style={[
            styles.input,
            { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text },
          ]}
          value={title}
          onChangeText={setTitle}
          maxLength={120}
          placeholder="Weekend special offer"
          placeholderTextColor={palette.muted}
        />
        <View style={styles.fieldHeading}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Description</Text>
          <Text style={[styles.counter, { color: palette.muted }]}>{body.length}/2000</Text>
        </View>
        <AppTextInput
          multiline
          style={[
            styles.input,
            styles.textarea,
            { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text },
          ]}
          value={body}
          onChangeText={setBody}
          maxLength={2000}
          placeholder="Share the details, dates and how to claim it."
          placeholderTextColor={palette.muted}
        />
        {ownedProviders.length ? (
          <View>
            <Text style={[styles.sectionTitle, { color: palette.text, marginBottom: 10 }]}>
              Business profile
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {ownedProviders.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.providerChip,
                    { backgroundColor: palette.primarySoft },
                    providerId === p.id && { backgroundColor: palette.primary },
                  ]}
                  onPress={() => setProviderId(p.id)}
                >
                  <Text
                    style={[
                      styles.providerText,
                      { color: palette.primary },
                      providerId === p.id && { color: palette.background },
                    ]}
                    numberOfLines={1}
                  >
                    {p.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : (
          <View style={[styles.businessPrompt, { backgroundColor: palette.primarySoft }]}>
            <View style={[styles.businessPromptIcon, { backgroundColor: palette.surface }]}>
              <Icons.Store size={24} color={palette.primary} />
            </View>
            <View style={styles.businessPromptCopy}>
              <Text style={[styles.businessPromptTitle, { color: palette.text }]}>
                Business profile
              </Text>
              <Text style={[styles.sectionHint, { color: palette.text2 }]}>
                Claim or register a business before publishing provider content.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('ClaimListing')}
              style={[styles.profileLink, { backgroundColor: palette.surface }]}
            >
              <Text style={{ color: palette.primary, fontWeight: '800', fontSize: 12 }}>
                Go to profile
              </Text>
              <Icons.ChevronRight size={16} color={palette.primary} />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.uploadHeading}>
          <View style={styles.fieldHeading}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Poster images</Text>
            <Text style={[styles.counter, { color: palette.muted }]}>0/5</Text>
          </View>
          <Text style={[styles.sectionHint, { color: palette.text2 }]}>
            Add eye-catching images to your post.
          </Text>
        </View>
        <View
          style={[
            styles.uploadMock,
            { backgroundColor: palette.surface, borderColor: palette.primary },
          ]}
        >
          <View style={[styles.uploadIcon, { backgroundColor: palette.primarySoft }]}>
            <Icons.ImagePlus size={27} color={palette.primary} />
          </View>
          <Text style={[styles.uploadTitle, { color: palette.text }]}>Add poster images</Text>
          <Text style={[styles.uploadNote, { color: palette.text2 }]}>
            Images are managed through the Business Dashboard
          </Text>
        </View>
        <View style={styles.imageActions}>
          <View
            style={[
              styles.imageAction,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <Icons.Image size={19} color={palette.primary} />
            <Text style={[styles.imageActionText, { color: palette.text }]}>
              Choose from gallery
            </Text>
          </View>
          <View
            style={[
              styles.imageAction,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <Icons.Camera size={19} color={palette.primary} />
            <Text style={[styles.imageActionText, { color: palette.text }]}>Take photo</Text>
          </View>
        </View>
        <TouchableOpacity
          disabled={busy}
          style={[styles.publish, styles.publishLarge, { backgroundColor: palette.primary }]}
          onPress={publish}
        >
          <Text style={styles.publishText}>{busy ? 'Publishing…' : 'Publish post'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    padding: spacing.lg,
    paddingBottom: 80,
    gap: 16,
  },
  categoryGrid: {
    padding: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 90,
  },
  categoryCard: {
    width: '47.8%',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: { fontSize: 14, fontWeight: '800', color: colors.textPrimary, marginTop: 12 },
  categoryNote: { fontSize: 11, color: colors.textMuted, marginTop: 3 },
  planCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.soft,
  },
  planFeatured: { borderColor: colors.turmeric, borderWidth: 2 },
  planTop: { flexDirection: 'row', justifyContent: 'space-between' },
  planName: { ...typography.h2, fontSize: 18 },
  planPrice: { fontSize: 13, color: colors.textSecondary, marginTop: 5, marginBottom: 15 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 5 },
  choose: { padding: 13, borderRadius: radius.md, alignItems: 'center', marginTop: 16 },
  chooseText: { color: '#fff', fontWeight: '800' },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionHeading: { gap: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  sectionHint: { fontSize: 12, lineHeight: 18 },
  fieldHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  counter: { fontSize: 11 },
  postTypeRow: { flexDirection: 'row', gap: 8 },
  postTypeCard: {
    flex: 1,
    minHeight: 105,
    position: 'relative',
    borderWidth: 1,
    borderRadius: 15,
    padding: 10,
    justifyContent: 'center',
    gap: 8,
  },
  postTypeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postTypeCopy: { gap: 3 },
  postTypeLabel: { fontSize: 12, fontWeight: '800' },
  postTypeHint: { fontSize: 9, lineHeight: 13 },
  selectedMark: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 19,
    height: 19,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  businessPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    padding: 12,
  },
  businessPromptIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  businessPromptCopy: { flex: 1, gap: 4 },
  businessPromptTitle: { fontSize: 13, fontWeight: '800' },
  profileLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  uploadHeading: { gap: 4 },
  segment: { flexDirection: 'row', backgroundColor: '#fff' },
  segmentButton: {
    flex: 1,
    padding: 11,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  segmentActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  segmentText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  segmentTextActive: { color: '#fff' },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    color: colors.textPrimary,
  },
  textarea: { height: 120, textAlignVertical: 'top' },
  providerChip: {
    maxWidth: 150,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    marginRight: 7,
  },
  providerChipActive: { backgroundColor: colors.primary },
  providerText: { color: colors.primary, fontSize: 11 },
  empty: { fontSize: 12, lineHeight: 18 },
  uploadMock: {
    minHeight: 145,
    gap: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    padding: 16,
  },
  uploadIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  uploadTitle: { fontWeight: '800', fontSize: 13 },
  uploadNote: { fontSize: 11, marginTop: 1, textAlign: 'center' },
  imageActions: { flexDirection: 'row', gap: 10 },
  imageAction: {
    minHeight: 50,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 8,
  },
  imageActionText: { fontSize: 10, fontWeight: '700' },
  publish: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  publishLarge: { minHeight: 56, borderRadius: 17, justifyContent: 'center' },
  publishText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
});
