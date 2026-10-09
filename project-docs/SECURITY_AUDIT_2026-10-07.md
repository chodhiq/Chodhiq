# ChodhiQ security audit — 2026-10-07

## Decision

**The `spatial_ref_sys` Advisor warning alone does not block beta distribution.** The live project shows PostGIS's `public.spatial_ref_sys` relation without RLS and grants originating from `supabase_admin`. Supabase's current PostGIS guidance identifies this as an expected platform warning, not a data exposure risk: the table holds built-in coordinate reference definitions, not ChodhiQ customer data. The SQL Editor reports `current_user=postgres`, `rolsuper=false`, and no membership in `supabase_admin`, explaining why a revoke from that session cannot alter the platform-owned grants. No production setting was changed.

**Workspace code verification passed** across the customer app, provider dashboard, admin dashboard, and static site. That is not a production database/security sign-off. This report covers source review and the production evidence visible in the dashboard, and lists live-coverage gaps separately. An earlier version incorrectly treated the PostGIS warning as a critical exposure; that assessment was corrected after reviewing Supabase guidance and the role/grant evidence.

## What was examined

- Root customer Expo app (JavaScript/TypeScript, auth/session storage, URL handling, data repositories, local persistence, maps/location, notifications, sync, app config and build inclusion rules).
- Provider and admin web apps (auth and role gates, tenant query scope, mutations, uploads, rendering sinks, framework/worker configuration and security headers).
- Coming-soon static site (routes, rendering sinks, config, and build output).
- Shared Supabase migration history in the workspace, table/policy/grant definitions, SECURITY DEFINER functions, storage policies, triggers, Edge Functions and function authentication/validation/rate-limit code.
- CI, security/secret scan implementation, release scripts, prior security/readiness reports and current Git worktree state.
- Read-only production Supabase Security Advisor, table view and direct table privilege query while the dashboard was available.
- Workspace-defined `npm run verify:all` and security scans.

Not performed: penetration testing, destructive or write probes, native APK/IPA reverse engineering, device forensics, Cloudflare/Supabase account-wide IAM review, production migration/deployment, and authenticated role-matrix testing.

## Findings

### F-01 — INFORMATIONAL: expected Supabase/PostGIS public-schema warning

**Status: confirmed live, disposition clarified by current Supabase documentation.** Security Advisor labels `public.spatial_ref_sys` “RLS Disabled in Public” (CRITICAL). Read-only query output showed grants to `anon` and `authenticated` whose grantor and table owner are `supabase_admin`. The follow-up role query showed SQL Editor runs as `postgres`, which is not a superuser and is not a member of `supabase_admin`. These are Supabase-managed extension grants; the earlier revoke attempt had no effect and should not be repeated.

Supabase documents this PostGIS relation as built-in coordinate reference metadata and says the Advisor warning is expected, not a data exposure risk. It does not contain ChodhiQ customer records. This is not evidence of an application data breach.

The workspace audit continues to exclude this extension-owned relation from the customer-table RLS invariant and documents why. This is consistent with Supabase's guidance for the managed PostGIS installation.

No database change is recommended from the SQL Editor. If clearing the Advisor warning is desired, Supabase's PostGIS guide recommends relocating the extension out of an exposed schema; for an existing installation, contact Supabase Support to assess managed relocation. The documented self-service route requires a verified backup and rebuilding the extension/dependencies, so it is not an appropriate ad hoc production SQL change.

### F-02 — MEDIUM: Quote creation lacks an evident account-level abuse limit

The mobile repository directly inserts into `quote_requests`; database RLS scopes rows to their owner, but no insert throttle was found. Each insert triggers an in-app provider notification and a provider lead delivery queue row, with outbound email/WhatsApp delivery paths. A valid account may therefore generate high volume for one or multiple providers, causing spam, delivery costs and operational load. This is a source-review finding; no requests were sent.

