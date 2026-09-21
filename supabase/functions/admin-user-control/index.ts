import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit, RATE_LIMITS } from '../rate-limit-helper.ts';

const allowedOrigins = (
  Deno.env.get('ADMIN_ALLOWED_ORIGINS') ?? 'http://localhost:3000,http://localhost:3012'
)
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const cors = (origin: string | null) => ({
  'Access-Control-Allow-Origin':
    origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  Vary: 'Origin',
});
const json = (
  origin: string | null,
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors(origin),
      ...extraHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (request) => {
  const origin = request.headers.get('Origin');
  if (request.method === 'OPTIONS')
    return new Response(null, { status: 204, headers: cors(origin) });
  if (request.method !== 'POST') return json(origin, { error: 'Method not allowed' }, 405);
  if (origin && !allowedOrigins.includes(origin))
    return json(origin, { error: 'Origin not allowed' }, 403);
  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authorization = request.headers.get('Authorization') || '';
  const callerClient = createClient(url, anon, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: callerData, error: callerError } = await callerClient.auth.getUser();
  const caller = callerData.user;
  if (callerError || !caller) return json(origin, { error: 'Session expired' }, 401);
  if (caller.app_metadata?.role !== 'admin')
    return json(origin, { error: 'Administrator access required' }, 403);

  const admin = createClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const limit = await checkRateLimit(admin, caller.id, 'admin-user-control', RATE_LIMITS.mutation);
  if (!limit.allowed)
    return json(
      origin,
      { error: limit.error ? 'Rate limiter unavailable' : 'Too many administrative actions' },
      limit.error ? 503 : 429,
      limit.headers,
    );

  const { userId, action, reason, idempotencyKey } = await request.json().catch(() => ({}));
  if (
    !uuid.test(userId ?? '') ||
    !uuid.test(idempotencyKey ?? '') ||
    !['suspend', 'reactivate'].includes(action)
  )
    return json(origin, { error: 'Invalid user action' }, 400);
  if (userId === caller.id)
    return json(origin, { error: 'Administrators cannot suspend their own account' }, 409);
  if (typeof reason !== 'string' || reason.trim().length < 8 || reason.trim().length > 500)
    return json(origin, { error: 'Provide a reason between 8 and 500 characters' }, 400);

  const { data: targetData, error: targetError } = await admin.auth.admin.getUserById(userId);
  if (targetError || !targetData.user) return json(origin, { error: 'User not found' }, 404);
  if (['admin', 'super_admin', 'owner'].includes(String(targetData.user.app_metadata?.role ?? '')))
    return json(
      origin,
      { error: 'Protected accounts require a separate break-glass procedure' },
      409,
    );

  const priorStatus =
    targetData.user.banned_until && new Date(targetData.user.banned_until) > new Date()
      ? 'suspended'
      : 'active';
  const status = action === 'suspend' ? 'suspended' : 'active';
  if (priorStatus === status) return json(origin, { status, idempotent: true });
  const banDuration = action === 'suspend' ? '876000h' : 'none';
  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: banDuration,
  });
  if (updateError) return json(origin, { error: 'Authentication state could not be updated' }, 502);
  const { error: stateError } = await admin.rpc('record_user_moderation_change', {
    target_user_id: userId,
    next_status: status,
    moderation_reason: reason.trim(),
    actor_user_id: caller.id,
    request_id: idempotencyKey,
    previous_status: priorStatus,
  });
  if (stateError) {
    const compensation = await admin.auth.admin.updateUserById(userId, {
      ban_duration: priorStatus === 'suspended' ? '876000h' : 'none',
    });
    return json(
      origin,
      {
        error: compensation.error
          ? 'Auth and moderation state diverged'
          : 'Database and audit update failed; the Auth change was rolled back',
      },
      500,
    );
  }
  return json(origin, { status });
});
