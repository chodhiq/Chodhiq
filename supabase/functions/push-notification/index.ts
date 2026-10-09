import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit } from '../rate-limit-helper.ts';
interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type?: string;
  entity_type?: string;
  entity_id?: string;
}
interface WebhookPayload {
  type: 'INSERT';
  table: 'notifications';
  schema: 'public';
  record: NotificationRow;
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const webhookSecret = Deno.env.get('PUSH_WEBHOOK_SECRET');
  const communityWebhookSecret = Deno.env.get('COMMUNITY_PUSH_WEBHOOK_SECRET');
  const suppliedSecret = request.headers.get('x-webhook-secret');
  if (
    !suppliedSecret ||
    ![webhookSecret, communityWebhookSecret].filter(Boolean).includes(suppliedSecret)
  )
    return json({ error: 'Unauthorized' }, 401);
  const payload = (await request.json().catch(() => null)) as WebhookPayload | null;
  if (!payload?.record?.user_id || payload.type !== 'INSERT' || payload.table !== 'notifications')
    return json({ error: 'Invalid notification webhook payload' }, 400);
  const url = Deno.env.get('SUPABASE_URL'),
    serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return json({ error: 'Server configuration missing' }, 500);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const limit = await checkRateLimit(admin, payload.record.user_id, 'push-notification', {
    maxRequests: 60,
    windowSeconds: 60,
  });
  if (!limit.allowed)
    return json(
      { error: limit.error ? 'Rate limiter unavailable' : 'Push delivery rate exceeded' },
      limit.error ? 503 : 429,
    );
  const { data: notification, error: notificationError } = await admin
    .from('notifications')
    .select('id,user_id,title,body,type,entity_type,entity_id')
    .eq('id', payload.record.id)
    .eq('user_id', payload.record.user_id)
    .maybeSingle();
  if (notificationError) return json({ error: 'Notification lookup failed' }, 500);
  if (!notification) return json({ error: 'Notification does not exist' }, 404);
  const { data: profile, error } = await admin
    .from('profiles')
    .select('expo_push_token,push_vibration_enabled,push_channel_id')
    .eq('id', notification.user_id)
    .maybeSingle();
  if (error) return json({ error: 'Push recipient lookup failed' }, 500);
  if (!profile?.expo_push_token) {
    await admin
      .from('push_delivery_attempts')
      .insert({
        notification_id: notification.id,
        user_id: notification.user_id,
        outcome: 'skipped',
        delivery_state: 'skipped',
        provider_status: 'no_token',
        error_code: 'NoRegisteredPushToken',
      });
    return json({ skipped: 'No registered push token' });
  }
  const previous = await admin
    .from('push_delivery_attempts')
    .select('id')
    .eq('notification_id', notification.id)
    .in('delivery_state', ['accepted', 'receipt_ok'])
    .limit(1);
  if (previous.error) return json({ error: 'Delivery history lookup failed' }, 500);
  if (previous.data?.length) return json({ accepted: true, alreadySubmitted: true });
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Accept-Encoding': 'gzip, deflate',
  };
  const accessToken = Deno.env.get('EXPO_ACCESS_TOKEN');
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  let response;
  try {
    response = await fetch('https://exp.host/--/api/v2/push/send', {
      signal: AbortSignal.timeout(10000),
      method: 'POST',
      headers,
      body: JSON.stringify({
        to: profile.expo_push_token,
        sound: 'default',
        priority: 'high',
        channelId: profile.push_channel_id || 'default',
        title: notification.title,
        body: notification.body,
        data: {
          notificationId: notification.id,
          userId: notification.user_id,
          type: notification.type,
          entityType: notification.entity_type,
          entityId: notification.entity_id,
        },
      }),
    });
  } catch {
    await admin
      .from('push_delivery_attempts')
      .insert({
        notification_id: notification.id,
        user_id: notification.user_id,
        outcome: 'failed',
        delivery_state: 'unknown',
        provider_status: 'unconfirmed',
        error_code: 'PushProviderUnavailable',
      });
    return json({ error: 'Push submission could not be confirmed' }, 502);
  }
  const result = await response.json().catch(() => ({}));
  const ticket = Array.isArray(result.data) ? result.data[0] : result.data;
  const accepted = response.ok && ticket?.status === 'ok';
  const tokenDigest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(profile.expo_push_token),
  );
  const recipientTokenHash = [...new Uint8Array(tokenDigest)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
  await admin
    .from('push_delivery_attempts')
    .insert({
      notification_id: notification.id,
      user_id: notification.user_id,
      outcome: accepted ? 'accepted' : 'failed',
      delivery_state: accepted ? 'accepted' : 'failed',
      expo_ticket_id: accepted ? ticket.id : null,
      recipient_token_hash: recipientTokenHash,
      provider_status: ticket?.status || String(response.status),
      error_code: ticket?.details?.error || null,
    });
  if (ticket?.details?.error === 'DeviceNotRegistered') {
    await admin
      .from('profiles')
      .update({ expo_push_token: null })
      .eq('id', notification.user_id)
      .eq('expo_push_token', profile.expo_push_token);
  }
  if (!accepted) return json({ error: 'Expo push delivery failed' }, 502);
  // A push ticket confirms Expo accepted the message; device delivery requires its receipt.
  return json({ accepted: true, ticketId: ticket.id });
});
