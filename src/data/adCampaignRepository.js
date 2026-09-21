import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

const SESSION_KEY = '@chodhiq/ad-session-id';

async function adSessionId() {
  const current = await AsyncStorage.getItem(SESSION_KEY);
  if (current) return current;
  const created = globalThis.crypto?.randomUUID?.() || '00000000-0000-4000-8000-000000000000';
  await AsyncStorage.setItem(SESSION_KEY, created);
  return created;
}

export async function loadActiveCampaigns(city) {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.rpc('list_active_ad_campaigns', {
    target_city: city || null,
    target_category: null,
  });
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    providerId: row.provider_id,
    title: row.headline,
    subtitle: row.body,
    provider: 'Sponsored provider',
    city: city || 'United Kingdom',
    tone: '#29375A',
    image: { uri: row.creative_url },
    destinationUrl: row.destination_url,
    sponsored: true,
  }));
}

export async function recordCampaignEvent(campaignId, eventType, placement = 'customer-home') {
  if (!isSupabaseConfigured || !campaignId) return;
  const sessionId = await adSessionId();
  const { error } = await supabase.rpc('record_ad_campaign_event', {
    target_campaign: campaignId,
    event_kind: eventType,
    session_id: sessionId,
    placement_name: placement,
  });
  if (error) throw error;
}
