import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit } from '../rate-limit-helper.ts';

const allowedEvents = new Set([
  'install',
  'signup',
  'offer_view',
  'event_view',
  'community_resource_view',
]);
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function digest(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > 4096) return json({ error: 'Payload too large' }, 413);

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) return json({ error: 'Server configuration missing' }, 500);
  const body = await request.json().catch(() => ({}));
  const eventType = typeof body.eventType === 'string' ? body.eventType : '';
  const installationId = typeof body.installationId === 'string' ? body.installationId.trim() : '';
  const entityId =
    typeof body.entityId === 'string' && uuid.test(body.entityId) ? body.entityId : null;
  if (!allowedEvents.has(eventType) || !/^[A-Za-z0-9_-]{16,100}$/.test(installationId))
    return json({ error: 'Invalid analytics event' }, 400);

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const network =
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown';
  const identifier = await digest(`${network}:${installationId}`);
  const limit = await checkRateLimit(admin, identifier, 'ingest-mvp-event', {
    maxRequests: 60,
    windowSeconds: 3600,
  });
  if (!limit.allowed)
    return json(
      { error: limit.error ? 'Rate limiter unavailable' : 'Too many events' },
      limit.error ? 503 : 429,
      limit.headers,
    );

  let userId: string | null = null;
  const authorization = request.headers.get('Authorization') ?? '';
  if (authorization.startsWith('Bearer ')) {
    const caller = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data } = await caller.auth.getUser();
    userId = data.user?.id ?? null;
  }
  const { error } = await admin
    .from('mvp_events')
    .insert({
      event_type: eventType,
      installation_id: installationId,
      user_id: userId,
      entity_id: entityId,
    });
  if (error?.code === '23505' && eventType === 'install')
    return json({ accepted: true, duplicate: true }, 202);
  if (error) return json({ error: 'Event could not be recorded' }, 500);
  return json({ accepted: true }, 202);
});
