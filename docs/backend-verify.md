# Backend verification

Read-only source verification. No secrets or secret values are reproduced.

## A. Community feed

1. Post list load: `src/hooks/useCommunityFeed.js:75-90` selects published rows from `community_posts`; `src/hooks/useCommunityFeed.js:112-115` loads engagement counts through `community_post_engagement_for_posts`. `screens/CommunityFeedScreen.tsx:106-114` invokes that hook.
2. Post button publish: `components/composer/PostComposer.tsx:101-107,247-251` calls `submit`; `components/composer/useComposerFlow.ts:69` calls the passed `onSubmit`; `screens/CommunityFeedScreen.tsx:174-190` maps it to `publishPost`; `src/hooks/useCommunityFeed.js:246-294` inserts into `community_posts` (or queues a local post if Supabase is unavailable). Queued community posts later use `publish_queued_community_post` at `src/data/syncRepository.js:26-30`.
3. Like writes: `src/hooks/useCommunityFeed.js:329-338` insert/delete `community_post_likes`. Bookmark writes: `src/hooks/useCommunityFeed.js:381-390` insert/delete `community_saved_posts`. Comment writes: `src/hooks/useCommunityFeed.js:459-469` inserts into `community_comments` and replaces the optimistic comment with the returned row. Screen handlers connect these at `screens/CommunityFeedScreen.tsx:220-223`.
4. Pull-to-refresh: `screens/CommunityFeedScreen.tsx:470-477` calls `refresh`; `src/hooks/useCommunityFeed.js:220-233` resets/loading flags and calls `loadPosts`.

`CommunityFeedScreen.tsx:85` is the component function declaration. Lines 220-221 pass handlers to `PostCard` that invoke `toggleLike` and `toggleSave` through `runAction`; neither location is a fixture declaration. The previous audit statement “uses fixture posts” is **FALSE for the current code**. The current screen is wired to the real backend hook. It also maps published posts into a temporary composer success card (`screens/CommunityFeedScreen.tsx:174-187`), which is local presentation only; the hook performs the backend insert and reloads the first page (`src/hooks/useCommunityFeed.js:289-294`).

## B. Service-role key

### 1. Variable names and locations

No matching variable name begins with `EXPO_PUBLIC_`.

- `SUPABASE_SERVICE_ROLE_KEY`: `.env.example:41`; `docs/OPERATIONS_RUNBOOK.md:15`; `admin-dashboard/README.md:22`; read from server environment in `supabase/functions/uk-address-suggestions/index.ts:25`, `stripe-webhook/index.ts:28`, `push-notification/index.ts:33`, `ingest-mvp-event/index.ts:32`, `deliver-provider-leads/index.ts:16`, `delete-account/index.ts:62`, `create-checkout-session/index.ts:66`, `check-push-receipts/index.ts:20`, and `admin-user-control/index.ts:43`; `admin-role-control/index.ts:13`.
- `STAGING_SERVICE_ROLE_KEY`: `workspace-scripts/reset-staging.mjs:6,15`.
- `E2E_SUPABASE_SERVICE_ROLE_KEY`: `README.md:53`, `tests/authenticated-workflows.mjs:8,52`, `tests/cleanup-staging-e2e.mjs:5`, `tests/staging-full-workflows.mjs:6`.
- Literal role identifier `service_role` also appears in SQL/migrations, docs, and tests; those are role references, not additional environment variable names.

### 2. Environment files and ignore state

`.env`, `.env.example`, and `.env.local` exist. `.env` is matched by `.gitignore:1` and `.env.local` by `.gitignore:2`; neither is tracked by Git. `.env.example` is a template and is not covered by those ignore patterns. No other `.env*` files were found in the workspace root. No values are included.

### 3. Client/config scan

No service-role key name or JWT-shaped string match was found in `app.config.js`, `eas.json`, `src/`, `screens/`, or `components/`. The repository has no root `app.json` (configuration is in `app.config.js` and `app.base.json`).

### 4. Git history

`git log --all -S"SERVICE_ROLE" --oneline` returns matches: **YES** (32 commits). This establishes historical occurrences of the name/string, not that a secret value was committed. No secret values were examined or printed.

### 5. Edge Functions using the key

`uk-address-suggestions`, `stripe-webhook`, `push-notification`, `ingest-mvp-event`, `deliver-provider-leads`, `delete-account`, `create-checkout-session`, `check-push-receipts`, `admin-user-control`, and `admin-role-control` read a server-side service-role environment variable. No values are reported.
