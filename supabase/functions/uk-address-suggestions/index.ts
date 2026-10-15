const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const apiKey = Deno.env.get('OS_PLACES_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!apiKey || !supabaseUrl || !serviceKey)
    return json({ error: 'Address search is not configured' }, 503);

  const network =
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown';
  if (network === 'unknown') return json({ error: 'Address search is unavailable' }, 503);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(network));
  const identifier = Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const limit = await checkRateLimit(admin, identifier, 'uk-address-suggestions', {
    maxRequests: 1200,
    windowSeconds: 3600,
  });
  if (!limit.allowed)
    return json(
      { error: limit.error ? 'Address search is unavailable' : 'Too many searches' },
      limit.error ? 503 : 429,
      limit.headers,
    );

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > 2048) return json({ error: 'Request is too large' }, 413);
  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > 2048)
    return json({ error: 'Request is too large' }, 413);

  let query: unknown;
  try {
    ({ query } = JSON.parse(rawBody));
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }
  if (typeof query !== 'string' || query.trim().length < 3 || query.length > 120)
    return json({ error: 'Enter at least 3 characters' }, 400);

  const endpoint = new URL('https://api.os.uk/search/places/v1/find');
  endpoint.searchParams.set('query', query.trim());
  endpoint.searchParams.set('maxresults', '8');
  endpoint.searchParams.set('output_srs', 'WGS84');

  try {
    const response = await fetch(endpoint, {
      headers: { key: apiKey },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      console.error('os_places_request_failed', { status: response.status });
      return json({ error: 'Address suggestions are unavailable' }, 502);
    }
    const payload = await response.json();
    const results = Array.isArray(payload?.results) ? payload.results : [];
    const suggestions = results
      .map((entry: any) => entry?.DPA)
      .filter((address: any) => address && typeof address.ADDRESS === 'string')
      .map((address: any) => ({
        label: address.ADDRESS,
        postcode: address.POSTCODE || '',
        town: address.POST_TOWN || address.POSTAL_TOWN || '',
        latitude: Number.isFinite(Number(address.LAT)) ? Number(address.LAT) : null,
        longitude: Number.isFinite(Number(address.LNG)) ? Number(address.LNG) : null,
      }));
    return json({ result: suggestions });
  } catch (error) {
    console.error('os_places_lookup_failed', {
      name: error instanceof Error ? error.name : 'unknown',
    });
    return json({ error: 'Address suggestions are unavailable' }, 502);
  }
});
import { createClient } from 'npm:@supabase/supabase-js@2.112.2';
import { checkRateLimit } from '../rate-limit-helper.ts';
