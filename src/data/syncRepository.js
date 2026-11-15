import { supabase } from '../lib/supabase';
import {
  loadPendingOperations,
  markLocalQuoteSent,
  markLocalProfileSynced,
  markLocalReviewSynced,
  replaceLocalReviewId,
  removeLocalPost,
  removePendingOperation,
  loadPendingOperations as reloadPendingOperations,
  updatePendingOperation,
} from './localDatabase';
import { recordError } from '../lib/telemetry';
import { isReadyForSync, prepareQueuedPayload, remotePayload } from './syncPolicy';
import { remoteProfilePayload } from './accountSync';

export async function flushPendingOperations(now = Date.now()) {
  if (!supabase)
    return { synced: 0, pending: 0, failed: 0, failedOperations: [], authRequiredOperations: [] };
  const operations = await loadPendingOperations();
  let synced = 0;
  let failed = 0;
  let pending = 0;
  const syncedOperations = [];
  for (const item of operations) {
    if (!isReadyForSync(item, now)) {
      if (item.payload?._sync?.status === 'failed') failed += 1;
      else pending += 1;
      continue;
    }
    let result;
    const payload = remotePayload(item.payload);
    if (item.operation === 'community_post')
      result = await supabase.rpc('publish_queued_community_post', {
        operation_id: String(item.id),
        payload,
      });
    else if (item.operation === 'quote_request') {
      result = await supabase.from('quote_requests').insert(payload);
    } else if (item.operation === 'saved_item')
      result = payload.saved
        ? await supabase.from('saved_items').upsert(
            { user_id: payload.user_id, provider_id: payload.provider_id },
            {
              onConflict: 'user_id,provider_id',
              ignoreDuplicates: true,
            },
          )
        : await supabase
            .from('saved_items')
            .delete()
            .eq('user_id', payload.user_id)
            .eq('provider_id', payload.provider_id);
    else if (item.operation === 'profile_update')
      result = await supabase.from('profiles').upsert(
        remoteProfilePayload(payload.id, {
          name: payload.full_name,
          phone: payload.phone,
          location: payload.city,
        }),
        { onConflict: 'id' },
      );
    else if (item.operation === 'provider_report') {
      const report = { ...payload };
      delete report.user_id;
      result = await supabase.from('provider_reports').insert(report);
    } else if (item.operation === 'review_create')
      result = await supabase
        .from('reviews')
        .insert({
          user_id: payload.user_id,
          provider_id: payload.provider_id,
          rating: payload.rating,
          comment: payload.comment,
        })
        .select('id')
        .single();
    else if (item.operation === 'community_like')
      result = payload.liked
        ? await supabase
            .from('community_post_likes')
            .upsert(
              { post_id: payload.post_id, user_id: payload.user_id },
              { onConflict: 'post_id,user_id', ignoreDuplicates: true },
            )
        : await supabase
            .from('community_post_likes')
            .delete()
            .eq('post_id', payload.post_id)
            .eq('user_id', payload.user_id);
    else if (item.operation === 'community_saved_post')
      result = payload.saved
        ? await supabase
            .from('community_saved_posts')
            .upsert(
              { post_id: payload.post_id, user_id: payload.user_id },
              { onConflict: 'post_id,user_id', ignoreDuplicates: true },
            )
        : await supabase
            .from('community_saved_posts')
            .delete()
            .eq('post_id', payload.post_id)
            .eq('user_id', payload.user_id);
    else if (item.operation === 'community_comment')
      result = await supabase
        .from('community_comments')
        .insert({ post_id: payload.post_id, author_id: payload.author_id, body: payload.body });
    else if (item.operation === 'community_post_report')
      result = await supabase.from('community_post_reports').insert({
        post_id: payload.post_id,
        ...(payload.comment_id ? { comment_id: payload.comment_id } : {}),
        reporter_id: payload.reporter_id,
        reason: payload.reason,
      });
    else if (item.operation === 'community_block')
      result = await supabase
        .from('community_user_blocks')
        .upsert(
          { blocker_id: payload.blocker_id, blocked_id: payload.blocked_id },
          { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true },
        );
    else {
      const nextPayload = prepareQueuedPayload(
        item.payload,
        1,
        { status: 400, message: `Unsupported operation: ${item.operation}` },
        now,
      );
      await updatePendingOperation(item.id, nextPayload);
      failed += 1;
      continue;
    }
    if (result.error) {
      const attempts = Number(item.payload?._sync?.attempts || 0) + 1;
      const nextPayload = prepareQueuedPayload(item.payload, attempts, result.error, now);
      await updatePendingOperation(item.id, nextPayload);
      if (nextPayload._sync.status === 'failed') {
        failed += 1;
        recordError(result.error, { area: 'offline-sync', operation: item.operation }).catch(
          () => {},
        );
      } else pending += 1;
      continue;
    }
    if (item.operation === 'review_create' && item.payload?.localReviewId) {
      if (result.data?.id) await replaceLocalReviewId(item.payload.localReviewId, result.data.id);
      await markLocalReviewSynced(result.data?.id || item.payload.localReviewId);
    }
    if (item.operation === 'quote_request' && item.payload?.id)
      await markLocalQuoteSent(item.payload.id);
    if (item.operation === 'profile_update' && item.payload?.id)
      await markLocalProfileSynced(item.payload.id);
    if (item.operation === 'community_post' && item.payload?.localId)
      await removeLocalPost(item.payload.localId);
    await removePendingOperation(item.id);
    synced += 1;
    syncedOperations.push({ id: item.id, operation: item.operation, payload: item.payload });
  }
  const remaining = await reloadPendingOperations();
  return {
    synced,
    pending,
    failed,
    syncedOperations,
    failedOperations: remaining.filter((item) => item.payload?._sync?.status === 'failed'),
    authRequiredOperations: remaining.filter(
      (item) => item.payload?._sync?.status === 'auth_required',
    ),
  };
}
