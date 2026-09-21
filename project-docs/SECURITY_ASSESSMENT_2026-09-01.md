# ChodhiQ Security Assessment

> Historical assessment from 2026-09-01. Revalidate its findings against the current release candidate; current readiness is tracked in `THREE_PRODUCT_READINESS.md` and `QA_RELEASE_EVIDENCE.md`.

Date: 2026-09-01  
Scope: customer Expo app, provider dashboard, admin dashboard, Supabase schema/RLS/storage, Edge Functions, payments, notifications, deployment configuration, dependencies, and CI.  
Target inspected: Supabase staging project `ljhncdzhzoatonhhofbv` (`ChodhiQ Staging`).

## Executive summary

The application has a sound security foundation: privileged operations generally verify the authenticated user server-side, admin authorization is derived from protected app metadata, Stripe webhook signatures are verified, payment inputs are allowlisted, sensitive storage buckets are private, and recent database functions use ownership/admin checks. No hardcoded production secrets, private keys, service-role keys, or obvious client-side code execution sinks were found.

The system is **not ready for an unqualified production security sign-off**. Two deployment-control findings are the immediate blockers:

1. The live staging database is missing migration `20260901120000_persistent_edge_rate_limits.sql`, while deployed security-sensitive functions depend on `consume_edge_rate_limit`.
2. The live project contains an active `deliver-provider-leads` Edge Function whose source is absent from the authoritative repository.

There is also a broken live database function (`admin_set_user_moderation` references a missing table), incomplete live RLS verification, an anonymously writable analytics table without abuse controls, missing security-header enforcement in the provider dashboard worker, and production dependency vulnerabilities in the mobile app.

Overall risk: **High until deployment drift and live authorization verification are resolved**.

## Remediation update — 2026-09-01

The following work was completed after the initial assessment:

- **SEC-01 closed in staging:** migrations `20260901120000` and `20260901130000` are applied, and local/remote migration history is aligned through `20260901130000`.
- **SEC-02 closed in staging/source:** `deliver-provider-leads` was recovered into the authoritative repository, reviewed, persistently rate-limited, changed to explicit internal-secret authentication (`verify_jwt=false`), typechecked, and redeployed as version 3.
- **SEC-03 closed in staging:** `user_moderation_status` now exists; state plus audit persistence uses the service-role-only transactional `record_user_moderation_change` RPC; Auth is compensated if the transaction fails. Linked DB lint no longer reports the ChodhiQ moderation error.
- **SEC-05 closed in staging:** direct anonymous/authenticated inserts into `mvp_events` were revoked. `ingest-mvp-event` validates a strict event allowlist and identifiers, caps payload size, hashes its network/installation limiter identity, rate-limits persistently, and is deployed as version 2. Staging returned 400 for invalid input and 202 for a marked valid test event.
- **SEC-06 code remediation complete:** both dashboard workers now enforce CSP, frame denial, MIME, referrer, permissions, and authenticated-response cache controls; `unsafe-eval` was removed. Host-level header validation still requires deployment of the dashboard builds.
- **SEC-08 closed in code/database:** provider websites are normalized and restricted to credential-free HTTPS URLs in customer code, at open time, and by a database constraint for new/updated records. Behavioral tests cover HTTP, JavaScript schemes, and embedded credentials.
- **SEC-09 partially closed:** native Supabase session persistence now uses Expo SecureStore with the OS keychain/keystore; web retains browser storage. Non-auth offline application data remains in AsyncStorage and should be minimized/expired according to data classification.
- **SEC-10 closed in staging:** moderation state and its audit entry are committed by one database transaction, eliminating the prior unaudited-state window.
- **SEC-11 closed for application functions in staging:** all non-extension security-definer functions now use `pg_catalog, public`; extension-owned routines are intentionally excluded.
- **SEC-12 code remediation complete:** CI now verifies the customer app, both dashboards, every Edge Function, production dependency audits, and key migration/source security invariants.

Verification after remediation:

- Customer: formatting, quality, accessibility, typecheck, 35 tests, security invariants, and Expo web export passed.
- Admin: lint, web/worker typechecks, all eight Edge Function typechecks, build, and 18 tests passed.
- Provider: lint, web/worker typechecks, build, and 14 tests passed.
- Staging function boundaries: unauthenticated lead-delivery and admin-control calls returned 401.
- Staging database lint now reports only PostGIS/extension findings, not the broken application moderation function.

