# ChodhiQ Production Admin Security Review

**Assessment date:** 2026-10-24  
**Scope:** `https://admin.chodhiq.co.uk/` and the Supabase project identified by the authenticated project listing as **ChodhiQ Production** (`gfjhvsajwjrrlylgrkhf`).  
**Mode:** Read-only. No production data was changed, no migrations were applied, and no deployment was performed.

## A. Executive summary

**Provisional overall risk: High.** Production evidence and source review show that authenticated callers have EXECUTE grants on legacy admin RPCs whose source authorization uses a broad admin check rather than the dashboard's restricted role matrix. The production migration history does not include the local permission-enforcement migration. Direct per-role invocation was not tested because role-specific test tokens were not provided; success by restricted roles is therefore a high-confidence likely issue, not an experimentally confirmed action.

The project listing reported production `ACTIVE_HEALTHY`. Nine production Edge Functions were listed as active. Production migration history reports `20261023100000` as applied, but has no remote entry for `20261023110000_admin_permission_enforcement.sql`; two other local migrations are also absent remotely. Read-only database catalog queries for production RLS policies and routine definitions failed because Supabase's temporary database role could not authenticate. As a result, policy-level live parity could not be fully checked.

No test account credentials were supplied. No role-specific REST/RPC/Storage request was made, so there are no per-role request/response pairs to report. No forbidden write was attempted.

## B. Findings

| ID | Title | Severity | Area | Confidence | Status |
|---|---|---|---|---|---|
| F-01 | Legacy admin RPCs may let restricted roles suspend users or moderate reports | High | Authorization / API | Likely (9/10) | Open; role-specific invocation not tested |
| F-02 | Broad `is_admin()` policies do not enforce the role permission matrix | High | Authorization / Data layer | Likely (9/10) | Open; enforcement migration absent from production history |
| F-03 | Existing access tokens may retain old admin claims after role changes | High | Authentication / Admin lifecycle | Likely (7/10) | Open; no role-change session test performed |
| F-04 | Admins can insert arbitrary audit-log entries attributed to themselves | Medium | Admin-specific / Observability | Confirmed in source (8/10) | Open |
| F-05 | CSP violation reports are discarded | Low | Configuration / Observability | Confirmed in source (9/10) | Open |

### F-01 — Legacy admin RPC authorization

- **Affected routines:** `admin_set_user_moderation`, `admin_search_members`, `admin_moderate_community_report`.
- **Evidence:** Source definitions are in `supabase/migrations/20260819120000_admin_audit_and_user_controls.sql:23-43` and `supabase/migrations/20260820100000_admin_operations_upgrade.sql:2-35`. They are `SECURITY DEFINER` functions with authenticated execute grants and use the broad `is_admin()` check instead of the per-permission authorization used by the dashboard.
- **Production evidence:** A read-only production catalog query confirmed authenticated execute grants for the named routines. A separate query for their live definitions failed due temporary-role authentication, so the exact deployed function bodies were not independently retrieved in this run. Earlier production inspection found `is_admin()` checking only the generic admin role; the current migration history contains no later applied permission-enforcement migration.
- **Potential impact:** A restricted moderator/support/finance/analyst may be able to call a function directly even when the UI hides the action. The user-suspension operation conflicts with the frontend matrix for support, finance, and analyst. Community report moderation conflicts with the matrix for finance and analyst.
- **Request/response:** Not tested. No role tokens were available, and no production write was attempted.
- **Recommended remediation:** Require the precise permission inside each RPC, validate with disposable role-specific accounts in a safe test environment, then deploy through the normal reviewed migration process.
- **Effort:** M.

### F-02 — RLS does not consistently enforce restricted admin roles

- **Affected component:** Historical RLS policies use `public.is_admin()` from `supabase/migrations/20260807131253_dashboard_backend.sql:4` and other migrations. The frontend matrix is in `admin-dashboard/lib/permissions.ts`.
- **Evidence:** Production migration history includes `20261023100000` but not `20261023110000_admin_permission_enforcement.sql`. The latter exists locally and was not applied. The live catalog query for `pg_policies` failed due temporary database-role authentication; policy parity is therefore not confirmed from the live catalog in this run.
- **Potential impact:** Where deployed broad policies remain, a lower-level admin may obtain data or perform operations beyond their intended permissions through direct PostgREST or Storage APIs.
- **Request/response:** Not tested. No role-specific tokens were supplied.
- **Recommended remediation:** Review the unapplied permission migration for completeness and validate it against the production schema in a safe environment before any production change.
- **Effort:** M/L.

### F-03 — Session revocation after role change

- **Affected component:** `supabase/functions/admin-role-control/index.ts:39` and the JWT-based authorization surfaces.
- **Evidence:** The role-control function changes app metadata but does not explicitly revoke all of the user's sessions. JWTs can retain claims until refresh/expiry on endpoints that rely on claims rather than current user state.
- **Potential impact:** A demoted or revoked administrator may retain access through an unexpired token on claim-only authorization paths.
- **Recommended remediation:** Revoke sessions when changing privileged roles, and enforce current role/permission state at sensitive database and server boundaries.
- **Effort:** S/M.

