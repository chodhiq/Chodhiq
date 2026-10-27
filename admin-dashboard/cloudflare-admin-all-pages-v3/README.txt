ChodhiQ Admin Dashboard — All-pages transition bundle

Extract this archive, open PowerShell in the extracted folder, then deploy the existing Worker:

  npx wrangler deploy --config .\server\wrangler.json

Worker name: chodhiq-admin-dashboard

Includes the shared route transition, common page styling, Worker code and static assets. No .env files or database migrations are included. The build used the existing public admin endpoint and anon key only as browser configuration and did not make database requests.