Remaining gates:

- **SEC-04 partially verified:** after Docker became available, a fresh schema-only export of staging confirmed that all 42 public tables have RLS enabled, the expected owner/admin/participant policies are present, direct client insertion into `mvp_events` is absent, protected moderation/rate-limit tables are not client-mutable, and application security-definer functions have hardened search paths. The rollback-only authenticated cross-user/provider/admin fixture matrix still requires SQL execution access or signed-in test accounts.
- **SEC-06 deployment validation remains:** deploy both dashboard builds and inspect their real response headers.
- **SEC-07 remains:** the customer dependency tree still reports 27 production findings (10 high, 17 moderate). `npm audit fix` has no non-breaking remediation; the proposed fix requires a controlled Expo 54 to 57 migration and native regression testing.
- **SEC-09 residual:** classify, minimize, and expire offline non-auth data retained in AsyncStorage.
- Production host configuration remains incomplete: `EXPO_PUBLIC_EAS_PROJECT_ID`, `EXPO_PUBLIC_SENTRY_DSN`, and admin `SITE_URL` were not available to the launch-config check. No production deployment was performed.

## Findings

### SEC-01 — Rate-limit database migration is not deployed

Severity: **High**  
Affected: account deletion, checkout, push delivery, admin user controls, admin role controls.

The local migration `20260901120000_persistent_edge_rate_limits.sql` creates `consume_edge_rate_limit`, but the linked staging project only reports migrations through `20260831110000`. Current function source calls this RPC and deliberately fails closed when it is unavailable.

Impact: depending on which source version is deployed, protected operations may return 503 and become unavailable, or older deployed functions may lack the intended persistent abuse protection. This is both a security-control and availability drift.

Required action:

- Apply the migration to staging first.
- Exercise every dependent function and verify allowed, throttled, and recovery behavior.
- Promote the exact migration/function set together to production.
- Add a deployment check that rejects functions referencing absent database routines.

### SEC-02 — Deployed Edge Function is absent from source control

Severity: **High**  
Affected: provider lead delivery and deployment integrity.

The live staging project lists active function `deliver-provider-leads` version 1, but `supabase/functions/deliver-provider-leads/index.ts` does not exist in the authoritative workspace.

Impact: its authentication, destination handling, secret use, rate limiting, logging, and data disclosure cannot be reviewed or reproduced. An incident responder cannot reliably rebuild the deployed system from source.

Required action:

- Recover the exact deployed source into the repository and review it before launch, or undeploy the function if unused.
- Ensure it authenticates an internal caller or signed webhook, reloads canonical database records, limits destinations and payloads, rate-limits retries, redacts logs, and records delivery outcomes safely.
- Require source-controlled, digest-tracked deployments in CI/CD.

### SEC-03 — Broken moderation RPC in the live database

Severity: **High** for administrative availability; **Medium** for direct security impact.  
Affected: admin moderation.

Live `supabase db lint --linked --level warning` reports that `public.admin_set_user_moderation` references missing relation `public.user_moderation_status` (`42P01`). Customer repository code still calls this RPC. The newer `admin-user-control` Edge Function also expects the same moderation state table and attempts to compensate the Auth change when the state write fails.

Impact: moderation/suspension paths can fail. The Edge Function appears to fail closed and roll back the Auth update, but the stale RPC is definitively broken and alternative call paths can produce inconsistent operator behavior.

Required action:

- Decide on one canonical moderation architecture.
- Add the missing state table and RLS/audit model, or remove the stale RPC and all callers.
- Test suspend, unsuspend, protected-role, self-target, duplicate request, and partial-failure cases against staging.

### SEC-04 — Live RLS has not been comprehensively proven

Severity: **High launch gate**  
Affected: all Supabase data and storage.

Source review found extensive RLS, owner/admin predicates, private storage policies, and hardened security-definer functions. Anonymous reads of the public catalog behaved as expected. However, `db/RLS_AUDIT.sql` tests only `profiles`, and a full live schema/policy export could not run because Docker Desktop was unavailable. Database lint is not an authorization test.

Impact: a policy typo, grant drift, or unintended cross-tenant read/write may remain undetected.

Required action:

- Run a role matrix against the linked staging database for anonymous, customer A, customer B, provider owner, unrelated provider, admin, and service role.
- Cover every table, view, RPC, and storage bucket, including verification documents, quote attachments, moderation/audit records, subscriptions, notifications, bookings, claims, reviews, and provider lead deliveries.
- Assert denied cross-user reads and writes, not only successful owner operations.
- Keep the test rollback-only and make it part of release qualification.

