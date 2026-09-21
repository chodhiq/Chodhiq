import { supabase } from '../lib/supabase';
import { validateHttpsUrl } from '../lib/validation';
import { mapAnalytics, mapModerationReport, mapVerificationRequest } from './dashboardMappers';

const assertClient = (client) => {
  if (!client) throw new Error('The dashboard requires an online Supabase connection.');
  return client;
};

const assertResult = (result) => {
  if (result.error) throw result.error;
  return result.data || [];
};

export async function loadBusinessDashboard(providerId, client = supabase) {
  const db = assertClient(client);
  if (!providerId) throw new Error('A provider is required to load the business dashboard.');
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const [
    analyticsResult,
    quoteResult,
    bookingResult,
    serviceResult,
    hoursResult,
    entitlementResult,
    paymentResult,
  ] = await Promise.all([
    db
      .from('provider_analytics_events')
      .select('event_type,created_at')
      .eq('provider_id', providerId)
      .gte('created_at', since),
    db
      .from('quote_requests')
      .select('id,provider_id,message,status,created_at,response_message')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false })
      .limit(20),
    db
      .from('bookings')
      .select(
        'id,provider_id,service_id,requested_date,requested_time,status,notes,provider_message,created_at,services(name)',
      )
      .eq('provider_id', providerId)
      .order('requested_date', { ascending: true })
      .limit(50),
    db
      .from('services')
      .select('id,name,description,starting_price,is_featured,created_at')
      .eq('provider_id', providerId)
      .order('created_at'),
    db
      .from('provider_hours')
      .select('id,day_of_week,open_time,close_time,is_closed')
      .eq('provider_id', providerId)
      .order('day_of_week'),
    db
      .from('provider_entitlements')
      .select('plan_code,expires_at')
      .eq('provider_id', providerId)
      .maybeSingle(),
    db
      .from('payment_records')
      .select('id,amount_pence,currency,status,receipt_url,invoice_url,created_at')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);
  const analyticsRows = assertResult(analyticsResult);
  const leads = assertResult(quoteResult);
  const bookings = assertResult(bookingResult);
  const services = assertResult(serviceResult);
  const hours = assertResult(hoursResult);
  const payments = assertResult(paymentResult);
  if (entitlementResult.error) throw entitlementResult.error;
  return {
    analytics: mapAnalytics(analyticsRows),
    leads,
    bookings,
    services,
    hours,
    payments,
    plan: entitlementResult.data?.plan_code || 'free',
    planExpiresAt: entitlementResult.data?.expires_at || null,
  };
}

export async function updateBusinessLead(
  providerId,
  leadId,
  status,
  responseMessage = '',
  client = supabase,
) {
  const db = assertClient(client);
  const allowed = new Set(['sent', 'viewed', 'responded', 'closed']);
  if (!allowed.has(status)) throw new Error('Unsupported lead status.');
  const message = String(responseMessage || '').trim();
  if (status === 'responded' && (message.length < 2 || message.length > 2000))
    throw new Error('A response of 2 to 2,000 characters is required.');
  const result = await db
    .from('quote_requests')
    .update({
      status,
      response_message: message || null,
      responded_at: status === 'responded' ? new Date().toISOString() : null,
    })
    .eq('id', leadId)
    .eq('provider_id', providerId)
    .select('id,status,response_message,responded_at')
    .single();
  if (result.error) throw result.error;
  return result.data;
}

export async function updateBusinessBooking(
  providerId,
  bookingId,
  status,
  providerMessage = '',
  client = supabase,
) {
  const db = assertClient(client);
  const allowed = new Set(['confirmed', 'completed', 'declined']);
  if (!allowed.has(status)) throw new Error('Unsupported booking status.');
  const message = String(providerMessage || '').trim();
  if (message.length > 2000) throw new Error('Keep the booking message under 2,000 characters.');
  const result = await db
    .from('bookings')
    .update({ status, provider_message: message || null, responded_at: new Date().toISOString() })
    .eq('id', bookingId)
    .eq('provider_id', providerId)
    .select('id,status,provider_message,responded_at')
    .single();
  if (result.error) throw result.error;
  return result.data;
}

export async function updateBusinessListing(providerId, draft, client = supabase) {
  const db = assertClient(client);
  const clean = (value, max) =>
    String(value || '')
      .trim()
      .slice(0, max);
  const payload = {
    business_name: clean(draft.name, 120),
    description: clean(draft.description, 2000) || null,
    base_city: clean(draft.baseCity, 100),
    base_postcode: clean(draft.postcode, 12) || null,
    phone: clean(draft.phone, 40) || null,
    whatsapp: clean(draft.whatsapp, 40) || null,
    website: draft.website ? validateHttpsUrl(draft.website) : null,
    updated_at: new Date().toISOString(),
  };
  if (payload.business_name.length < 2 || payload.base_city.length < 2)
    throw new Error('Business name and city are required.');
  const result = await db
    .from('providers')
    .update(payload)
    .eq('id', providerId)
    .select(
      'id,business_name,description,base_city,base_postcode,phone,whatsapp,website,updated_at',
    )
    .single();
  if (result.error) throw result.error;
  return result.data;
}

