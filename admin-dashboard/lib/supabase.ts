import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

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
export const isSupabaseConfigured = validSupabaseUrl(url) && validPublicKey(key);
export const supabase = createClient(url || "https://placeholder.supabase.co", key || "placeholder", {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