### F-04 — Audit-log INSERT integrity

- **Affected component:** `supabase/migrations/20260807131253_dashboard_backend.sql:162`.
- **Evidence:** The source policy permits admin inserts when `admin_id` equals the caller, but does not constrain action, entity, or details fields.
- **Potential impact:** An admin could create misleading events attributed to themselves, reducing confidence in audit history.
- **Recommended remediation:** Remove direct client inserts and write audit entries through trusted server-side operations or database triggers.
- **Effort:** S/M.

### F-05 — CSP reports are discarded

- **Affected component:** `admin-dashboard/worker/index.ts:29`.
- **Evidence:** The CSP reporting route returns HTTP 204 without recording or processing the report.
- **Potential impact:** CSP violation telemetry is unavailable for investigation and alerting.
- **Recommended remediation:** Implement privacy-safe report processing with retention controls, or remove the reporting endpoint/configuration if unsupported.
- **Effort:** S.

## C. Production inventories

### Edge Functions

The production Supabase management inventory listed these nine functions as active. `verify_jwt` is the deployed gateway setting; handler authorization is based on source and is not proof of current deployed source parity.

| Function | Gateway `verify_jwt` | Source-level handler authorization |
|---|---:|---|
| `admin-role-control` | true | Calls `auth.getUser`; checks admin role and super-admin level; uses service role for Auth administration and audit logging. |
| `admin-user-control` | true | Calls `auth.getUser`; checks admin role and super-admin/moderator level; uses service role for account state and invokes a database RPC. |
| `create-checkout-session` | true | Calls `auth.getUser`; verifies provider/subscription state; uses service role for server-side operations. |
| `delete-account` | true | Calls `auth.getUser`; operates on the caller's account and uses service role for cleanup/deletion. |
| `push-notification` | false | Uses a configured webhook secret; does not authorize by admin JWT. |
| `stripe-webhook` | false | Verifies Stripe request signature; does not use an admin JWT. |
| `deliver-provider-leads` | true | Checks a configured delivery secret in the handler; gateway additionally requires JWT. |
| `check-push-receipts` | false | Checks a configured webhook secret; no user-role authorization. |
| `health` | false | Public health handler using an anon-key connectivity query; no user role check. |

Local source contains two additional function entrypoints, `ingest-mvp-event` and `uk-address-suggestions`, that were not present in the production active-function listing. This is deployment/source inventory drift; whether intentional is unverified.

### Admin-related SQL RPCs

The read-only production grant inventory confirmed authenticated execute grants for legacy admin routines, including `admin_set_user_moderation`, `admin_search_members`, and `admin_moderate_community_report`. The source inventory also identifies these admin RPCs:

| RPC | Source authorization pattern |
|---|---|
| `admin_set_user_moderation` | Broad `is_admin()` check in its defining migration; does not check `users.suspend`. |
| `admin_search_members` | Broad `is_admin()` check; does not check a role-specific search permission. |
| `admin_moderate_community_report` | Broad `is_admin()` check; does not check `community.moderate` / `reports.resolve`. |
| `admin_broadcast_notification`, `admin_send_notification` | `admin_has_permission('notifications.send')` in source; earlier live inspection found a JWT-role-based permission helper. |
| `admin_transition_community_post` | `admin_has_permission('community.moderate')` in source. |
| `admin_resolve_report` | `admin_has_permission('reports.resolve')` in source. |
| `admin_save_community_space` | `admin_has_permission('community.moderate')` in source. |
| `admin_set_community_member` | `admin_has_permission('community.privileges')` in source. |
| `admin_transition_community_comment` | Source function; exact live definition was not retrieved in this run. |
| `admin_decide_verification` | Defined in the local permission-enforcement migration that is absent from production migration history; live availability was not verified. |

The production catalog query for live function definitions failed due temporary-role authentication. Source-defined checks are not represented as confirmed deployed bodies unless separately identified above.

### Cloudflare Worker routes

The admin Worker source in `admin-dashboard/worker/index.ts:35-70` has no admin-role authorization at the Worker boundary:

| Route/dispatch | Worker behavior | Authorization |
|---|---|---|
| `/csp-report` | Accepts/report route, returns 204 | No report processing; no user/admin auth. |
| Image optimization paths | Image transformation/cache handling | No admin-role check; public asset path behavior. |
| Other app routes | Forwarded to app-router handler | No Worker-level admin guard; dashboard auth/UI and Supabase backend controls are the intended boundaries. |

### Storage policies

The migration source defines policies for `provider-media`, `verification-documents`, `quote-attachments`, `business-application-proofs`, `community-images`, and `ad-creatives`. Broad historical storage predicates use ownership paths or `is_admin()`; a five-bucket restrictive permission gate is in local migration `20261023110000_admin_permission_enforcement.sql:128-150`, which is absent from production migration history. The live `storage.objects` policy catalog could not be retrieved in this run.

