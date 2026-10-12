import Stripe from 'npm:stripe@18.5.0';
import { createClient } from 'npm:@supabase/supabase-js@2.112.2';
import { checkRateLimit, RATE_LIMITS } from '../rate-limit-helper.ts';

const allowedOrigins = new Set(
  (Deno.env.get('ALLOWED_CHECKOUT_ORIGINS') || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
);
const corsFor = (req: Request): Record<string, string> => {
  const origin = req.headers.get('origin');
  return origin && allowedOrigins.has(origin)
    ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' }
    : {};
};
const json = (
  req: Request,
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsFor(req),
      ...extraHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
const safeReturnUrl = (value: unknown) => {
  if (typeof value !== 'string' || value.length > 500) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol === 'chodhiq:') return url.toString();
  if (url.protocol === 'https:' && allowedOrigins.has(url.origin)) return url.toString();
  const isLoopback =
    url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]';
  if (url.protocol === 'http:' && isLoopback && allowedOrigins.has(url.origin))
    return url.toString();
  return null;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS')
    return new Response('ok', {
      headers: {
        ...corsFor(req),
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405);
  if (Deno.env.get('ENABLE_PAYMENTS') !== 'true')
    return json(req, { error: 'Payments are currently unavailable' }, 503);
  try {
    const auth = req.headers.get('Authorization');
    if (!auth) return json(req, { error: 'Authentication required' }, 401);
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const client = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return json(req, { error: 'Invalid session' }, 401);
    const limit = await checkRateLimit(
      admin,
      user.id,
      'create-checkout-session',
      RATE_LIMITS.payment,
    );
    if (!limit.allowed)
      return json(
        req,
        { error: limit.error ? 'Rate limiter unavailable' : 'Too many checkout attempts' },
        limit.error ? 503 : 429,
        limit.headers,
      );
    const { providerId, planCode, successUrl, cancelUrl } = await req.json();
    if (typeof providerId !== 'string' || !/^[0-9a-f-]{36}$/i.test(providerId))
      return json(req, { error: 'Invalid provider' }, 400);
    const safeSuccessUrl = safeReturnUrl(successUrl),
      safeCancelUrl = safeReturnUrl(cancelUrl);
    if (!safeSuccessUrl || !safeCancelUrl) return json(req, { error: 'Invalid return URL' }, 400);
    const prices: Record<string, string | undefined> = {
      community: Deno.env.get('STRIPE_PRICE_COMMUNITY'),
      top10: Deno.env.get('STRIPE_PRICE_TOP10'),
      top5: Deno.env.get('STRIPE_PRICE_TOP5'),
    };
    if (!prices[planCode]) return json(req, { error: 'Unknown or unconfigured plan' }, 400);
    const { data: provider } = await admin
      .from('providers')
      .select('id,owner_id,is_verified,verification_status')
      .eq('id', providerId)
      .single();
    if (!provider || provider.owner_id !== user.id)
      return json(req, { error: 'Provider ownership required' }, 403);
    if (!provider.is_verified || provider.verification_status !== 'verified')
      return json(
        req,
        { error: 'Business verification is required before purchasing a paid plan' },
        403,
      );
    const { data: request, error } = await admin
      .from('subscription_requests')
      .insert({
        provider_id: providerId,
        requested_by: user.id,
        plan_code: planCode,
        status: 'pending',
      })
      .select('id')
      .single();
    if (error) throw error;
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: user.email,
      line_items: [{ price: prices[planCode]!, quantity: 1 }],
      success_url: safeSuccessUrl,
      cancel_url: safeCancelUrl,
      client_reference_id: providerId,
      metadata: { provider_id: providerId, plan_code: planCode, request_id: request.id },
      subscription_data: {
        metadata: { provider_id: providerId, plan_code: planCode, request_id: request.id },
      },
    });
    await admin
      .from('subscription_requests')
      .update({ status: 'checkout_created' })
      .eq('id', request.id);
    return json(req, { url: session.url });
  } catch (error) {
    console.error('checkout_failed', error);
    return json(req, { error: 'Checkout could not be created' }, 500);
  }
});
