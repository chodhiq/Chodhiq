# Monitoring and alerting

The applications emit structured errors to their platform logs. Production should route those logs to one central alerting service before launch.

## Required alerts

- Supabase Edge Function error rate above 2% for five minutes.
- Stripe webhook signature failures or three consecutive delivery failures.
- Push-notification function failures above 5% for ten minutes.
- Admin and business dashboard HTTP 5xx responses.
- Database connection exhaustion, storage upload failures, and RLS permission errors.
- No successful synthetic authenticated journey for 30 minutes.

## Recommended setup

1. Connect Cloudflare Worker logs and Supabase logs to Sentry, Datadog, or the team’s approved equivalent.
2. Store DSNs/tokens only in Cloudflare and Supabase secrets; never use a `NEXT_PUBLIC_` secret.
3. Use environment tags (`staging`, `production`) and release commit hashes.
4. Redact authorization headers, emails, phone numbers, quote messages, review text, booking notes, and document paths.
5. Route warning alerts to the operations channel and paging alerts to the named on-call owner.
6. Run the authenticated journey in `tests/authenticated-workflows.mjs` against staging only.

## Synthetic journey

The staging monitor should create isolated fictional accounts, then verify: customer review creation; quote creation; owner response; customer receipt; booking request; owner confirmation; admin visibility. Delete or expire these fixtures through the reviewed staging reset procedure.
