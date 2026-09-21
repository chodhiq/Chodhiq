import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../rate-limit-helper.ts";
interface NotificationRow { id: string; user_id: string; title: string; body: string; type?: string; entity_type?: string; entity_id?: string }
interface WebhookPayload { type: "INSERT"; table: "notifications"; schema: "public"; record: NotificationRow }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const webhookSecret = Deno.env.get("PUSH_WEBHOOK_SECRET");
  if (!webhookSecret || request.headers.get("x-webhook-secret") !== webhookSecret) return json({ error: "Unauthorized" }, 401);
  const payload = await request.json().catch(() => null) as WebhookPayload | null;
  if (!payload?.record?.user_id || payload.type !== "INSERT" || payload.table !== "notifications") return json({ error: "Invalid notification webhook payload" }, 400);
  const url = Deno.env.get("SUPABASE_URL"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "Server configuration missing" }, 500);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const limit = await checkRateLimit(admin, payload.record.user_id, "push-notification", { maxRequests: 60, windowSeconds: 60 });
  if (!limit.allowed) return json({ error: limit.error ? "Rate limiter unavailable" : "Push delivery rate exceeded" }, limit.error ? 503 : 429);
  const { data: notification, error: notificationError } = await admin.from("notifications")
    .select("id,user_id,title,body,type,entity_type,entity_id").eq("id", payload.record.id).eq("user_id", payload.record.user_id).maybeSingle();
  if (notificationError) return json({ error: "Notification lookup failed" }, 500);
  if (!notification) return json({ error: "Notification does not exist" }, 404);
  const { data: profile, error } = await admin.from("profiles").select("expo_push_token").eq("id", notification.user_id).maybeSingle();
  if (error) return json({ error: "Push recipient lookup failed" }, 500);
  if (!profile?.expo_push_token) return json({ skipped: "No registered push token" });
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json", "Accept-Encoding": "gzip, deflate" };
  const accessToken = Deno.env.get("EXPO_ACCESS_TOKEN"); if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const response = await fetch("https://exp.host/--/api/v2/push/send", { method: "POST", headers, body: JSON.stringify({ to: profile.expo_push_token, sound: "default", title: notification.title, body: notification.body, data: { notificationId: notification.id, type: notification.type, entityType: notification.entity_type, entityId: notification.entity_id } }) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) return json({ error: "Expo push delivery failed", result }, 502);
  return json({ delivered: true, result });
});
