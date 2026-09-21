# Supabase staging verification - 2026-09-21

Release source: `v1.0.0-rc.1` (`f0df4f53a23ec30f976e61994a512d1a88bae560`)

## Result

**PARTIAL / NOT READY FOR SIGN-OFF**

The linked staging project is reachable and its migration history is synchronized. Database security execution, authenticated isolation, live storage-policy behavior, and complete Edge Function secret configuration are not yet proven.

## Migration state

- The linked project initially lacked `20260916090000_sync_auth_users_to_profiles.sql`.
- A dry run identified only that migration.
- The migration was applied successfully.
- A second migration listing showed all 39 local migration versions matched remotely.
- This proves synchronization of the existing linked project, not application to a freshly created staging project.

## Database lint

Remote lint completed. Reported warnings and errors were in PostGIS extension routines such as `st_findextent`, `populate_geometry_columns`, and `postgis_full_version`; no ChodhiQ-owned function was named in the result. Extension findings still require platform/version review but are not evidence of an application-function failure.

## Database and RLS tests

- `supabase/tests/database_security.test.sql` covers customer isolation, provider ownership, booking constraints, admin category operations, and moderation permissions.
- `supabase/tests/business_application_workflow.test.sql` covers private business-proof visibility, admin review, provider provisioning, and audit records.
- The suites were **not executed** because Docker Desktop was unavailable and its Windows service could not be started from this environment.
- A clean database reset and full migration replay were therefore **not executed**.

## Authenticated role isolation

`tests/authenticated-workflows.mjs` was invoked with the available environment configuration and skipped because these staging-only values are absent:

- `E2E_SUPABASE_SERVICE_ROLE_KEY`
- Customer email and password
- Provider-owner email and password
- Administrator email and password
- `E2E_PROVIDER_ID`

Customer/provider/admin isolation is **not yet confirmed against staging**.

## Storage and verification documents

Repository SQL includes policies and tests for the private `business-application-proofs` workflow. Live policy behavior was not executed. A read-only remote storage-schema dump was attempted but the CLI requires Docker for its database tooling, so the dump did not run.

Private verification-document access and upload restrictions remain **not proven against staging**.

## Edge Functions

All eight repository Edge Functions exist remotely with `ACTIVE` status:

- `admin-role-control`
- `admin-user-control`
- `create-checkout-session`
- `delete-account`
- `deliver-provider-leads`
- `ingest-mvp-event`
- `push-notification`
- `stripe-webhook`

JWT enforcement matches the intended webhook/service split at the platform level: admin, account deletion, and checkout functions require JWT verification; webhook and server-triggered functions perform their own request authentication.

### Secret inventory assessment

Supabase-provided values are present, and `PUSH_WEBHOOK_SECRET` is configured. The following application secrets/settings referenced by deployed functions were not present in the remote secret-name inventory:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_COMMUNITY`
- `STRIPE_PRICE_TOP10`
- `STRIPE_PRICE_TOP5`
- `ENABLE_PAYMENTS`
- `ALLOWED_CHECKOUT_ORIGINS`
- `ADMIN_ALLOWED_ORIGINS`
- `LEAD_DELIVERY_SECRET`
- `RESEND_API_KEY`
- `LEAD_FROM_EMAIL`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `EXPO_ACCESS_TOKEN`

Some values are optional or intentionally absent while payments/channels are disabled. However, `stripe-webhook` cannot operate without its Stripe keys, and `deliver-provider-leads` rejects requests without `LEAD_DELIVERY_SECRET`. Admin functions currently fall back to localhost origins when `ADMIN_ALLOWED_ORIGINS` is absent. The deployed-function secret gate therefore **fails** until each active function is either fully configured or explicitly disabled/removed.

## Required completion actions

1. Start Docker Desktop and run a clean migration replay followed by `npm run test:db`.
2. Configure dedicated disposable customer, provider-owner, and administrator staging accounts plus the E2E variables, then run `npm run test:e2e:staging` with zero skips.
3. Exercise private proof upload, cross-user denial, administrator signed access, MIME/size rejection, and cleanup against staging.
4. Configure `ADMIN_ALLOWED_ORIGINS` and `LEAD_DELIVERY_SECRET`.
5. Either configure and test Stripe secrets/prices or undeploy/disable the Stripe webhook and checkout function for the launch-paused period.
6. Configure optional email, WhatsApp, and Expo credentials only for channels intended to operate at launch; test each enabled channel.
7. Re-run this verification and update `QA_RELEASE_EVIDENCE.md` with tester, date, deployment IDs, and evidence links.
