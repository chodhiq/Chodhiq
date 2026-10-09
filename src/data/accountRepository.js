import { validateProfile, validateQuote, validateReport } from '../lib/validation';
import {
  createLocalQuote,
  createLocalReport,
  deleteLocalProfile,
  enqueuePendingOperation,
  hasImportedLocalSavedItems,
  loadLocalAccount,
  loadPendingOperations,
  markLocalSavedItemsImported,
  markLocalNotificationsRead,
  saveLocalProfile,
  setLocalSaved,
} from './localDatabase';
import { supabase } from '../lib/supabase';
import { loadBookings } from './bookingRepository';
import { captureError, addBreadcrumb, startTransaction } from '../lib/sentryUtils';
import { classifySyncError } from './syncPolicy';
import { remoteProfilePayload } from './accountSync';

export async function loadAccount(userId) {
  const txn = startTransaction('loadAccount');
  try {
    addBreadcrumb('Loading account', 'account');
    const local = await loadLocalAccount(userId);
    if (!supabase) return local;
    const [notificationResult, quoteResult, bookings, profileResult, savedResult] =
      await Promise.all([
        supabase
          .from('notifications')
          .select('id,user_id,title,body,read_at,created_at,type,entity_type,entity_id')
          .eq('user_id', userId)
          .is('read_at', null)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('quote_requests')
          .select('id,provider_id,message,status,response_message,responded_at,created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        loadBookings(userId),
        supabase
          .from('profiles')
          .select('full_name,phone,city,avatar_url,created_at')
          .eq('id', userId)
          .maybeSingle(),
        supabase.from('saved_items').select('provider_id').eq('user_id', userId),
      ]);
    if (notificationResult.error) throw notificationResult.error;
    if (quoteResult.error) throw quoteResult.error;
    if (savedResult.error) throw savedResult.error;
    const remoteSaved = savedResult.data || [];
    const savedImported = await hasImportedLocalSavedItems(userId);
    if (!savedImported) {
      try {
        const legacyIds = [...new Set(local.saved.map((item) => item.provider_id).filter(Boolean))];
        if (legacyIds.length) {
          const { error } = await supabase.from('saved_items').upsert(
            legacyIds.map((provider_id) => ({ user_id: userId, provider_id })),
            { onConflict: 'user_id,provider_id', ignoreDuplicates: true },
          );
          if (error) throw error;
        }
        await markLocalSavedItemsImported(userId);
      } catch (error) {
        captureError(error, { operation: 'importLocalSavedItems' });
        console.warn('Saved businesses will retry syncing after sign-in.', error.message);
      }
    }
    const pending = await loadPendingOperations();
    const savedByProvider = new Map(remoteSaved.map((item) => [item.provider_id, item]));
    if (!savedImported)
      for (const item of local.saved)
        if (item.provider_id)
          savedByProvider.set(item.provider_id, { provider_id: item.provider_id });
    for (const operation of pending) {
      if (
        operation.operation === 'saved_item' &&
        operation.payload?.user_id === userId &&
        operation.payload?.provider_id
      ) {
        if (operation.payload.saved)
          savedByProvider.set(operation.payload.provider_id, {
            provider_id: operation.payload.provider_id,
          });
        else savedByProvider.delete(operation.payload.provider_id);
      }
    }
    const pendingProfiles = pending
      .filter(
        (operation) => operation.operation === 'profile_update' && operation.payload?.id === userId,
      )
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    const pendingProfile = pendingProfiles[pendingProfiles.length - 1];
    addBreadcrumb(
      `Account loaded successfully: ${notificationResult.data?.length} notifications, ${quoteResult.data?.length} quotes`,
      'account',
    );
    return {
      ...local,
      profile: pendingProfile
        ? local.profile
        : profileResult.error
          ? local.profile
          : profileResult.data || local.profile,
      saved: [...savedByProvider.values()],
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
      .select('id,user_id,title,body,read_at,created_at,type,entity_type,entity_id')
      .eq('user_id', userId)
      .is('read_at', null)
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
    ['profiles', 'id', 'id'],
    ['saved_items', 'user_id', 'provider_id'],
    ['quote_requests', 'user_id', 'id'],
    ['bookings', 'user_id', 'id'],
    ['reviews', 'user_id', 'id'],
    ['notifications', 'user_id', 'id'],
    ['verification_requests', 'submitted_by', 'id'],
    ['business_applications', 'applicant_id', 'id'],
    ['community_posts', 'author_id', 'id'],
    ['community_comments', 'author_id', 'id'],
    ['community_memberships', 'user_id', 'space_id'],
    ['community_member_permissions', 'user_id', 'space_id'],
    ['community_post_likes', 'user_id', 'post_id'],
    ['community_saved_posts', 'user_id', 'post_id'],
    ['community_user_blocks', 'blocker_id', 'blocked_id'],
  ];
  const results = await Promise.all(
    tables.map(async ([table, column, orderColumn]) => {
      const rows = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq(column, userId)
          .order(orderColumn)
          .range(offset, offset + 499);
        if (error) throw error;
        rows.push(...(data || []));
        if (!data || data.length < 500) break;
      }
      return [table, rows];
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
  const previousSaved = (await loadLocalAccount(userId)).saved.some(
    (item) => String(item.provider_id) === String(providerId),
  );
  await setLocalSaved(userId, providerId, saved);
  const payload = { user_id: userId, provider_id: String(providerId), saved };
  const remoteRow = { user_id: userId, provider_id: String(providerId) };
  if (!supabase) {
    try {
      await enqueuePendingOperation('saved_item', payload);
    } catch (error) {
      await setLocalSaved(userId, providerId, previousSaved);
      throw error;
    }
    return;
  }
  const result = saved
    ? await supabase.from('saved_items').upsert(remoteRow, {
        onConflict: 'user_id,provider_id',
        ignoreDuplicates: true,
      })
    : await supabase
        .from('saved_items')
        .delete()
        .eq('user_id', userId)
        .eq('provider_id', String(providerId));
  if (!result.error) return;
  if (classifySyncError(result.error) === 'permanent') {
    await setLocalSaved(userId, providerId, previousSaved);
    throw result.error;
  }
  console.warn('Saved business change queued for retry.', result.error.message);
  try {
    await enqueuePendingOperation('saved_item', payload);
  } catch (error) {
    await setLocalSaved(userId, providerId, previousSaved);
    throw error;
  }
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
    if (classifySyncError(error) === 'permanent') throw error;
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
  const profile = validateProfile(input);
  const previousProfile = (await loadLocalAccount(userId)).profile;
  if (!supabase) {
    await saveLocalProfile(userId, profile);
    try {
      await enqueuePendingOperation('profile_update', remoteProfilePayload(userId, profile));
    } catch (error) {
      if (previousProfile) await saveLocalProfile(userId, previousProfile);
      else await deleteLocalProfile(userId);
      throw error;
    }
    return profile;
  }
  const { error } = await supabase
    .from('profiles')
    .upsert(remoteProfilePayload(userId, profile), { onConflict: 'id' });
  if (error && classifySyncError(error) === 'permanent') throw error;
  await saveLocalProfile(userId, profile);
  if (error) {
    console.warn('Profile change queued for retry.', error.message);
    try {
      await enqueuePendingOperation('profile_update', remoteProfilePayload(userId, profile));
    } catch (queueError) {
      if (previousProfile) await saveLocalProfile(userId, previousProfile);
      else await deleteLocalProfile(userId);
      throw queueError;
    }
  }
  return profile;
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

export async function markNotificationsRead(userId, notificationIds) {
  if (!notificationIds?.length) return;
  if (supabase) {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .in('id', notificationIds)
      .is('read_at', null);
    if (error) throw error;
    return;
  }
  return markLocalNotificationsRead(userId, notificationIds);
}