**Workspace remediation prepared, not deployed:** migration `20261007130000_quote_request_rate_limits.sql` adds a `BEFORE INSERT` trigger, binds authenticated inserts to `auth.uid()`, permits at most five requests per account per hour, and validates new message/contact values before notification and delivery triggers. Offline queue sync is covered too. A database test asserts forged-user and over-limit inserts are rejected. The SQL test was not executed against a database; deploy the migration to staging, run the database assertions, then deploy to production. Multi-account abuse and per-provider delivery caps still need operational controls.

### F-03 — LOW / MEDIUM hardening: dashboard image responses bypass worker security headers

**Workspace remediation:** both workers now recognize Vinext `/_next/image` and `/_vinext/image` paths, and add frame, MIME, referrer, permissions and private/no-store cache headers to optimizer responses. Contract checks cover these paths. Hosted response headers remain unverified. Normal worker CSP still allows `'unsafe-inline'`; remove it only after a compatible nonce-based rendering flow is implemented and verified. No XSS exploit was established.

### F-04 — MEDIUM privacy hardening: app stores offline account data in plaintext SQLite

Native Expo SQLite holds profiles, quotes/messages/contact preference, notifications, reviews, reports, posts, and queued operations; SQLCipher/encryption is not configured. Cleanup paths delete per-user records on account removal/sign-out, and native auth credentials use Expo SecureStore. Rooted/unlocked-device access or database extraction could expose cached personal records. SQLCipher is available through the Expo SQLite config plugin, but existing beta databases need a secure per-install key and migration path; enabling encryption blindly could make cached user data unreadable or block app startup. No unverified native storage switch was made. Minimize cached fields/retention and implement encryption in a tested native release. This local-device risk remains open.

### F-05 — LOW privacy note: third-party map services receive map requests

The map flow loads Leaflet from `unpkg.com` and map tiles from OpenStreetMap and/or Esri. Requests reveal IP address and viewed map region to those services. The current privacy policy already discloses IP/requested map-area sharing. Confirm the approved recipient list and supplier/transfer details before publishing; placeholders remain in the legal review copy.

### F-06 — INFO: private Supabase editor query draft

The read-only SQL entered through the production Supabase SQL editor appeared as a private “Untitled query” draft. It contained only audit SQL and no credentials. The dashboard became unavailable before its saved/private state could be inspected. It was not deleted or otherwise modified.

## Prior findings reconciled against current workspace

The historical `project-docs/SECURITY_ASSESSMENT_2026-09-01.md` records several remediations and several remaining gates. Current source supports the following distinctions:

| Prior finding | Current workspace source | Current live status |
|---|---|---|
| Persistent Edge rate-limit migration missing | Migration and helper exist | Not re-verified live today |
| `deliver-provider-leads` absent from source | Function now exists and calls persistent rate limit helper | Deployment/version not re-verified live today |
| Moderation table/RPC missing and audit atomicity | Security remediation migration creates moderation state and transactional audit RPC | Migration/drift not re-verified live today |
| Anonymous direct analytics insertion | Later migration drops client insert policy/revokes insert; Edge Function validates/rate-limits ingestion | Live grant/function config not re-verified today |
| Provider worker omitted security headers | Both dashboard workers now set headers on image optimization responses too | Hosted headers/deployed worker version not checked |
| Provider website URL validation | App code/tests and DB HTTPS constraint are present | Live constraint not re-verified today |
| Mobile session token in AsyncStorage | Current native auth uses SecureStore | Browser web session storage and non-auth offline data remain separate considerations |
| Admin moderation audit not transactional | Current source migration contains service-role-only transactional record RPC | Live function grants/version not re-verified today |
| SECURITY DEFINER search path inconsistent | Security remediation migration hardens non-extension functions | Current live catalog was not exported today |
| CI omitted product checks | Current quality workflow invokes all four product verification workflows and high-severity npm audits | Local verification passed; hosted CI result not fetched |
| Customer production dependency advisories | Historical Sep 1 report found 27 (10 high, 17 moderate) then | Current npm registry audit failed; historical count is not current evidence |
| Full live RLS matrix | Historical report said incomplete; tests and SQL scripts now exist in source | Still not run against production with multiple roles |

## Positive controls verified in source