### SEC-05 — Anonymous analytics ingestion is abuseable

Severity: **Medium–High**  
Affected: `public.mvp_events` and KPI reporting.

`mvp_events` permits anonymous inserts when `user_id` is null. Apart from a partial unique index for installs, there is no database or Edge Function rate limit, authenticated installation attestation, event allowlist evidence in the policy, or retention control visible in the migration.

Impact: attackers can poison analytics, inflate campaign/event metrics, and create unbounded database cost.

Required action:

- Put ingestion behind a rate-limited Edge Function.
- Allowlist event types and payload shape, cap payload sizes, and bind events to a rotating installation identifier.
- Add retention/aggregation and anomaly monitoring.

### SEC-06 — Provider dashboard security headers are not enforced at the worker boundary

Severity: **Medium**  
Affected: provider web dashboard.

The admin worker explicitly adds CSP, frame denial, referrer, permissions, MIME-sniffing, and cache headers. The provider worker does not. Both Next configurations contain a CSP with `script-src 'unsafe-inline' 'unsafe-eval'`; framework headers may not be preserved consistently through the Cloudflare/Vinext deployment path.

Impact: weaker protection against XSS exploitation, clickjacking, referrer leakage, MIME confusion, and sensitive-page caching. Browser-stored Supabase sessions increase the consequence of an XSS flaw.

Required action:

- Apply reviewed headers in the provider worker, matching or improving the admin worker.
- Remove `unsafe-eval`; migrate toward nonce/hash-based scripts and minimize `unsafe-inline`.
- Add HSTS at the host/edge, explicit HTTPS/WSS Supabase origins, `frame-ancestors 'none'`, and no-store for authenticated HTML/API responses.
- Validate headers on the actual deployed URLs.

### SEC-07 — Mobile production dependency vulnerabilities

Severity: **Medium–High**  
Affected: customer Expo app and build toolchain/runtime dependency tree.

The production dependency audit reported 27 vulnerabilities: 10 high and 17 moderate. Provider and admin production dependencies reported zero; their development dependency trees reported 20 and 22 vulnerabilities respectively.

Impact: exact exploitability depends on reachable code and platform, but high-severity production findings cannot be accepted without triage. The suggested automated resolution requires a major Expo-family upgrade and must not be applied blindly.

Required action:

- Capture the exact advisory tree, distinguish runtime from build-only exposure, and upgrade the Expo/Metro/PostCSS/navigation stack on a tested branch.
- Re-run mobile builds, native/runtime smoke tests, and `npm audit --omit=dev`.
- Define a documented exception only for demonstrably unreachable findings with an expiry date.

### SEC-08 — Unvalidated provider URLs reach native URL handlers

Severity: **Medium**  
Affected: customer provider-detail screen and provider profile editing.

Provider website values are length-cleaned but not scheme-allowlisted before being saved or passed to `Linking.openURL(provider.website)`. Campaign destinations, by contrast, require HTTPS.

Impact: a malicious or compromised provider record could invoke a non-HTTP deep-link scheme or an unexpected application handler on a customer device.

Required action:

- Normalize and validate websites at write time and again at open time.
- Permit only `https:` (or explicitly justified `http:`), reject credentials and malformed hosts, and show the destination host before leaving the app where appropriate.
- Apply equivalent validation to phone and other external-link fields.

### SEC-09 — Sensitive mobile state is stored in plaintext AsyncStorage

Severity: **Medium**  
Affected: Supabase refresh/session tokens, offline data, profile/avatar state, consent/preferences.

The mobile Supabase client persists sessions through AsyncStorage, and offline repositories also store user-associated data there. AsyncStorage is not hardware-backed secret storage.

Impact: tokens and queued personal data may be recoverable from a compromised, rooted, backed-up, or forensically accessed device.

Required action:

- Move authentication secrets to Expo SecureStore/OS keychain-backed storage.
- Minimize offline payloads, separate them per user, expire them, and encrypt genuinely sensitive queued content.
- Preserve targeted cleanup on sign-out; avoid relying on a broad storage clear as the security boundary.

### SEC-10 — Admin user-control audit can fail after state change

Severity: **Medium**  
Affected: administrative accountability.

