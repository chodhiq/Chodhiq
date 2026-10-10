import { createClient } from 'npm:@supabase/supabase-js@2.112.2';
import { matchesAnySecret } from '../secure-compare.ts';
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
async function tokenHash(token: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, '0')).join('');
}
Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const secret = request.headers.get('x-webhook-secret');
  if (
    !(await matchesAnySecret(secret, [
      Deno.env.get('PUSH_WEBHOOK_SECRET'),
      Deno.env.get('COMMUNITY_PUSH_WEBHOOK_SECRET'),
    ]))
  )
    return json({ error: 'Unauthorized' }, 401);
  const url = Deno.env.get('SUPABASE_URL'),
    key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return json({ error: 'Server configuration missing' }, 500);
  const admin = createClient(url, key, { auth: { persistSession: false } });
  const now = Date.now();
  const expired = await admin
    .from('push_delivery_attempts')
    .update({
      delivery_state: 'unknown',
      error_code: 'ReceiptExpired',
      receipt_checked_at: new Date(now).toISOString(),
    })
    .eq('delivery_state', 'accepted')
    .is('receipt_checked_at', null)
    .lt('created_at', new Date(now - 24 * 3600000).toISOString());
  if (expired.error) return json({ error: 'Receipt expiry update failed' }, 500);
  const pending = await admin
    .from('push_delivery_attempts')
    .select('id,expo_ticket_id,user_id,recipient_token_hash')
    .eq('delivery_state', 'accepted')
    .is('receipt_checked_at', null)
    .lt('created_at', new Date(now - 15 * 60000).toISOString())
    .gt('created_at', new Date(now - 24 * 3600000).toISOString())
    .limit(500);
  if (pending.error) return json({ error: 'Receipt queue lookup failed' }, 500);
  const rows = (pending.data || []).filter((row) => row.expo_ticket_id);
  if (!rows.length) return json({ checked: 0 });
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const access = Deno.env.get('EXPO_ACCESS_TOKEN');
  if (access) headers.Authorization = 'Bearer ' + access;
  let result;
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
      method: 'POST',
      headers,
      body: JSON.stringify({ ids: rows.map((row) => row.expo_ticket_id) }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return json({ error: 'Receipt provider unavailable' }, 502);
    result = await response.json();
  } catch {
    return json({ error: 'Receipt provider unavailable' }, 502);
  }
  let checked = 0,
    failed = 0;
  for (const row of rows) {
    const receipt = result.data?.[row.expo_ticket_id];
    if (!receipt || !['ok', 'error'].includes(receipt.status)) continue;
    const errorCode = receipt.details?.error || null;
    const update = await admin
      .from('push_delivery_attempts')
      .update({
        delivery_state: receipt.status === 'ok' ? 'receipt_ok' : 'failed',
        outcome: receipt.status === 'ok' ? 'delivered' : 'failed',
        error_code: errorCode,
        receipt_checked_at: new Date().toISOString(),
      })
      .eq('id', row.id)
      .eq('delivery_state', 'accepted');
    if (update.error) continue;
    checked++;
    if (receipt.status === 'error') failed++;
    if (errorCode === 'DeviceNotRegistered' && row.recipient_token_hash) {
      const profile = await admin
        .from('profiles')
        .select('expo_push_token')
        .eq('id', row.user_id)
        .maybeSingle();
      const token = profile.data?.expo_push_token;
      if (token && (await tokenHash(token)) === row.recipient_token_hash)
        await admin
          .from('profiles')
          .update({ expo_push_token: null })
          .eq('id', row.user_id)
          .eq('expo_push_token', token);
    }
  }
  return json({
    checked,
    failed,
    receiptMeaning: 'Provider acknowledgement; phone display still depends on OS permissions',
  });
});
