import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
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
  const { session, providers } = useAppState();
  const { palette } = useChodhiQTheme();
  const [type, setType] = useState('promotion'),
    [title, setTitle] = useState(''),
    [body, setBody] = useState(''),
    [providerId, setProviderId] = useState(null),
    [busy, setBusy] = useState(false);
  const publish = async () => {
    if (!session) return navigation.navigate('Welcome');
    if (!title.trim() || !body.trim())
      return Alert.alert('Complete your post', 'Add a title and description.');
    setBusy(true);
    const text = `${title.trim()}\n\n${body.trim()}`,
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
      <ScreenHeader navigation={navigation} title="Create post" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.label, { color: palette.text2 }]}>Post type</Text>
        <View style={[styles.segment, { backgroundColor: palette.surface }]}>
          {[
            ['promotion', 'Offer'],
            ['discussion', 'Update'],
            ['experience', 'Event'],
          ].map(([value, label]) => (
            <TouchableOpacity
              key={value}
              style={[
                styles.segmentButton,
                { borderColor: palette.border },
                type === value && {
                  backgroundColor: palette.primary,
                  borderColor: palette.primary,
                },
              ]}
              onPress={() => setType(value)}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: palette.text2 },
                  type === value && styles.segmentTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.label, { color: palette.text2 }]}>Title</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text },
          ]}
          value={title}
          onChangeText={setTitle}
          placeholder="Weekend special offer"
          placeholderTextColor={palette.muted}
        />
        <Text style={[styles.label, { color: palette.text2 }]}>Description</Text>
        <TextInput
          multiline
          style={[
            styles.input,
            styles.textarea,
            { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text },
          ]}
          value={body}
          onChangeText={setBody}
          placeholder="Share the details, dates and how to claim it."
          placeholderTextColor={palette.muted}
        />
        <Text style={[styles.label, { color: palette.text2 }]}>Business profile</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {providers.slice(0, 12).map((p) => (
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
        <View
          style={[
            styles.uploadMock,
            { backgroundColor: palette.primarySoft, borderColor: palette.primary },
          ]}
        >
          <Icons.ImagePlus size={25} color={palette.primary} />
          <View>
            <Text style={[styles.uploadTitle, { color: palette.text }]}>Poster images</Text>
            <Text style={[styles.uploadNote, { color: palette.text2 }]}>
              Images are managed through the Business Dashboard
            </Text>
          </View>
        </View>
        <TouchableOpacity
          disabled={busy}
          style={[styles.publish, { backgroundColor: palette.primary }]}
          onPress={publish}
        >
          <Text style={[styles.chooseText, { color: palette.background }]}>
            {busy ? 'Publishing…' : 'Publish post'}
          </Text>
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
    gap: spacing.md,
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
  uploadMock: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    borderRadius: radius.md,
    padding: 18,
    backgroundColor: colors.primaryLight,
  },
  uploadTitle: { fontWeight: '800', color: colors.textPrimary },
  uploadNote: { fontSize: 11, color: colors.textMuted, marginTop: 3 },
  publish: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: radius.md,
    alignItems: 'center',
  },
});