- Root security invariant script passes; it checks high-value architectural rules, not all code paths or runtime configuration.
- Redacted secret-pattern scan passes. It scans many workspace text files but intentionally skips `.git`, `.npm-cache`, generated output and dependencies, and checks only listed patterns. It does not establish that no secret was ever committed or exists in a skipped/binary artifact. `.env`/`.env.local` values were preserved and never read into the report.
- Native Supabase auth uses Expo SecureStore. Production/internal beta configuration checks require the production Supabase URL, block demo mode and enforce Android push setup.
- Dashboard client code checks admin role; database RLS/RPC checks are intended to be the authoritative boundary. Business application/proof flows use applicant/admin scoping and private proof storage in source.
- Stripe webhook source verifies webhook signatures and implements event deduplication/idempotency.
- Admin, push, lead delivery, analytics and community controls include server-side validation, role/ownership checks, persistent rate-limit/audit controls in the reviewed source.
- Dashboard normal route code configures CSP, clickjacking/MIME/referrer/permissions protections and no-store for non-static responses.
- No confirmed executable XSS was established. The one `dangerouslySetInnerHTML` occurrence in the static chart component emits generated CSS variables from chart configuration; no untrusted script execution path was demonstrated.
- Map iframe source checks the message sender and returned provider identity; generated map labels use text APIs and `<` is escaped in serialized content.
- The current CI workflow includes customer, provider, admin/Edge Function, and static-site verification and high-severity production npm audit commands.

## Verification run today

| Check | Result |
|---|---|
| `npm run verify:all` (rerun for this handoff) | **Passed** all four ChodhiQ products |
| Customer | Launch config, formatting, quality (103 source files), accessibility, TypeScript checks, **129 tests**, security checks, Expo web export passed |
| Admin | ESLint, web/worker type-checks, nine configured Edge Function Deno checks, production build, **23 tests** passed |
| Provider | ESLint, web/worker type-checks, production build, **28 tests** passed |
| Coming-soon | oxlint and static production build/prerender passed |
| `npm run security:check` | Passed; invariants and redacted known-pattern scan passed |
| `npm audit --omit=dev --json` | **Could not reach npm registry. Current dependency exposure remains unknown.** |
| Linked Supabase DB lint | **Not completed:** Supabase CLI startup attempted a telemetry write to `C:\Users\ASUS\.supabase`, outside the writable workspace, and was denied. No elevation/out-of-workspace write was attempted. |
| Local Supabase upgrade/database rehearsal | **Not completed:** blocked by the same Supabase CLI telemetry write; no SQL was applied. |
| Hosted requests from shell | Failed to connect; unable to independently capture current headers/config |
| Production Supabase | Advisor, table warning, and read-only privilege inspection completed while dashboard was available; subsequently project controls became unavailable |

The workspace verification rebuilt customer web export and dashboard/site outputs in ignored/generated locations. Remediation source covers the quote-rate-limit migration, the structural SQL audit, both dashboard workers, source-contract/database tests, and this report. The attempted PostGIS revoke migration and corresponding unsupported privilege assertions were removed after confirming the platform-owned grants cannot be changed from the project SQL role. Existing user changes were preserved. The release source has substantial uncommitted work and is not a clean release candidate.

## Remaining verification and release gates

These items cannot be marked complete from the current workspace checks. They require authorized access to live services or a release artifact/device; the listed dependency scan and local DB rehearsal also failed for environmental reasons. No production changes have been made during this audit.

- Production/staging migration parity and actual installed DB catalog against the current workspace.
- Full anon/customer/provider/admin/service-role table, view and RPC permission/RLS matrix; disposition of the expected PostGIS warning is documented above.
- Supabase exposed-schema/API settings, all storage bucket privacy/MIME/size limits and path policies, Auth provider/MFA/password/rate-limit/redirect settings, production secrets configuration, cron/jobs and backup/PITR settings.
- Deployed Edge Function list, versions, JWT flags, secrets, logs, and source digest parity. Workspace functions type-check, but that says nothing about which versions are deployed.
- Live Cloudflare routes/worker bindings/TLS/WAF/IAM, actual CSP/cache/HSTS headers, image endpoint headers and deployment provenance.
- Current package advisory status, due network access.
- Git history and all binary/ignored/release artifacts for secret leaks. The available secret scan is bounded and does not scan history or skipped directories.
- Cross-account RLS attacks, malformed/flooded requests, payment webhook runtime behavior, push delivery or notification abuse.
- Installed Android beta artifact static/dynamic security, signing provenance, backup policy, exported components/deep links, certificate/network config, and native permissions. Workspace Expo config was inspected, but no binary reverse engineering/device security test was done.