export async function loadAdminDashboard(client = supabase) {
  const db = assertClient(client);
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const [
    verificationResult,
    reportResult,
    reviewResult,
    auditResult,
    providerCount,
    memberCount,
    recentProviders,
    recentMembers,
  ] = await Promise.all([
    db
      .from('verification_requests')
      .select(
        'id,provider_id,status,notes,submitted_at,providers(business_name,base_city,categories(name)),verification_documents(id,document_type,storage_path,created_at)',
      )
      .in('status', ['pending', 'changes_requested'])
      .order('submitted_at', { ascending: true })
      .limit(100),
    db
      .from('community_post_reports')
      .select('id,post_id,reason,status,created_at,community_posts(body,status)')
      .in('status', ['open', 'reviewing'])
      .order('created_at', { ascending: true })
      .limit(100),
    db
      .from('reviews')
      .select('id,provider_id,rating,comment,moderation_status,created_at')
      .eq('moderation_status', 'published')
      .order('created_at', { ascending: false })
      .limit(20),
    db
      .from('admin_audit_log')
      .select('id,action,entity_type,entity_id,details,created_at')
      .order('created_at', { ascending: false })
      .limit(20),
    db.from('providers').select('id', { count: 'exact', head: true }),
    db.from('profiles').select('id', { count: 'exact', head: true }),
    db.from('providers').select('id', { count: 'exact', head: true }).gte('created_at', since),
    db.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', since),
  ]);
  const applications = assertResult(verificationResult).map(mapVerificationRequest);
  const reports = assertResult(reportResult).map(mapModerationReport);
  const reviews = assertResult(reviewResult);
  const auditLog = assertResult(auditResult);
  if (providerCount.error) throw providerCount.error;
  if (memberCount.error) throw memberCount.error;
  if (recentProviders.error) throw recentProviders.error;
  if (recentMembers.error) throw recentMembers.error;
  return {
    applications,
    reports,
    reviews,
    auditLog,
    providerCount: providerCount.count || 0,
    memberCount: memberCount.count || 0,
    recentProviderCount: recentProviders.count || 0,
    recentMemberCount: recentMembers.count || 0,
  };
}

export async function openVerificationDocument(storagePath, client = supabase) {
  const db = assertClient(client);
  if (!storagePath) throw new Error('The verification document is unavailable.');
  const result = await db.storage.from('verification-documents').createSignedUrl(storagePath, 60);
  if (result.error) throw result.error;
  return result.data?.signedUrl;
}

export async function searchAdminMembers(query, client = supabase) {
  const db = assertClient(client);
  const term = String(query || '').trim();
  if (term.length < 2) return [];
  const result = await db.rpc('admin_search_members', { search_term: term, result_limit: 12 });
  if (result.error) throw result.error;
  return result.data || [];
}

export async function decideVerification(requestId, decision, note = '', client = supabase) {
  const db = assertClient(client);
  const allowed = new Set(['approved', 'rejected', 'changes_requested']);
  if (!allowed.has(decision)) throw new Error('Unsupported verification decision.');
  const result = await db.rpc('admin_decide_verification', {
    request_id: requestId,
    decision,
    decision_note: note || null,
  });
  if (result.error) throw result.error;
  return result.data;
}

export async function resolveCommunityReport(reportId, status, client = supabase) {
  const db = assertClient(client);
  if (!new Set(['reviewing', 'resolved', 'dismissed']).has(status))
    throw new Error('Unsupported moderation status.');
  const result = await db
    .from('community_post_reports')
    .update({ status })
    .eq('id', reportId)
    .select('id,status')
    .single();
  if (result.error) throw result.error;
  return result.data;
}

export async function moderateCommunityReport(reportId, action, note = '', client = supabase) {
  const db = assertClient(client);
  if (!new Set(['dismiss', 'remove_post']).has(action))
    throw new Error('Unsupported report action.');
  const safeNote = String(note || '').trim();
  if (safeNote.length < 5 || safeNote.length > 500)
    throw new Error('A moderation note of 5 to 500 characters is required.');
  const result = await db.rpc('admin_moderate_community_report', {
    report_id: reportId,
    moderation_action: action,
    moderation_note: safeNote,
  });
  if (result.error) throw result.error;
  return result.data;
}

export async function moderateReview(reviewId, status, client = supabase) {
  const db = assertClient(client);
  if (!new Set(['published', 'removed']).has(status))
    throw new Error('Unsupported review moderation status.');
  const result = await db
    .from('reviews')
    .update({ moderation_status: status })
    .eq('id', reviewId)
    .select('id,moderation_status')
    .single();
  if (result.error) throw result.error;
  return result.data;
}

export async function broadcastNotification(title, body, client = supabase) {
  const db = assertClient(client);
  const safeTitle = String(title || '').trim();
  const safeBody = String(body || '').trim();
  if (safeTitle.length < 3 || safeTitle.length > 100)
    throw new Error('Title must be 3 to 100 characters.');
  if (safeBody.length < 5 || safeBody.length > 500)
    throw new Error('Message must be 5 to 500 characters.');
  const result = await db.rpc('admin_broadcast_notification', {
    message_title: safeTitle,
    message_body: safeBody,
  });
  if (result.error) throw result.error;
  return Number(result.data || 0);
}

export async function setUserModeration(email, status, reason, client = supabase) {
  const db = assertClient(client);
  const safeEmail = String(email || '')
    .trim()
    .toLowerCase();
  const safeReason = String(reason || '').trim();
  if (!/^\S+@\S+\.\S+$/.test(safeEmail)) throw new Error('Enter a valid member email address.');
  if (!new Set(['active', 'suspended']).has(status))
    throw new Error('Unsupported user moderation status.');
  if (safeReason.length < 5 || safeReason.length > 500)
    throw new Error('Reason must be 5 to 500 characters.');
  const result = await db.rpc('admin_set_user_moderation', {
    target_email: safeEmail,
    next_status: status,
    moderation_reason: safeReason,
  });
  if (result.error) throw result.error;
  return result.data;
}
