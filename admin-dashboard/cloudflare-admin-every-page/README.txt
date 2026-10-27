ChodhiQ Admin Dashboard — Page-by-page redesign bundle

Extract this archive, open PowerShell in the extracted folder, then deploy the existing Worker:

  npx wrangler deploy --config .\server\wrangler.json

Worker name: chodhiq-admin-dashboard

Includes route-aware styling and shared page transitions for the admin routes, plus the Cloudflare Worker and browser assets. No .env files, database migrations, or service-role credentials are included. Build-time public admin configuration was embedded without making database requests.