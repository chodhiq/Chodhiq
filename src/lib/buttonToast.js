const listeners = new Set();
const duplicateWindowMs = 1200;
let lastToastMessage = null;
let lastToastAt = 0;

export function showButtonToast(message, onRetry) {
  const now = Date.now();
  if (message === lastToastMessage && now - lastToastAt < duplicateWindowMs) return;
  lastToastMessage = message;
  lastToastAt = now;
  for (const listener of listeners) listener({ message, onRetry });
}

export function dismissButtonToast() {
  for (const listener of listeners) listener(null);
}

export function subscribeToButtonToasts(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
