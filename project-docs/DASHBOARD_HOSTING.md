# ChodhiQ dashboards

The existing production dashboards are hosted directly on Cloudflare Workers:

- Admin: https://chodhiq-admin-dashboard.chodhiq.workers.dev
- Business: https://chodhiq-business-dashboard.chodhiq.workers.dev

The local `.openai/hosting.json` files contain older Sites project references; those IDs do not identify these direct Cloudflare deployments.

The authoritative source directories are `admin-dashboard` and `business-dashboard` in this workspace. Run `npm run verify` in the changed dashboard before publishing. The generated Worker configuration is `dist/server/wrangler.json`. Preserve hosted variables when updating an existing deployment (`wrangler deploy --config dist/server/wrangler.json --keep-vars`). Never copy credentials into this document.

## Responsive layout verification — 2026-09-08

Both dashboards passed their full verification commands (lint, type checks, production builds, and 35 tests total). Responsive styles load after feature and theme styles to prevent desktop overrides from breaking mobile layouts.

Live-device visual verification remains required: inspect phone and tablet widths, all navigation items, sign-in/reset forms, business opening and closing times, admin tables, and the menu drawer. Automated build checks do not establish visual correctness.

## Admin navigation follow-up — 2026-09-08

The user confirmed phone login and password recovery work, but reported that admin menu selections did not change the page. Admin navigation, search results, overview shortcuts, provider details, and report links now use the shared `app/components/admin-link.tsx` native anchor component. This avoids the client router's asynchronous transition path; destination pages restore the persisted Supabase session and enforce the existing admin role gate.

Admin verification passed (lint, all type checks, production build, and 19 tests). A local component check verified native anchors and intact query/fragment destinations. The precise original browser failure was not reproduced. The user will test the authenticated flow manually; do not operate their browser without permission.
