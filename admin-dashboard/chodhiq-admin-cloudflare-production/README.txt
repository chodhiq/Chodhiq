ChodhiQ Admin Dashboard — Cloudflare Workers bundle

Deploy from this extracted folder with Wrangler:
  npx wrangler deploy --config server/wrangler.json

The bundle targets the existing Worker name in server/wrangler.json and includes the Worker output plus client assets. It does not include environment files, Supabase migrations, Edge Functions, or service-role credentials.

The existing Worker must retain its configured secrets for NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SITE_URL. The browser anon key is included in the compiled public client bundle by design. Never add a service-role key to this dashboard.
