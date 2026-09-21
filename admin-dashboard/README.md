# ChodhiQ Admin Operations

ChodhiQ Admin Operations is the protected moderation and marketplace operations dashboard for the ChodhiQ South Indian UK community. It gives authorised administrators routed tools for providers, users, verification, reports, community content, reviews, monetisation, analytics, notifications, and audit history.

## Prerequisites

- Node.js 22.13 or newer
- npm
- A dedicated non-production Supabase project for local and staging work
- Supabase CLI access when deploying Edge Functions

## Environment variables

Copy `.env.example` to `.env.local` and provide:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SITE_URL=http://localhost:3000
```

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are exposed to the browser by design. Never place the service-role key in this application or in a `NEXT_PUBLIC_` variable. Edge Functions receive `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from Supabase-managed server secrets.

## Local startup

```bash
npm install
npm run dev
```

Open the local URL printed by vinext. Use `npm run build` before sharing a change.

## Admin sign-in setup

The dashboard signs users in through Supabase Auth and grants access only when the authenticated user's JWT contains `app_metadata.role` equal to `admin`.

1. Create the administrator in Supabase Auth using the staging project.
2. Assign `{ "role": "admin" }` to the user's `app_metadata` from a trusted server-side process or the `admin-role-control` Edge Function.
3. Do not store the role in `user_metadata`; users can edit that field.
4. Sign in with the administrator's email and password on the dashboard.
5. Confirm that privileged actions appear in `admin_audit_log`.

The role-management function prevents self-revocation and removal of the last administrator.

## Supabase requirements

The dashboard expects the marketplace schema and Row Level Security policies for the tables queried under `app/` and `lib/`, including profiles, providers, categories, verification requests, reports, reviews, community posts, demand, subscriptions, payment records, notifications, moderation state, and `admin_audit_log`.

Before connecting a project:

- Verify the project reference is explicitly designated staging or development.
- Apply schema migrations through the repository's reviewed migration workflow; never edit the live production schema from this checkout.
- Verify RLS allows browser operations only for authenticated administrators where appropriate.
- Keep service-role access inside trusted Edge Functions.
- Create the storage buckets and policies required by marketplace workflows before testing uploads.

## Edge Functions

This repository contains:

- `admin-role-control`: lists, grants, and revokes administrator roles.
- `admin-user-control`: suspends and reactivates user accounts.

After confirming the linked Supabase project is staging, deploy them with:

```bash
supabase link --project-ref YOUR_STAGING_PROJECT_REF
cd ..
supabase functions deploy admin-role-control
supabase functions deploy admin-user-control
```

Verify the linked reference again immediately before each deployment. Do not deploy these functions to production as part of showcase preparation.

## Validation

```bash
npm run lint
npm test
```

`npm test` creates the production build and verifies every showcase route. To build without running the route tests:

```bash
npm run build
```

## Staging deployment

1. Start from a clean checkpoint commit and record the active environment variable values in a secure, ignored snapshot.
2. Confirm the Supabase URL resolves to the approved staging project reference.
3. Confirm `.openai/hosting.json` contains the approved private showcase project ID.
4. Run `npm run lint` and `npm test`.
5. Deploy both Edge Functions only if their source changed, using the explicitly confirmed staging project reference.
6. Publish the validated commit to the private Sites showcase project.
7. Tour every route while signed in as a staging administrator and check the browser console for hydration errors.
8. Exercise only staging test records, then verify the audit log.

If either the Supabase project or Sites project cannot be positively identified as staging/showcase, stop the deployment.

## Safety and rollback

See `PRIORITY_0_SAFETY.md` for the current checkpoint, target verification status, and rollback procedure. Environment files are ignored by Git and must not be committed.

## Architecture and operations

- `app/` contains the vinext/React admin routes and shared accessible UI.
- `lib/admin.tsx` owns session-aware mutation handling; `lib/operations.ts` contains testable transition, bulk, pagination, and CSV safety primitives.
- `db/admin_routed_operations.sql` is the reviewed staging migration surface for RLS and transactional admin RPCs.
- `supabase/functions/` contains service-role-only Auth administration functions. Service-role credentials never enter the browser bundle.
- `worker/` applies security and sensitive-cache response headers.

Review before staging deployment:

- [Authorization and RLS matrix](docs/RLS_POLICY_MATRIX.md)
- [Staging data and reset](docs/STAGING_DATA_AND_RESET.md)
- [Showcase runbook](docs/SHOWCASE_RUNBOOK.md)
- [Observability and security](docs/OBSERVABILITY_AND_SECURITY.md)

## Migrations and RLS deployment

Apply `db/admin_routed_operations.sql` only through the team's reviewed migration workflow after confirming the exact staging project reference and taking a database backup. Inspect the generated diff, run the policy matrix under every test identity, and never paste this file into a production SQL editor during showcase preparation.

## Test accounts

Create fictional staging identities outside Git: one administrator, non-admin, suspended user, and revoked administrator. Store credentials in the approved secret manager. Never commit passwords or use real customer accounts.

## Production deployment

Production promotion is deliberately separate from staging. Require an approved change record, database backup, reviewed migration plan, RLS evidence, last-known-good Sites version, maintenance/rollback owner, and a successful staging rehearsal. Replace `ADMIN_ALLOWED_ORIGINS` with exact production origins before deploying Edge Functions.

## Troubleshooting

- **Setup screen appears:** validate the public Supabase URL and publishable/anonymous key, then restart.
- **Administrator role required:** refresh the session after assigning `app_metadata.role = admin`; do not use `user_metadata`.
- **Conflict or stale record:** reload the authoritative record and reapply the decision; do not blindly retry.
- **Partial Auth/database failure:** stop retries, note the correlation ID, and reconcile Auth, moderation, and audit state.
- **Evidence fails to open:** verify bucket RLS and the signed-URL function; raw storage paths are intentionally not exposed.

## Known limitations

- Remote RLS, RPCs, storage policies, Edge Function behaviour, staging fixtures, and real admin sign-in remain unverified until the staging project is positively identified and migrations are applied.
- The dashboard provides clean monitoring integration points but does not configure a third-party alerting service.
- Browser component coverage remains lighter than the unit and route-render coverage; authenticated end-to-end mutation tests require fictional staging credentials.
