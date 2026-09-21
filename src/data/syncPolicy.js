// @ts-check
export const MAX_SYNC_ATTEMPTS = 5;

const PERMANENT_CODES = new Set(['23503', '23505', '23514', '42501', 'PGRST116']);

export function classifySyncError(error = {}) {
  const status = Number(error.status || error.statusCode || 0);
  const permanent =
    PERMANENT_CODES.has(String(error.code || '')) ||
    (status >= 400 && status < 500 && status !== 408 && status !== 429);
  return permanent ? 'permanent' : 'retryable';
}

export function nextRetryAt(attempts, now = Date.now()) {
  const delay = Math.min(30 * 60 * 1000, 1000 * 2 ** Math.max(0, attempts - 1));
  return new Date(now + delay).toISOString();
}

export function prepareQueuedPayload(payload, attempts, error, now = Date.now()) {
  const classification = classifySyncError(error);
  const exhausted = attempts >= MAX_SYNC_ATTEMPTS;
  return {
    ...payload,
    _sync: {
      attempts,
      status: classification === 'permanent' || exhausted ? 'failed' : 'pending',
      nextAttemptAt:
        classification === 'permanent' || exhausted ? null : nextRetryAt(attempts, now),
      lastError: String(error?.message || 'Synchronization failed').slice(0, 240),
    },
  };
}

export function isReadyForSync(item, now = Date.now()) {
  const sync = item.payload?._sync;
  return (
    sync?.status !== 'failed' && (!sync?.nextAttemptAt || Date.parse(sync.nextAttemptAt) <= now)
  );
}

export function remotePayload(payload) {
  const source = payload?.remote || payload || {};
  const { _sync, ...clean } = source;
  return clean;
}
