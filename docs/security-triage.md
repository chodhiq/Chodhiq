# Security heuristic triage

## Scan result

Re-ran `npm run security:check`. `security-check.cjs` passed. The exposure
scanner exited nonzero with 39 `suspicious literal assignment` matches.
No matched values are reproduced here.

| Verdict | Count |
|---|---:|
| REAL | 0 |
| FALSE POSITIVE | 39 |
| NEEDS HUMAN | 0 |

## REAL

None found. No key/token rotation is indicated by these findings.

## FALSE POSITIVE

The scanner rule for every entry below is its heuristic
`suspicious literal assignment`: a quoted string assigned to a variable whose
name contains `ACCESS_TOKEN`, `AUTH_TOKEN`, `SECRET`, or `PASSWORD`. No
credential-format pattern (private key, AWS, GitHub, Stripe, Google OAuth,
Slack, Sentry, Expo token, or credential-bearing URL) was reported.

### Generated build outputs: `access_token`

In each bundle below, inspection confirmed the assigned string is exactly the
field identifier `access_token` (12 characters), used as a generated
field-name mapping, not a credential. These are compiled client or server/SSR
outputs; their inclusion in source control is a separate repository hygiene
issue, not evidence that these matches are secrets.

| File:line | Rule matched | Verdict and reason |
|---|---|---|
| `admin-dashboard/chodhiq-admin-animation-fix/client/_next/static/chunks/admin-CwugDQLd.js:1` | Suspicious literal assignment (`access_token`) | FALSE POSITIVE — generated field-name mapping; assigned identifier equals the field name. |
| `admin-dashboard/chodhiq-admin-animation-fix/server/ssr/_next/static/admin-QIFxH1ik.js:1` | Suspicious literal assignment (`access_token`) | FALSE POSITIVE — generated field-name mapping; assigned identifier equals the field name. |
| `admin-dashboard/chodhiq-admin-cloudflare-production/client/_next/static/chunks/admin-CwugDQLd.js:1` | Suspicious literal assignment (`access_token`) | FALSE POSITIVE — generated field-name mapping; assigned identifier equals the field name. |
| `admin-dashboard/chodhiq-admin-cloudflare-production/server/ssr/_next/static/admin-QIFxH1ik.js:1` | Suspicious literal assignment (`access_token`) | FALSE POSITIVE — generated field-name mapping; assigned identifier equals the field name. |
| `admin-dashboard/chodhiq-admin-cloudflare-redesign/client/_next/static/chunks/admin-CwugDQLd.js:1` | Suspicious literal assignment (`access_token`) | FALSE POSITIVE — generated field-name mapping; assigned identifier equals the field name. |
| `admin-dashboard/chodhiq-admin-cloudflare-redesign/server/ssr/_next/static/admin-QIFxH1ik.js:1` | Suspicious literal assignment (`access_token`) | FALSE POSITIVE — generated field-name mapping; assigned identifier equals the field name. |
| `admin-dashboard/chodhiq-admin-community-reports-fix/client/_next/static/chunks/admin-CwugDQLd.js:1` | Suspicious literal assignment (`access_token`) | FALSE POSITIVE — generated field-name mapping; assigned identifier equals the field name. |
| `admin-dashboard/chodhiq-admin-community-reports-fix/server/ssr/_next/static/admin-QIFxH1ik.js:1` | Suspicious literal assignment (`access_token`) | FALSE POSITIVE — generated field-name mapping; assigned identifier equals the field name. |
| `admin-dashboard/chodhiq-admin-dashboard-deploy/client/_next/static/chunks/admin-CwugDQLd.js:1` | Suspicious literal assignment (`access_token`) | FALSE POSITIVE — generated field-name mapping; assigned identifier equals the field name. |
| `admin-dashboard/chodhiq-admin-dashboard-deploy/server/ssr/_next/static/admin-CMwS2xxT.js:1` | Suspicious literal assignment (`access_token`) | FALSE POSITIVE — generated field-name mapping; assigned identifier equals the field name. |
| `admin-dashboard/chodhiq-admin-ui-ux-all-pages/client/_next/static/chunks/admin-CwugDQLd.js:1` | Suspicious literal assignment (`access_token`) | FALSE POSITIVE — generated field-name mapping; assigned identifier equals the field name. |
| `admin-dashboard/chodhiq-admin-ui-ux-all-pages/server/ssr/_next/static/admin-QIFxH1ik.js:1` | Suspicious literal assignment (`access_token`) | FALSE POSITIVE — generated field-name mapping; assigned identifier equals the field name. |
| `admin-dashboard/cloudflare-admin-all-pages-v3/client/_next/static/chunks/admin-CwugDQLd.js:1` | Suspicious literal assignment (`access_token`) | FALSE POSITIVE — generated field-name mapping; assigned identifier equals the field name. |
| `admin-dashboard/cloudflare-admin-all-pages-v3/server/ssr/_next/static/admin-QIFxH1ik.js:1` | Suspicious literal assignment (`access_token`) | FALSE POSITIVE — generated field-name mapping; assigned identifier equals the field name. |
| `admin-dashboard/cloudflare-admin-animation-fix/client/_next/static/chunks/admin-CwugDQLd.js:1` | Suspicious literal assignment (`access_token`) | FALSE POSITIVE — generated field-name mapping; assigned identifier equals the field name. |
| `admin-dashboard/cloudflare-admin-animation-fix/server/ssr/_next/static/admin-QIFxH1ik.js:1` | Suspicious literal assignment (`access_token`) | FALSE POSITIVE — generated field-name mapping; assigned identifier equals the field name. |
| `admin-dashboard/cloudflare-admin-every-page/client/_next/static/chunks/admin-CwugDQLd.js:1` | Suspicious literal assignment (`access_token`) | FALSE POSITIVE — generated field-name mapping; assigned identifier equals the field name. |
| `admin-dashboard/cloudflare-admin-every-page/server/ssr/_next/static/admin-QIFxH1ik.js:1` | Suspicious literal assignment (`access_token`) | FALSE POSITIVE — generated field-name mapping; assigned identifier equals the field name. |
| `admin-dashboard/cloudflare-admin-redesign/client/_next/static/chunks/admin-CwugDQLd.js:1` | Suspicious literal assignment (`access_token`) | FALSE POSITIVE — generated field-name mapping; assigned identifier equals the field name. |
| `admin-dashboard/cloudflare-admin-redesign/server/ssr/_next/static/admin-QIFxH1ik.js:1` | Suspicious literal assignment (`access_token`) | FALSE POSITIVE — generated field-name mapping; assigned identifier equals the field name. |
| `admin-dashboard/cloudflare-admin-ux-bundle/client/_next/static/chunks/admin-CwugDQLd.js:1` | Suspicious literal assignment (`access_token`) | FALSE POSITIVE — generated field-name mapping; assigned identifier equals the field name. |
| `admin-dashboard/cloudflare-admin-ux-bundle/server/ssr/_next/static/admin-QIFxH1ik.js:1` | Suspicious literal assignment (`access_token`) | FALSE POSITIVE — generated field-name mapping; assigned identifier equals the field name. |
| `admin-dashboard/cloudflare-production-package/client/_next/static/chunks/admin-CwugDQLd.js:1` | Suspicious literal assignment (`access_token`) | FALSE POSITIVE — generated field-name mapping; assigned identifier equals the field name. |
| `admin-dashboard/cloudflare-production-package/server/ssr/_next/static/admin-QIFxH1ik.js:1` | Suspicious literal assignment (`access_token`) | FALSE POSITIVE — generated field-name mapping; assigned identifier equals the field name. |
| `admin-dashboard/cloudflare-production-package-v2/client/_next/static/chunks/admin-CwugDQLd.js:1` | Suspicious literal assignment (`access_token`) | FALSE POSITIVE — generated field-name mapping; assigned identifier equals the field name. |
| `admin-dashboard/cloudflare-production-package-v2/server/ssr/_next/static/admin-QIFxH1ik.js:1` | Suspicious literal assignment (`access_token`) | FALSE POSITIVE — generated field-name mapping; assigned identifier equals the field name. |
| `chodhiq-admin-community-reports-fix/client/_next/static/chunks/admin-CwugDQLd.js:1` | Suspicious literal assignment (`access_token`) | FALSE POSITIVE — generated field-name mapping; assigned identifier equals the field name. |
| `chodhiq-admin-community-reports-fix/server/ssr/_next/static/admin-QIFxH1ik.js:1` | Suspicious literal assignment (`access_token`) | FALSE POSITIVE — generated field-name mapping; assigned identifier equals the field name. |

