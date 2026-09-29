import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Text from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BadgeCheck,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  ChevronRight,
  FileCheck2,
  ImagePlus,
  MessageCircle,
  ShieldCheck,
  Star,
  Store,
  Users,
} from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import { useAppState } from '../context/AppStateContext';
import { useChodhiQTheme } from '../context/ThemeContext';
import { radius, shadows, spacing } from '../theme/theme';

function Section({ palette, title, action, onAction, children }) {
  return (
    <View style={{ marginTop: 24 }}>
      <View style={s.sectionHead}>
        <Text style={[s.sectionTitle, { color: palette.text }]}>{title}</Text>
        {action && (
          <TouchableOpacity onPress={onAction}>
            <Text style={{ color: palette.saffron, fontSize: 11, fontWeight: '800' }}>
              {action}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}
function Metric({ palette, Icon, label, value, note, tone }) {
  return (
    <View style={[s.metric, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={[s.metricIcon, { backgroundColor: `${tone || palette.indigo}20` }]}>
        <Icon size={18} color={tone || palette.indigo} />
      </View>
      <Text style={[s.metricValue, { color: palette.text }]}>{value}</Text>
      <Text style={[s.metricLabel, { color: palette.text2 }]}>{label}</Text>
      {note && <Text style={[s.metricNote, { color: palette.muted }]}>{note}</Text>}
    </View>
  );
}
function QuickAction({ palette, Icon, label, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[s.quick, { backgroundColor: palette.surface, borderColor: palette.border }]}
    >
      <View style={[s.quickIcon, { backgroundColor: palette.primarySoft }]}>
        <Icon size={20} color={palette.dark ? palette.saffron : palette.primary} />
      </View>
      <Text style={[s.quickText, { color: palette.text }]}>{label}</Text>
      <ChevronRight size={15} color={palette.muted} />
    </TouchableOpacity>
  );
}

export function BusinessDashboardScreen({ navigation }) {
  const { palette } = useChodhiQTheme();
  const { providers, quoteRequests, reviews, session, access } = useAppState();
  const ownedId = access.ownedProviders[0]?.id;
  const business = providers.find((item) => item.id === ownedId);
  const [leadStates, setLeadStates] = useState({});
  const leads = quoteRequests;
  const completeness = useMemo(() => {
    if (!business) return 0;
    const fields = [
      business.name,
      business.description,
      business.phone,
      business.baseCity,
      business.image,
      business.website,
    ];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }, [business]);
  const setLead = (id, status) => setLeadStates((current) => ({ ...current, [id]: status }));
  if (!session || !ownedId)
    return (
      <AccessDenied
        navigation={navigation}
        title="Business access required"
        message="Only authenticated owners of a ChodhiQ business may open this dashboard."
      />
    );
  return (
    <SafeAreaView style={[s.page, { backgroundColor: palette.background }]}>
      <ScreenHeader
        navigation={navigation}
        title="Business dashboard"
        subtitle="Manage your ChodhiQ presence"
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <View style={[s.hero, { backgroundColor: palette.hero, borderColor: palette.border }]}>
          <View style={{ flex: 1 }}>
            <View style={s.heroTop}>
              {business?.isVerified ? (
                <View style={[s.status, { backgroundColor: palette.goldSoft }]}>
                  <BadgeCheck size={13} color={palette.saffron} />
                  <Text style={{ color: palette.saffron, fontSize: 10, fontWeight: '800' }}>
                    Verified
                  </Text>
                </View>
              ) : (
                <View />
              )}
            </View>
            <Text style={s.heroEyebrow}>BUSINESS OVERVIEW</Text>
            <Text style={s.heroTitle}>{business?.name || 'Your ChodhiQ Business'}</Text>
            <Text style={s.heroBody}>
              {business?.category || 'Provider'} · {business?.baseCity || 'United Kingdom'}
            </Text>
          </View>
        </View>
        <View style={s.metricGrid}>
          <Metric
            palette={palette}
            Icon={MessageCircle}
            value={leads.length}
            label="Leads"
            note="Current inbox"
            tone={palette.saffron}
          />
          <Metric
            palette={palette}
            Icon={Star}
            value={business?.rating || '—'}
            label="Rating"
            note={`${business?.reviewCount || reviews.length} reviews`}
            tone={palette.indigo}
          />
          <Metric
            palette={palette}
            Icon={BarChart3}
            value="—"
            label="Profile views"
            note="Analytics unavailable"
            tone={palette.blue || palette.indigo}
          />
        </View>
        <Section palette={palette} title="Quick actions">
          <View style={s.quickGrid}>
            <QuickAction
              palette={palette}
              Icon={Store}
              label="Edit listing"
              onPress={() => navigation.navigate('BecomeProvider')}
            />
            <QuickAction
              palette={palette}
              Icon={ImagePlus}
              label="Create promotion"
              onPress={() => navigation.navigate('CreatePost')}
            />
            <QuickAction
              palette={palette}
              Icon={Star}
              label="View reviews"
              onPress={() => navigation.navigate('Reviews')}
            />
          </View>
        </Section>
        <Section palette={palette} title="Listing completeness">
          <View style={[s.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={s.rowBetween}>
              <Text style={[s.cardTitle, { color: palette.text }]}>
                Complete your business profile
              </Text>
              <Text style={{ color: palette.saffron, fontWeight: '900' }}>{completeness}%</Text>
            </View>
            <View style={[s.progress, { backgroundColor: palette.surfaceAlt }]}>
              <View
                style={[
                  s.progressFill,
                  { width: `${completeness}%`, backgroundColor: palette.saffron },
                ]}
              />
            </View>
            <Text style={[s.body, { color: palette.text2 }]}>
              Add contact details, services and media to improve customer confidence.
            </Text>
          </View>
        </Section>
        <Section
          palette={palette}
          title="Recent leads"
          action="View all"
          onAction={() => navigation.navigate('QuoteRequests')}
        >
          {leads.length ? (
            leads.slice(0, 4).map((lead) => {
              const state = leadStates[lead.id] || lead.status || 'New';
              return (
                <View
                  key={lead.id}
                  style={[
                    s.lead,
                    { backgroundColor: palette.surface, borderColor: palette.border },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[s.cardTitle, { color: palette.text }]}>
                      {lead.providerName || 'Customer enquiry'}
                    </Text>
                    <Text numberOfLines={2} style={[s.body, { color: palette.text2 }]}>
                      {lead.message}
                    </Text>
                    <Text style={[s.meta, { color: palette.muted }]}>{lead.createdAt}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setLead(lead.id, state === 'Contacted' ? 'New' : 'Contacted')}
                    style={[
                      s.leadState,
                      {
                        backgroundColor:
                          state === 'Contacted' ? palette.lavenderSoft : palette.goldSoft,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: state === 'Contacted' ? palette.indigo : palette.saffron,
                        fontSize: 9,
                        fontWeight: '900',
                      }}
                    >
                      {state}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })
          ) : (
            <View
              style={[s.card, { backgroundColor: palette.surface, borderColor: palette.border }]}
            >
              <Text style={[s.body, { color: palette.text2 }]}>No customer enquiries yet.</Text>
            </View>
          )}
        </Section>
        <Section palette={palette} title="Media">
          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                'Media manager',
                'Media upload will connect to the verified business account after authentication is enabled.',
              )
            }
            style={[
              s.placeholder,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <ImagePlus size={28} color={palette.indigo} />
            <Text style={[s.cardTitle, { color: palette.text }]}>Business media placeholder</Text>
            <Text style={[s.body, { color: palette.text2 }]}>
              Final business images can be added here later.
            </Text>
          </TouchableOpacity>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

export function AdminDashboardScreen({ navigation }) {
  const { palette } = useChodhiQTheme();
  const { providers, notifications, session, access } = useAppState();
  if (!session || !access.isAdmin)
    return (
      <AccessDenied
        navigation={navigation}
        title="Administrator access required"
        message="This area requires an administrator role verified by Supabase Auth."
      />
    );
  return (
    <SafeAreaView style={[s.page, { backgroundColor: palette.background }]}>
      <ScreenHeader
        navigation={navigation}
        title="Admin dashboard"
        subtitle="ChodhiQ operations and moderation"
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <View style={[s.hero, { backgroundColor: palette.hero, borderColor: palette.border }]}>
          <View style={s.heroTop}>
            <View style={[s.status, { backgroundColor: palette.goldSoft }]}>
              <ShieldCheck size={13} color={palette.saffron} />
              <Text style={{ color: palette.saffron, fontSize: 10, fontWeight: '800' }}>
                Administrator
              </Text>
            </View>
          </View>
          <Text style={s.heroEyebrow}>CHODHIQ OPERATIONS</Text>
          <Text style={s.heroTitle}>Platform overview</Text>
          <Text style={s.heroBody}>Review providers, moderation and marketplace activity.</Text>
        </View>
        <View style={s.metricGrid}>
          <Metric
            palette={palette}
            Icon={Store}
            value={providers.length}
            label="Providers"
            note="Current dataset"
            tone={palette.indigo}
          />
          <Metric
            palette={palette}
            Icon={FileCheck2}
            value="—"
            label="Applications"
            note="Application count unavailable"
            tone={palette.saffron}
          />
          <Metric
            palette={palette}
            Icon={Users}
            value="—"
            label="Members"
            note="Member count unavailable"
            tone={palette.blue || palette.indigo}
          />
          <Metric
            palette={palette}
            Icon={Bell}
            value={notifications.length}
            label="Notifications"
            note="Current feed"
            tone={palette.coral}
          />
        </View>
        <Section palette={palette} title="Provider applications" action="Review queue">
          <View style={[s.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[s.body, { color: palette.text2 }]}>
              No application records are available.
            </Text>
          </View>
        </Section>
        <Section palette={palette} title="Moderation queue">
          <View style={[s.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[s.body, { color: palette.text2 }]}>
              No moderation reports are available.
            </Text>
          </View>
        </Section>
        <Section palette={palette} title="Platform controls">
          <View style={s.quickGrid}>
            <QuickAction
              palette={palette}
              Icon={FileCheck2}
              label="Applications"
              onPress={() => Alert.alert('Applications', 'No application records are available.')}
            />
            <QuickAction
              palette={palette}
              Icon={ShieldCheck}
              label="Moderation"
              onPress={() => Alert.alert('Moderation', 'No moderation reports are available.')}
            />
            <QuickAction
              palette={palette}
              Icon={BarChart3}
              label="Analytics"
              onPress={() => Alert.alert('Analytics', 'Analytics are not available yet.')}
            />
          </View>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function AccessDenied({ navigation, title, message }) {
  const { palette } = useChodhiQTheme();
  return (
    <SafeAreaView style={[s.page, { backgroundColor: palette.background }]}>
      <ScreenHeader navigation={navigation} title="Protected area" />
      <View
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12 }}
      >
        <ShieldCheck size={38} color={palette.coral} />
        <Text style={[s.sectionTitle, { color: palette.text, textAlign: 'center' }]}>{title}</Text>
        <Text style={[s.body, { color: palette.text2, textAlign: 'center' }]}>{message}</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1 },
  content: { padding: 18, paddingBottom: 90 },
  hero: { borderRadius: 26, borderWidth: 1, padding: 20, overflow: 'hidden', ...shadows.soft },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  heroEyebrow: { color: '#E6B85C', fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  heroTitle: { color: '#FFFFFF', fontSize: 27, fontWeight: '900', marginTop: 5 },
  heroBody: { color: '#B7C2CF', fontSize: 12, marginTop: 6 },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  metric: { width: '48.5%', borderWidth: 1, borderRadius: 18, padding: 14 },
  metricIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: { fontSize: 22, fontWeight: '900', marginTop: 12 },
  metricLabel: { fontSize: 11, fontWeight: '800', marginTop: 2 },
  metricNote: { fontSize: 9, marginTop: 5 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 11,
  },
  sectionTitle: { fontSize: 17, fontWeight: '900' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quick: {
    width: '48.5%',
    minHeight: 92,
    borderWidth: 1,
    borderRadius: 17,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  quickIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickText: { fontSize: 11, fontWeight: '800', flex: 1 },
  card: { borderWidth: 1, borderRadius: 18, padding: 15 },
  cardTitle: { fontSize: 13, fontWeight: '900' },
  body: { fontSize: 11, lineHeight: 17, marginTop: 4 },
  meta: { fontSize: 9, marginTop: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progress: { height: 8, borderRadius: 4, overflow: 'hidden', marginVertical: 13 },
  progressFill: { height: '100%', borderRadius: 4 },
  lead: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 9,
  },
  leadState: { paddingHorizontal: 9, paddingVertical: 7, borderRadius: 20 },
  placeholder: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 18,
    minHeight: 135,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  application: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
  },
});
