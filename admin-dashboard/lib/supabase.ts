import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Production credentials come from the Worker's runtime secrets through /api/public-config.
// Never embed a developer's .env.local values in the production browser bundle.
const url = process.env.NODE_ENV === "production" ? "" : process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NODE_ENV === "production" ? "" : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function validSupabaseUrl(value: string) {
  try {
    const parsed = new URL(value);
    const hosted = parsed.protocol === "https:" && parsed.hostname.endsWith(".supabase.co");
    const local = process.env.NODE_ENV !== "production" && parsed.protocol === "http:" && ["127.0.0.1", "localhost"].includes(parsed.hostname);
    return hosted || local;
  } catch { return false; }
}
function validPublicKey(value: string) {
  return value.startsWith("sb_publishable_") || (value.split(".").length === 3 && value.length > 80);
}
function createSupabaseClient(supabaseUrl: string, publicKey: string): SupabaseClient {
  return createClient(supabaseUrl, publicKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
}

export let isSupabaseConfigured = validSupabaseUrl(url) && validPublicKey(key);
export let supabase = createSupabaseClient(
  isSupabaseConfigured ? url : "https://placeholder.supabase.co",
  isSupabaseConfigured ? key : "placeholder",
);

let runtimeConfiguration: Promise<boolean> | undefined;

/** Load the public credentials from the Worker at runtime when the build has no production values. */
export function initializeSupabase(): Promise<boolean> {
  if (isSupabaseConfigured) return Promise.resolve(true);
  if (typeof window === "undefined") return Promise.resolve(false);
  runtimeConfiguration ??= fetch("/api/public-config", { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) return false;
      const config = (await response.json()) as { url?: unknown; anonKey?: unknown };
      if (
        typeof config.url !== "string" ||
        typeof config.anonKey !== "string" ||
        !validSupabaseUrl(config.url) ||
        !validPublicKey(config.anonKey)
      ) return false;
      supabase = createSupabaseClient(config.url, config.anonKey);
      isSupabaseConfigured = true;
      return true;
    })
    .catch(() => false);
  return runtimeConfiguration;
}
