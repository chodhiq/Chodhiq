import { isSupabaseConfigured, supabase } from '../lib/supabase';

// Counts a campaign once per app session without storing a long-lived ad identifier.
const adSessionId =
  globalThis.crypto?.randomUUID?.() ||
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const digit = Math.floor(Math.random() * 16);
    return (character === 'x' ? digit : (digit & 3) | 8).toString(16);
  });

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
  const { error } = await supabase.rpc('record_ad_campaign_event', {
    target_campaign: campaignId,
    event_kind: eventType,
    session_id: adSessionId,
    placement_name: placement,
  });
  if (error) throw error;
}