| Bucket | Source policy intent | Admin check |
|---|---|---|
| `provider-media` | Owner-folder upload/update/delete; public-read policy later dropped | Historical update/delete allows broad `is_admin()`; local gate maps to `admins.manage`. |
| `verification-documents` | Owner-folder upload; owner/admin read | Historical admin read uses broad `is_admin()`; local gate maps to `applications.review`. |
| `quote-attachments` | Owner/provider-linked upload, read, and delete | Ownership predicates; no broad admin privilege identified in the listed source policy. |
| `business-application-proofs` | Owner upload/delete with application-state checks; owner/admin read | Historical broad `is_admin()` for read; local gate maps to `applications.review`. |
| `community-images` | Owner upload/delete; read based on post visibility | Visibility predicate allows `is_admin()` on the referenced post; local gate maps to `community.moderate`. |
| `ad-creatives` | Admin upload/delete; bucket-wide public read policy later dropped | Historical broad `is_admin()`; local gate maps to `campaigns.manage`. |

## D. Coverage report

| Area | Status | Checked / limitation |
|---|---|---|
| 1. Authentication | **Not Verified** | Source and local Auth config reviewed. Production MFA, CAPTCHA, password rules, rate limits, reset/token expiry, and session revocation settings were not retrieved. |
| 2. Authorization and access control | **Issues Found** | Production function inventory and RPC grants queried read-only; source shows broad admin RPC/RLS paths. Role-by-role API tests were not possible without tokens. |
| 3. Input handling and injection | **Not Verified** | Source pass covered selected request handling and user-generated surfaces; no complete dynamic XSS/injection/export testing was performed. No write requests were sent. |
| 4. API and backend | **Issues Found** | Nine active production Edge Functions inventoried. RPC grants partially queried. Live routine definitions and policy catalog could not be retrieved due temporary-role authentication failures. |
| 5. Data layer | **Not Verified** | Migration history queried; live policy catalog failed. Index/query performance, least-privilege database roles, backup restore, and PITR settings were not verified. |
| 6. Admin-specific risks | **Issues Found** | Legacy admin RPC grants and audit-log integrity reviewed. No bulk actions or destructive paths were invoked. |
| 7. Configuration, infrastructure, and secrets | **Not Verified** | Public admin security headers were verified in the prior live check. Secret history, deployed client bundles, dependency vulnerabilities, network exposure, and CI/CD controls were not verified in this production continuation. |
| 8. Frontend | **Issues Found** | Source uses client-side role gating; it is not an authorization boundary. Direct role tests and bundle inspection were not performed. |
| 9. Reliability and performance | **Not Verified** | No production load or response-time tests were run. |
| 10. Observability and operations | **Issues Found** | Audit-log policy integrity and discarded CSP reports identified. Retention, alerting, backup/PITR, runbooks, and restore evidence remain unverified. |
| 11. Workflow and usability | **Not Verified** | No authenticated admin workflows were executed. |
| 12. Compliance and privacy | **Not Verified** | No legal/compliance assessment, privacy-request test, or data-retention audit was performed. |

## E. Remediation roadmap

### Immediate

1. Review and safely validate the legacy admin RPC permission gaps and the missing permission-enforcement migration.
2. Do not assume the local permission migration is deployed; production migration history lists no remote entry for it.
3. Test each role with disposable accounts and non-sensitive fixtures before any production remediation.

### This sprint

1. Enforce explicit permissions inside every admin RPC and RLS policy, not only in the UI.
2. Revoke sessions when privileged roles are reduced or removed; ensure sensitive operations consult current authorization state.
3. Make audit logging append-only for ordinary admin sessions.
4. Either process CSP reports safely or remove the reporting endpoint/configuration.

### This quarter

1. Verify production Auth settings, dependency CVEs, git-history secrets, deployed bundles, backup/PITR retention, and tested restore procedures.
2. Add automated role-by-role REST/RPC/Storage authorization tests.
3. Reconcile local source and deployed Edge Function inventory.

## F. Positive observations

- Production Supabase project status was reported as `ACTIVE_HEALTHY`.
- The public admin response was previously verified with HSTS, CSP, frame protection, MIME-sniffing protection, Referrer-Policy, and Permissions-Policy.
- The admin role-control Edge Function source has caller role checks, super-admin restrictions, rate limiting, protected-account checks, and audit/compensation behavior.
- `admin-user-control` source constrains user moderation to super-admin/moderator and blocks protected admin accounts.
- No production data mutations, notifications, or migrations were performed.

## Verification limitations and audit actions

- The production project list, active Edge Function inventory, migration history, and admin RPC execute grants were retrieved using read-only Supabase CLI/Management API operations.
- Production RLS/function-definition catalog queries failed with Supabase temporary-role password authentication errors. No credential values were printed or changed.
- No role-specific test tokens were available. Direct per-role REST/RPC/Storage requests, including reads, were not sent; no forbidden operation was experimentally demonstrated.
- The user had originally requested a STAGING-only continuation, then clarified that the live production project was the intended audit target. After that clarification, one read-only Supabase Management API request accidentally listed STAGING function metadata; no STAGING function endpoint was invoked and no STAGING data was queried. All database and Edge Function checks reported above are for production.
