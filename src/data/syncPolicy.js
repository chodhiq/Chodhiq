// @ts-check
export const MAX_SYNC_ATTEMPTS = 5;

const PERMANENT_CODES = new Set(['23503', '23505', '23514', '42501', 'PGRST116']);

/** @param {any} error */
export function isAuthSessionError(error = {}) {
  error = error || {};
  const code = String(error.code || '').toUpperCase();
  const status = Number(error.status || error.statusCode || 0);
  const message = String(error.message || '').toLowerCase();
  return (
    status === 401 ||
    ['PGRST301', 'JWT_EXPIRED', 'INVALID_JWT', 'AUTHENTICATION_FAILED'].includes(code) ||
    /jwt expired|invalid jwt|invalid refresh token|session.*expired|not authenticated/.test(message)
  );
}

/** @param {any} error */
export function classifySyncError(error = {}) {
  error = error || {};
  if (isAuthSessionError(error)) return 'auth_required';
  const status = Number(error.status || error.statusCode || 0);
  const permanent =
    PERMANENT_CODES.has(String(error.code || '')) ||
    (status >= 400 && status < 500 && status !== 408 && status !== 429);
  return permanent ? 'permanent' : 'retryable';
}

/** @param {number} attempts @param {number} [now] */
export function nextRetryAt(attempts, now = Date.now()) {
  const delay = Math.min(30 * 60 * 1000, 1000 * 2 ** Math.max(0, attempts - 1));
  return new Date(now + delay).toISOString();
}

/** @param {any} payload @param {number} attempts @param {any} error @param {number} [now] */
export function prepareQueuedPayload(payload, attempts, error, now = Date.now()) {
  const classification = classifySyncError(error);
  const exhausted = attempts >= MAX_SYNC_ATTEMPTS;
  const retryVersion = Number(payload?._sync?.retryVersion || 0);
  if (classification === 'auth_required') {
    return {
      ...payload,
      _sync: {
        attempts: Math.max(0, attempts - 1),
        status: 'auth_required',
        nextAttemptAt: null,
        lastError: 'Please sign in again',
        retryVersion,
      },
    };
  }
  return {
    ...payload,
    _sync: {
      attempts,
      status: classification === 'permanent' || exhausted ? 'failed' : 'pending',
      nextAttemptAt:
        classification === 'permanent' || exhausted ? null : nextRetryAt(attempts, now),
      lastError: String(error?.message || 'Synchronization failed').slice(0, 240),
      retryVersion,
    },
  };
}

/** @param {any} item @param {number} [now] */
export function isReadyForSync(item, now = Date.now()) {
  const sync = item.payload?._sync;
  return (
    sync?.status !== 'failed' &&
    sync?.status !== 'auth_required' &&
    (!sync?.nextAttemptAt || Date.parse(sync.nextAttemptAt) <= now)
  );
}

/** @param {any} payload */
export function remotePayload(payload) {
  const source = payload?.remote || payload || {};
  const { _sync, ...clean } = source;
  return clean;
}