## Next actions before beta expansion

1. **Database release:** run the migration/test rehearsal against staging with an authorized Supabase CLI identity, inspect generated SQL, then deploy quote-request limits through the normal reviewed release. Confirm migration parity and rerun multi-role RLS/storage/RPC checks against the exact beta project. Keep the PostGIS Advisor item informational; do not retry its revoke.
2. **Dependency state:** rerun `npm audit --omit=dev` in a network-enabled environment for root, admin, provider and coming-soon workspaces; resolve any high/critical production advisories before expanding beta.
3. **Hosting deployment:** deploy the two dashboard workers, then capture live headers on normal and image routes and inspect Cloudflare TLS/HSTS/WAF/bindings/IAM.
4. **Supabase configuration:** review exposed schemas/API settings, storage bucket policies and MIME/size limits, Auth settings, production secrets configuration, scheduled jobs, backups/PITR, Edge Function JWT flags/secrets/logs and deployed source parity.
5. **Mobile binary:** inspect the exact proposed APK/AAB signature, permissions, exported components, deep links, backup/network settings and auth/notification behavior on a test device. Reassess offline SQLite encryption and minimization as an explicit privacy decision.
6. **Operational abuse/privacy:** set provider-target delivery caps; confirm third-party map suppliers and legal supplier/transfer details before publishing legal copy.
7. **Beta release hygiene:** build one immutable release from a clean, identified commit, record artifact/build provenance and migration/function digest, and give testers one versioned link per release.
8. If you want to remove the PostGIS Advisor warning, ask Supabase Support whether PostGIS can be moved to a non-exposed schema. This is optional and does not block beta on its own.

## Final assessment

The **workspace source audit and all four local product verification workflows passed**. The source changes are not all deployed: quote-request limiting still needs staging and production rollout, and live image-worker headers have not been observed. The PostGIS warning is documented as an expected Supabase platform condition and does not by itself require holding beta. This is not a complete live-production security certification: dependency advisories, database policy runtime behavior, hosted configuration/deployment parity, and the proposed mobile artifact/device checks remain open. Complete those gates before describing the broader production security audit as finished.

## 7 October 2026 readiness recheck — supersedes the older npm-audit status above

The registry was reachable in the follow-up pass. `npm audit` was run in all four workspaces, both with all dependencies and with `--omit=dev`. The final counts and release implications are recorded in [the beta readiness report](BETA_LAUNCH_READINESS_2026-10-07.md). In short, the customer app still has 24 high and 14 moderate findings even when dev dependencies are omitted; npm's proposed fixes require unsupported major downgrades, so no force fix was used. Admin and provider have zero production-only advisories but retain high findings in build tooling. The public site retains six high production/runtime advisories. No current audit was treated as clean.

The customer app was upgraded to Expo 57.0.27 / React Native 0.86.3, and Expo Doctor passed all 21 checks after removing unsupported direct Expo internals. Full workspace verification passed after web-toolchain upgrades and after adapting Node-only server-render tests to resolve Cloudflare's platform tracing import. Android JS export passed, but no native artifact was built or inspected.

The EAS Android APK build was attempted only after local checks. Automatic approval review rejected the build action before source upload because it would export private app source/build context to Expo without explicit egress consent, and prohibited workarounds. The current signed APK remains v28 and does not include these source changes. Supabase migration rehearsal/deployment remains unavailable because this CLI session has no Supabase access token. Monitoring and legal publication checks also remain incomplete as listed in the readiness report. This pass therefore does not clear broad beta distribution.
