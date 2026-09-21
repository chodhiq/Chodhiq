import { supabase } from '../lib/supabase';
import {
  loadPendingOperations,
  removeLocalPost,
  removePendingOperation,
  updatePendingOperation,
} from './localDatabase';
import { recordError } from '../lib/telemetry';
import { isReadyForSync, prepareQueuedPayload, remotePayload } from './syncPolicy';

export async function flushPendingOperations(now = Date.now()) {
  if (!supabase) return { synced: 0, pending: 0, failed: 0 };
  const operations = await loadPendingOperations();
  let synced = 0;
  let failed = 0;
  let pending = 0;
  for (const item of operations) {
    if (!isReadyForSync(item, now)) {
      if (item.payload?._sync?.status === 'failed') failed += 1;
      else pending += 1;
      continue;
    }
    let result;
    const payload = remotePayload(item.payload);
    if (item.operation === 'community_post')
      result = await supabase.from('community_posts').insert(payload);
    else if (item.operation === 'quote_request')
      result = await supabase.from('quote_requests').insert(payload);
    else if (item.operation === 'provider_report')
      result = await supabase.from('provider_reports').insert(payload);
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
    if (item.operation === 'community_post' && item.payload?.localId)
      await removeLocalPost(item.payload.localId);
    await removePendingOperation(item.id);
    synced += 1;
  }
  return { synced, pending, failed };
}
