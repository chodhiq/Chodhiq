# ChodhiQ

ChodhiQ is a trusted UK marketplace for the South Indian community. It connects customers with verified businesses through a customer Expo app, a provider dashboard, an administration dashboard, and a public coming-soon site.

Providers are businesses for the initial launch. Customers can discover providers, save listings, submit reviews and quote requests, request bookings, receive responses and notifications, and use direct contact options such as WhatsApp and phone.

## Workspace structure

- `App.js` and `src/` - Expo customer application
- `business-dashboard/` - provider onboarding and operations dashboard
- `admin-dashboard/` - administration, verification, moderation, and governance dashboard
- `coming-soon/` - public launch website
- `supabase/migrations/` - canonical ordered database schema history
- `supabase/functions/` - privileged and integration Edge Functions
- `packages/validation/` - framework-neutral shared validation
- `packages/types/` - shared domain and generated database declarations
- `project-docs/` - current architecture, operations, and release evidence
- `db/` - historical snapshots, diagnostics, and operator references; not the canonical migration history

## Local setup

Use Node.js 22 for consistent verification across the workspace.

```bash
npm install --legacy-peer-deps
npm start
```

Copy `.env.example` to a local ignored environment file and supply the public Supabase configuration for authenticated marketplace workflows. Never place service-role keys or server secrets in an `EXPO_PUBLIC_*` variable.

The interface retains guarded prototype fallbacks for local previews, but production startup cannot seed bundled prototype listings.

## Verification

Run every deployable product's local release gate:

```powershell
npm run verify:all
```

This verifies the customer app, administration dashboard, business dashboard, and coming-soon site. Useful targeted commands include `npm test`, `npm run verify:release`, `npm run launch:config`, `npm run test:db`, and `npm run test:e2e:staging`.

Passing local checks is not production approval. Required staging, signed-device, security, accessibility, monitoring, legal, and operational evidence is tracked in `project-docs/QA_RELEASE_EVIDENCE.md`.

## Backend policy

RLS is the authoritative access-control layer. Security-sensitive or multi-record writes use reviewed PostgreSQL functions or authenticated Edge Functions. Client validation improves feedback but is not authorization.

Apply `supabase/migrations` in order. Do not substitute historical SQL files under `db/` for the migration chain.

The push notification webhook requires a server-only `PUSH_WEBHOOK_SECRET`. Authenticated staging cleanup may use `E2E_SUPABASE_SERVICE_ROLE_KEY` only in the test runner's secret environment.

For local Android push testing, keep the Firebase Android client file as the ignored workspace-root `google-services.json` and run `npx expo prebuild --platform android` before Gradle. The app config also accepts the EAS file variables `GOOGLE_SERVICES_JSON` or `GOOGLE_SERVICES_FILE`; never add Firebase service-account credentials to the app.

## Initial-launch scope

Implemented workflows include authentication, search, provider applications and claims, verification, favorites, reviews, quote requests, bookings, provider replies, reports, notifications, provider operations, and administrator moderation and governance.

Payments, subscriptions, and paid advertising remain feature-gated until their release evidence is complete.

## Current priorities

- Prove migrations, RLS, storage rules, and authenticated role isolation in staging
- Produce and test signed Android and iOS release candidates
- Complete monitoring, rollback, backup, legal, store, and launch-support evidence
- Continue incremental type coverage and post-launch decomposition of the largest UI modules
