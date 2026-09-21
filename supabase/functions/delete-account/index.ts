import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, RATE_LIMITS } from "../rate-limit-helper.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200, extraHeaders: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { ...cors, ...extraHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });

// Supabase's generated schema generics differ between CDN and npm builds; the
// storage surface used here is runtime-stable and intentionally isolated.
// deno-lint-ignore no-explicit-any
async function removeUserFiles(admin: any, bucket: string, prefix: string) {
  const paths: string[] = [];
  async function walk(path: string) {
    let offset = 0;
    while (true) {
      const { data, error } = await admin.storage.from(bucket).list(path, { limit: 100, offset });
      if (error) throw error;
      for (const item of data || []) {
        const next = `${path}/${item.name}`;
        if (item.id) paths.push(next); else await walk(next);
      }
      if (!data || data.length < 100) break;
      offset += data.length;
    }
  }
  await walk(prefix);
  for (let index = 0; index < paths.length; index += 100) {
    const { error } = await admin.storage.from(bucket).remove(paths.slice(index, index + 100));
    if (error) throw error;
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const authorization = request.headers.get("Authorization");
  if (!authorization) return json({ error: "Authentication required" }, 401);
  const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return json({ error: "Server configuration missing" }, 500);
  const caller = createClient(url, anon, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
  const { data: { user }, error: authError } = await caller.auth.getUser();
  if (authError || !user) return json({ error: "Invalid session" }, 401);
  const admin = createClient(url, service, { auth: { persistSession: false } });
  const limit = await checkRateLimit(admin, user.id, "delete-account", RATE_LIMITS.auth);
  if (!limit.allowed) return json({ error: limit.error ? "Rate limiter unavailable" : "Too many deletion attempts" }, limit.error ? 503 : 429, limit.headers);
  try {
    await Promise.all([removeUserFiles(admin, "verification-documents", user.id), removeUserFiles(admin, "provider-media", user.id)]);
    const { error: preparationError } = await admin.rpc("prepare_account_deletion", { target_user: user.id });
    if (preparationError) throw preparationError;
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;
    return json({ deleted: true });
  } catch (error) {
    console.error("account_deletion_failed", { userId: user.id, error: error instanceof Error ? error.message : "unknown" });
    return json({ error: "Account deletion could not be completed" }, 500);
  }
});
