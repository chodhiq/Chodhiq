import { Platform } from 'react-native';
import { supabase } from './supabase';

const redact = (value) =>
  String(value || 'Unknown error')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2}/gi, '[email]')
    .replace(/(?:\+?\d[\d\s().-]{7}\d)/g, '[phone]')
    .slice(0, 1000);

export async function recordError(error, context = {}) {
  const event = {
    message: redact(error?.message || error),
    error_name: redact(error?.name || 'Error').slice(0, 100),
    platform: Platform.OS,
    app_area: redact(context.area || 'unknown').slice(0, 100),
    metadata: {
      fatal: Boolean(context.fatal),
      operation: redact(context.operation || '').slice(0, 100),
    },
  };
  if (__DEV__) console.error('[ChodhiQ error]', event);
  if (!supabase) return;
  await supabase
    .from('app_error_events')
    .insert(event)
    .catch(() => {});
}
