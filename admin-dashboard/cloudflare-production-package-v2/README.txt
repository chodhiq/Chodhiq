ChodhiQ Admin Dashboard — redesigned production bundle

Extract this archive, then deploy the existing Worker from the extracted folder:
  npx wrangler deploy --config server/wrangler.json

Includes the built Worker and browser assets. The build displays the PRODUCTION environment label and uses the production public Supabase URL and anon key. It does not include .env files, service-role credentials, database migrations, or Edge Functions.

Do not use this bundle as a Pages static-site upload; it is a Cloudflare Workers bundle.
