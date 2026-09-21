# Admin dashboard authorization and RLS matrix

This matrix is a deployment requirement, not proof that the currently linked remote project has these policies. Run the accompanying staging policy tests after applying reviewed migrations.

| Resource | Anonymous | Authenticated non-admin | Administrator | Suspended user | Required control |
|---|---|---|---|---|---|
| `profiles` | No admin listing | Own public-safe profile only | Read operational fields | No admin listing | RLS with `is_admin()` for admin reads |
| `providers`, `categories` | Public-safe reads only | Public-safe reads; owner-scoped writes | Admin read; reviewed field mutations | Public-safe reads only | Column grants plus RLS |
| `verification_requests`, `verification_documents` | Deny | Owner-scoped | Admin read/decision | Deny privileged access | RLS; private bucket; short signed URLs |
| `provider_reports`, `community_post_reports` | Deny | Reporter-owned inserts/reads only | Admin queue and RPC transitions | Deny privileged access | RLS and transactional RPC |
| `community_posts`, `reviews` | Published reads only | Owner-authorized writes | Moderation through validated RPC | Read-only/denied writes | Legal-transition validation |
| `quote_requests`, `bookings` | Deny | Owner/participant scoped | Admin read | Deny admin read | RLS with participant/admin predicates |
| `provider_entitlements`, `subscription_requests`, `payment_records` | Deny | Provider-owner scoped | Admin read; server-owned payment writes | Deny privileged access | RLS; payment writes service-only |
| `notifications` | Deny | Own rows | Admin delivery history | Own rows only if policy permits | RLS |
| `user_moderation_status` | Deny | Deny | Read; service-role mutation | Deny | Edge Function owns writes |
| `admin_audit_log` | Deny | Deny | Read and insert only | Deny | Append-only; revoke update/delete |
| Admin RPCs | Deny | Reject inside function | Execute | Reject | `security definer`, fixed `search_path`, `is_admin()` |
| `verification-documents` storage | Deny | Owner path only | Read via short signed URL | Deny | Private bucket and storage RLS |

## Required policy test identities

Use separate fictional staging accounts for anonymous, non-admin, administrator, suspended, and revoked-administrator cases. For each table, call Supabase directly with that identity and assert both read and mutation expectations. Client-side `AdminGate` is not evidence of authorization.

## Staging SQL assertions

1. Verify `admin_audit_log` grants do not include update or delete for `authenticated`.
2. Verify every admin RPC rejects a non-admin JWT even when called directly.
3. Verify report and verification RPCs reject stale `expected_status`/`expected_updated_at` values.
4. Verify verification storage objects cannot be listed or downloaded by non-owners/non-admins.
5. Verify suspended and revoked-admin tokens cannot access protected operational data.

Remote execution remains blocked until the staging project reference is positively confirmed.
