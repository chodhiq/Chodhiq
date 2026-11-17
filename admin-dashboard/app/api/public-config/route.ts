// @ts-expect-error This module is provided by the Cloudflare Workers runtime.
import { env } from 'cloudflare:workers';

export const dynamic = 'force-dynamic';

type RuntimeEnv = {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
};

function validUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && parsed.hostname.endsWith('.supabase.co');
  } catch {
    return false;
  }
}

function validPublicKey(value: string) {
  return value.startsWith('sb_publishable_') || (value.split('.').length === 3 && value.length > 80);
}

export function GET() {
  const runtime = env as unknown as RuntimeEnv;
  const url = runtime.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const anonKey = runtime.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const headers = {
    'Cache-Control': 'no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
  };

  if (!validUrl(url) || !validPublicKey(anonKey)) {
    return Response.json({ configured: false }, { status: 503, headers });
  }

  return Response.json({ url, anonKey }, { headers });
}
