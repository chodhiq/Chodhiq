ChodhiQ Admin Dashboard — Cloudflare Worker bundle

Extract this archive, open PowerShell in the extracted folder, then deploy the existing Worker:

  npx wrangler deploy --config .\server\wrangler.json

Worker name: chodhiq-admin-dashboard

Contains Worker code and static browser assets. No .env files, database migrations, or service-role credentials are included. The build used the existing public admin endpoint and anon key as browser configuration only; no database requests were made during build.