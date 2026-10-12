import { createClient } from 'npm:@supabase/supabase-js@2.112.2';
import { checkRateLimit, RATE_LIMITS } from '../rate-limit-helper.ts';
import { timingSafeEqual } from '../secure-compare.ts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const secret = Deno.env.get('LEAD_DELIVERY_SECRET');
  if (!secret || !(await timingSafeEqual(request.headers.get('x-delivery-secret') ?? '', secret)))
    return json({ error: 'Unauthorized' }, 401);
  const url = Deno.env.get('SUPABASE_URL'),
    key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return json({ error: 'Server configuration missing' }, 500);
  const admin = createClient(url, key, { auth: { persistSession: false } });
  const limit = await checkRateLimit(
    admin,
    'lead-delivery-worker',
    'deliver-provider-leads',
    RATE_LIMITS.delivery,
  );
  if (!limit.allowed)
    return json(
      { error: limit.error ? 'Rate limiter unavailable' : 'Delivery rate limit exceeded' },
      limit.error ? 503 : 429,
    );
  const { data: rows, error } = await admin
    .from('provider_lead_deliveries')
    .select(
      'id,channel,destination,attempts,quote_request_id,providers(business_name),quote_requests(message)',
    )
    .eq('status', 'pending')
    .lt('attempts', 5)
    .order('created_at')
    .limit(25);
  if (error) return json({ error: 'Delivery queue lookup failed' }, 500);
  const results = [];
  for (const row of rows || []) {
    let sent = false,
      reason = 'channel_not_configured';
    const business =
      (row.providers as { business_name?: string } | null)?.business_name || 'your ChodhiQ listing';
    const message =
      (row.quote_requests as { message?: string } | null)?.message ||
      'A customer requested a quote.';
    try {
      if (
        row.channel === 'email' &&
        Deno.env.get('RESEND_API_KEY') &&
        Deno.env.get('LEAD_FROM_EMAIL')
      ) {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: Deno.env.get('LEAD_FROM_EMAIL'),
            to: [row.destination],
            subject: `New ChodhiQ quote request for ${business}`,
            text: `You have a new ChodhiQ lead.\n\n${message}\n\nSign in to the ChodhiQ business dashboard to respond.`,
          }),
        });
        sent = response.ok;
        reason = sent ? '' : 'email_provider_rejected';
      } else if (
        row.channel === 'whatsapp' &&
        Deno.env.get('WHATSAPP_ACCESS_TOKEN') &&
        Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')
      ) {
        const response = await fetch(
          `https://graph.facebook.com/v23.0/${Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${Deno.env.get('WHATSAPP_ACCESS_TOKEN')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: String(row.destination).replace(/\D/g, ''),
              type: 'text',
              text: {
                body: `New ChodhiQ quote request for ${business}. Sign in to your business dashboard to respond.`,
              },
            }),
          },
        );
        sent = response.ok;
        reason = sent ? '' : 'whatsapp_provider_rejected';
      }
    } catch {
      reason = 'delivery_request_failed';
    }
    await admin
      .from('provider_lead_deliveries')
      .update({
        status: sent ? 'sent' : reason === 'channel_not_configured' ? 'pending' : 'failed',
        attempts: row.attempts + 1,
        last_error: sent ? null : reason,
        delivered_at: sent ? new Date().toISOString() : null,
      })
      .eq('id', row.id);
    results.push({ id: row.id, sent, reason: sent ? undefined : reason });
  }
  return json({
    processed: results.length,
    results,
    configured: {
      email: Boolean(Deno.env.get('RESEND_API_KEY') && Deno.env.get('LEAD_FROM_EMAIL')),
      whatsapp: Boolean(
        Deno.env.get('WHATSAPP_ACCESS_TOKEN') && Deno.env.get('WHATSAPP_PHONE_NUMBER_ID'),
      ),
    },
  });
});
