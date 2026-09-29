import * as Sentry from '@sentry/react-native';

const redact = (value) =>
  String(value ?? '')
    .replace(/(https?:\/\/[^\s?#]+)\?[^\s#]*/gi, '$1?[redacted]')
    .replace(/([?&][^=&#\s]+)=([^&#\s]*)/g, '$1=[redacted]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, '[phone]')
    .replace(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
      '[id]',
    )
    .slice(0, 1000);

const redactValue = (value) => {
  if (typeof value === 'string') return redact(value);
  if (Array.isArray(value)) return value.map(redactValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [redact(key), redactValue(child)]),
    );
  }
  return value;
};

const sensitiveField =
  /^(?:email|user_?email|phone|mobile|name|full_?name|display_?name|message|notes|details|body|address|authorization|access_?token|refresh_?token|token)$/i;
const redactFields = (value) => {
  if (Array.isArray(value)) return value.map(redactFields);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        redact(key),
        sensitiveField.test(key) ? '[redacted]' : redactFields(child),
      ]),
    );
  }
  return redactValue(value);
};

export const redactSentryEvent = (event) => {
  if (!event || typeof event !== 'object') return event;
  const safeEvent = redactFields(event);
  if (safeEvent.message) safeEvent.message = redact(safeEvent.message);
  for (const exception of safeEvent.exception?.values || []) {
    if (exception.value) exception.value = redact(exception.value);
  }
  if (safeEvent.logentry?.message) safeEvent.logentry.message = redact(safeEvent.logentry.message);
  return safeEvent;
};

export const redactSentryText = redact;

const sanitizeContext = (context) =>
  Object.fromEntries(
    Object.entries(context)
      .filter(([key]) => !['email', 'phone', 'userId', 'message', 'notes', 'details'].includes(key))
      .map(([key, value]) => [redact(key), redact(value)]),
  );

/**
 * Capture an error with context
 * Usage: captureError(error, { operation: 'fetchProviders', userId })
 */
export const captureError = (error, context = {}) => {
  const safeContext = sanitizeContext(context);
  Sentry.captureException(error, {
    contexts: { app: safeContext },
    level: context.level || 'error',
  });
  if (__DEV__) console.error('[Sentry]', redact(error?.message), safeContext);
};

/**
 * Capture a message (for logging important events)
 * Usage: captureMessage('User signed up', 'info')
 */
export const captureMessage = (message, level = 'info') => {
  Sentry.captureMessage(message, level);
  console.log('[Sentry]', message);
};

/**
 * Set user context for error tracking
 * Usage: trackUser(userId, userEmail)
 */
export const trackUser = () => {
  Sentry.setUser(null);
};

/**
 * Clear user context (on logout)
 */
export const clearUser = () => {
  Sentry.setUser(null);
};

/**
 * Add breadcrumb for debugging
 * Usage: addBreadcrumb('searched for plumber', 'user-action')
 */
export const addBreadcrumb = (message, category = 'info', data = {}) => {
  Sentry.addBreadcrumb({
    message: redact(message),
    category: redact(category).slice(0, 100),
    data: sanitizeContext(data),
    timestamp: Date.now() / 1000,
  });
};

/**
 * Start a transaction for performance monitoring
 * Usage: const txn = startTransaction('loadAccount'); try { ... } finally { txn?.finish(); }
 */
export const startTransaction = (name, op = 'http.request') => {
  const span = Sentry.startInactiveSpan({ name: redact(name), op: redact(op) });
  return { finish: () => span.end() };
};

/**
 * Report critical errors (used for important operations)
 * Usage: reportCriticalError(error, 'payment-failed')
 */
export const reportCriticalError = (error, operation) => {
  captureError(error, {
    operation,
    level: 'fatal',
    timestamp: new Date().toISOString(),
  });
};
