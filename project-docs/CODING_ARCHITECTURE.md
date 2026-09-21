# ChodhiQ coding architecture

ChodhiQ uses pragmatic feature-oriented frontends over one Supabase backend.

## Dependency direction

`UI -> feature hooks -> typed query/mutation modules -> Supabase`

RLS is the authoritative access-control layer. PostgreSQL functions own transactional state changes. Edge Functions own privileged workflows that require secrets or external services. Client validation exists for feedback, not authorization.

## Shared code

- `packages/types` contains framework-neutral domain contracts. Generate database types from the deployed Supabase schema before adopting them in clients; do not hand-maintain a second schema.
- `packages/validation` contains framework-neutral input normalization and validation used by multiple products.
- Share web UI only when both dashboards genuinely use the same component. Do not force React Native and DOM components into one abstraction.

## Application code

- Organize new customer-app work under `src/features/<feature>`.
- Context is reserved for session, theme, and small global UI state. Feature/server state belongs in focused hooks.
- Simple reads may use typed query modules. Security-sensitive or multi-record writes must call reviewed database functions or Edge Functions.
- Realtime subscriptions are created once per feature and update that feature's canonical state/cache.
- Offline persistence is opt-in per workflow and must document conflict and invalidation behavior.

## Privileged operations

- Never rely on a client-side role check.
- Admin mutations must use an audited database function or authenticated Edge Function.
- Every privileged entry point must verify identity and role server-side and have a negative authorization test.

## Migration policy

Refactor incrementally. Preserve public component and hook contracts, move one feature at a time, and run the affected product verification plus shared contract tests after every move.