### Test fixtures

These are static test data in auth/navigation tests, not credentials used to
authenticate to a real service.

| File:line | Rule matched | Verdict and reason |
|---|---|---|
| `admin-dashboard/e2e/admin-navigation.spec.ts:21` | Suspicious literal assignment (`access_token`) | FALSE POSITIVE — mock session/access-token fixture for E2E navigation. |
| `admin-dashboard/e2e/admin-navigation.spec.ts:57` | Suspicious literal assignment (`access_token`) | FALSE POSITIVE — mock session/access-token fixture for E2E navigation. |
| `admin-dashboard/e2e/admin-navigation.spec.ts:102` | Suspicious literal assignment (`access_token`) | FALSE POSITIVE — mock session/access-token fixture for E2E navigation. |
| `admin-dashboard/e2e/admin-navigation.spec.ts:207` | Suspicious literal assignment (`access_token`) | FALSE POSITIVE — mock session/access-token fixture for E2E navigation. |
| `__tests__/buttons/auth.test.tsx:113` | Suspicious literal assignment (`password`) | FALSE POSITIVE — test-only authentication input fixture. |
| `__tests__/buttons/auth.test.tsx:164` | Suspicious literal assignment (`password`) | FALSE POSITIVE — test-only authentication input fixture. |

### Supabase configuration templates

Each match is an environment-variable expression in `supabase/config.toml`,
not a committed literal secret.

| File:line | Rule matched | Verdict and reason |
|---|---|---|
| `supabase/config.toml:64` | Suspicious literal assignment (`secret_key`) | FALSE POSITIVE — environment-variable expression in config template. |
| `supabase/config.toml:301` | Suspicious literal assignment (`auth_token`) | FALSE POSITIVE — environment-variable expression in config template. |
| `supabase/config.toml:333` | Suspicious literal assignment (`secret`) | FALSE POSITIVE — environment-variable expression in config template. |
| `supabase/config.toml:393` | Suspicious literal assignment (`secret_key`) | FALSE POSITIVE — environment-variable expression in config template. |
| `supabase/config.toml:412` | Suspicious literal assignment (`s3_secret_key`) | FALSE POSITIVE — environment-variable expression in config template. |

## NEEDS HUMAN

None of the 39 matches requires human credential verification based on the
inspected source: bundle assignments are field-name mappings, test entries are
fixtures, and configuration entries resolve from environment variables.
