import { validateProfile, validateQuote, validateReport } from '../lib/validation';
import {
  createLocalQuote,
  createLocalReport,
  enqueuePendingOperation,
  loadLocalAccount,
  markLocalNotificationsRead,
  saveLocalProfile,
  setLocalSaved,
} from './localDatabase';
import { supabase } from '../lib/supabase';
import { loadBookings } from './bookingRepository';
import { captureError, addBreadcrumb, startTransaction } from '../lib/sentryUtils';

export async function loadAccount(userId) {
  const txn = startTransaction('loadAccount');
  try {
    addBreadcrumb('Loading account', 'account');
    const local = await loadLocalAccount(userId);
    if (!supabase) return local;
    const [notificationResult, quoteResult, bookings] = await Promise.all([
      supabase
        .from('notifications')
        .select('id,user_id,title,body,read_at,created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('quote_requests')
        .select('id,provider_id,message,status,response_message,responded_at,created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      loadBookings(userId),
    ]);
    if (notificationResult.error) throw notificationResult.error;
    if (quoteResult.error) throw quoteResult.error;
    addBreadcrumb(
      `Account loaded successfully: ${notificationResult.data?.length} notifications, ${quoteResult.data?.length} quotes`,
      'account',
    );
    return {
      ...local,
      notifications: notificationResult.data || [],
      quotes: quoteResult.data || [],
      bookings,
    };
  } catch (error) {
    captureError(error, { operation: 'loadAccount' });
    throw error;
  } finally {
    txn?.finish();
  }
}

export async function loadNotifications(userId) {
  try {
    if (!supabase) return (await loadLocalAccount(userId)).notifications || [];
    const { data, error } = await supabase
      .from('notifications')
      .select('id,user_id,title,body,read_at,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return data || [];
  } catch (error) {
    captureError(error, { operation: 'loadNotifications' });
    throw error;
  }
}

export async function deleteCurrentAccount() {
  try {
    if (!supabase) throw new Error('Account deletion requires an internet connection.');
    const { data, error } = await supabase.functions.invoke('delete-account');
    if (error) throw error;
    if (!data?.deleted) throw new Error(data?.error || 'Account deletion could not be completed.');
  } catch (error) {
    captureError(error, { operation: 'deleteCurrentAccount', level: 'fatal' });
    throw error;
  }
}

export async function exportCurrentAccount(userId) {
  if (!supabase) throw new Error('Data export requires an internet connection.');
  const tables = [
    'profiles',
    'saved_items',
    'quote_requests',
    'bookings',
    'reviews',
    'notifications',
    'verification_requests',
  ];
  const results = await Promise.all(
    tables.map(async (table) => {
      const column =
        table === 'profiles'
          ? 'id'
          : table === 'verification_requests'
            ? 'submitted_by'
            : table === 'saved_items'
              ? 'user_id'
              : 'user_id';
      const { data, error } = await supabase.from(table).select('*').eq(column, userId);
      if (error) throw error;
      return [table, data || []];
    }),
  );
  return {
    exportedAt: new Date().toISOString(),
    formatVersion: 1,
    data: Object.fromEntries(results),
  };
}

// Administrative authority and paid entitlements must never come from the
// editable local database. They are resolved by the secure backend only when
// those online workflows are used.
export async function getAccessContext(user) {
  if (!user) return { isAdmin: false, ownedProviders: [] };
  const isAdmin = user.app_metadata?.role === 'admin';
  if (!supabase) return { isAdmin, ownedProviders: [] };
  const { data, error } = await supabase
    .from('providers')
    .select('id,business_name,is_verified,verification_status')
    .eq('owner_id', user.id);
  if (error) throw error;
  return { isAdmin, ownedProviders: data || [] };
}

export async function setSaved(userId, providerId, saved) {
  return setLocalSaved(userId, providerId, saved);
}

export async function createQuote(userId, input) {
  const quote = validateQuote(input);
  if (supabase) {
    const { data, error } = await supabase
      .from('quote_requests')
      .insert({
        user_id: userId,
        provider_id: quote.providerId,
        message: quote.message,
        preferred_contact: quote.preferredContact,
      })
      .select('id,provider_id,message,status,created_at')
      .single();
    if (!error) return data;
    console.warn('Quote upload failed; saving locally.', error.message);
  }
  await enqueuePendingOperation('quote_request', {
    user_id: userId,
    provider_id: quote.providerId,
    message: quote.message,
    preferred_contact: quote.preferredContact,
  });
  return createLocalQuote(userId, quote);
}

export async function updateProfile(userId, input) {
  return saveLocalProfile(userId, validateProfile(input));
}

export async function createProviderReport(userId, providerId, reason, details) {
  const report = validateReport(reason, details);
  if (supabase) {
    const { error } = await supabase
      .from('provider_reports')
      .insert({ reporter_id: userId, provider_id: providerId, ...report });
    if (!error) return;
    console.warn('Report upload failed; saving locally.', error.message);
  }
  await enqueuePendingOperation('provider_report', {
    reporter_id: userId,
    provider_id: providerId,
    ...report,
  });
  return createLocalReport(userId, providerId, report.reason, report.details);
}

export async function markNotificationsRead(userId) {
  if (supabase) {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null);
    if (error) throw error;
    return;
  }
  return markLocalNotificationsRead(userId);
}
