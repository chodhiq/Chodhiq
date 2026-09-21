# Observability and security operations

- Generate a correlation ID for every privileged request and include it in structured Edge Function logs and audit details.
- Log action name, outcome, actor ID, entity ID, latency, and failure class. Never log JWTs, service-role keys, signed document URLs, raw evidence paths, passwords, or full private records.
- Alert on audit-write failures, repeated authorization failures, rate-limit breaches, and Auth/database compensation failures.
- Route `partial_failure` responses to an operator reconciliation queue before allowing retries.
- Configure `ADMIN_ALLOWED_ORIGINS` with exact staging and production origins; wildcard CORS is forbidden.
- Apply rate limiting at the edge to login and privileged functions. Supabase Auth rate limits remain enabled as a second layer.
- Keep verification signed URLs at two minutes and the bucket private.
- Serve the dashboard with `Cache-Control: no-store` for authenticated data and configure CSP, HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, and frame restrictions at the hosting edge.
- Verify browser bundles contain only the public Supabase URL and publishable/anonymous key.
- Keep production and staging projects, credentials, storage buckets, and Sites projects separate.
