const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

export function readBooleanFlag(value, fallback = false) {
  if (typeof value !== 'string') return fallback;
  return TRUE_VALUES.has(value.trim().toLowerCase());
}

// Demo content must be explicitly enabled. Production builds must never show
// invented marketplace, analytics, or moderation data by default.
export const DEMO_MODE = readBooleanFlag(process.env.EXPO_PUBLIC_DEMO_MODE, false);

export const RUNTIME = Object.freeze({
  demoMode: DEMO_MODE,
  hasSupabase: Boolean(
    process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  ),
});