`admin-user-control` compensates when the moderation-state write fails, but if the subsequent audit insert fails, the account and moderation state can remain changed while the request returns an error.

Impact: a privileged action may occur without its expected immutable audit record, and an operator may retry an already-applied action.

Required action:

- Move state transition and audit insertion into one transactional database function after the Auth mutation design is settled, or persist a durable outbox/reconciliation record.
- Make idempotency results queryable and alert on any audit persistence failure.

### SEC-11 — Security-definer search-path hardening is inconsistent

Severity: **Low–Medium**  
Affected: selected database RPCs.

Many newer functions correctly constrain `search_path` to `pg_catalog, public` or an empty path. Some functions still use `public` or `public, pg_temp`, including community/admin/quote workflow routines.

Impact: risk is limited while untrusted roles cannot create objects in referenced schemas, but inconsistent resolution rules increase future migration and privilege-escalation risk.

Required action:

- Revoke schema creation from untrusted roles explicitly.
- Use an empty or `pg_catalog, public` search path and schema-qualify all objects in every security-definer function.
- Add a lint query to reject unsafe security-definer definitions.

### SEC-12 — CI does not verify all deployable applications and security controls

Severity: **Medium**  
Affected: release integrity.

The GitHub quality workflow installs and tests only the root application, performs a web export, and runs the root production audit. It does not verify both dashboards, Edge Functions, migration parity, RLS tests, secret/config presence, worker security headers, or deploy-to-source digest parity.

Impact: dashboard or backend regressions and deployment drift can pass CI.

Required action:

- Add business/admin lint, typecheck, build, and tests.
- Typecheck/test every Edge Function and validate referenced RPCs against a disposable database.
- Add migration parity, RLS role-matrix tests, dependency audits per workspace, secret scanning, and post-deploy header/function smoke tests.

## Controls that passed review

- No hardcoded Stripe secret, Supabase service-role key, JWT private key, or private-key material was found in tracked source scans; environment files remain excluded from display and source control.
- `npm run security:check` passes.
- Customer, provider, and admin clients use only the public Supabase anonymous key; service-role credentials appear confined to server-side Edge Functions.
- Admin Edge Functions verify bearer tokens with Supabase Auth and enforce the server-issued admin role.
- Checkout validates plan identifiers, provider ownership/verification, allowed origins, and return URLs.
- Stripe webhook handling verifies signatures and implements event claiming/idempotency behavior.
- Private verification and quote-attachment access uses signed URLs or participant/owner/admin policy checks; admin verification links expire after 120 seconds.
- No `eval`, `new Function`, or `dangerouslySetInnerHTML` usage was found in application source.
- Admin role control protects self-revocation, protected roles, and last-admin conditions, and compensates role changes when audit persistence fails.
- Public campaign links are restricted to HTTPS in the customer app.

## Verification limitations

- A complete live schema/RLS export was attempted but could not run because the local Docker Desktop engine was unavailable. Therefore live policy equivalence to migrations remains unproven.
- Authenticated browser smoke testing was not completed because no connected signed-in browser session was available.
- Host-level environment values and secret values were not exposed or copied. Earlier configuration checks found missing customer `EXPO_PUBLIC_EAS_PROJECT_ID` and `EXPO_PUBLIC_SENTRY_DSN`, and missing admin `SITE_URL`; those remain operational/security launch gates until confirmed in the real hosts.
- This assessment is a point-in-time review, not a penetration test, mobile binary reverse-engineering exercise, or infrastructure audit of Supabase/Cloudflare account settings.

## Recommended remediation order

1. Recover or remove `deliver-provider-leads`; apply the rate-limit migration; redeploy a source-controlled, digest-matched function set.
2. Fix the moderation data model/RPC and test administrative failure recovery.
3. Run the full live RLS/storage role matrix and correct every cross-tenant authorization failure before production.
4. Protect anonymous event ingestion and enforce provider-dashboard headers at the deployed worker.
5. Triage and remediate the mobile production dependency findings and validate native builds.
6. Validate/normalize all outbound URLs and move mobile session secrets to secure storage.
7. Expand CI and post-deployment checks so these controls cannot drift again.

## Launch decision

**No-go for production security approval today.** The application can return to a conditional go decision after SEC-01 through SEC-04 are closed with staging evidence. SEC-05 through SEC-08 should also be closed before broad public exposure; the remaining findings should have owned, time-bounded remediation plans.
