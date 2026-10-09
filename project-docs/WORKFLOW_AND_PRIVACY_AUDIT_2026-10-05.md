# ChodhiQ workflow and privacy source audit — 5 October 2026

## Scope and evidence

Reviewed the customer Expo app, provider web dashboard, admin web dashboard, shared Supabase migrations and the beta critical journeys. This is a source and automated-check audit, not a claim that the hosted dashboards or a phone installation passed. The current tester run sheet has no results recorded.

The customer `npm run verify:release` passed formatting, quality, accessibility, type checks, 112 tests, security and web export. The Android Hermes export passed. The provider dashboard `npm run verify` passed with 27 tests, and the admin dashboard `npm run verify` passed with 23 tests, including Edge Function type checks. The local Supabase suite passed 158 assertions after the pending migrations were applied locally. Production deployment and device tests remain separate gates.

## Privacy fixes made in source

- Signup no longer claims agreement to unpublished, untappable legal documents. Until publication it shows a narrow explanation of beta account data use; once all legal URLs are configured it offers separate Terms and Privacy links.
- Settings → Privacy & your data offers policy, terms and outside-app deletion links when valid published HTTPS URLs are configured. Beta/production EAS builds now require all three URLs and reject obvious placeholder hosts.
- Account export now includes accessible community posts, comments, memberships, permissions, likes, saved posts and blocks, plus business applications. It pages through records instead of silently stopping at the default query limit. It still reflects row-level visibility; a formal subject-access process must handle records that are not visible to the user in-app.
- Sign-out now stops on a Supabase sign-out error before clearing the visible session. A failed account-deletion request no longer clears the active user marker before the server confirms deletion. If server deletion succeeds but device cleanup fails, the app reports that distinction.
- The beta no longer invokes Google's consent SDK or shows its privacy-choice control while Google ads are disabled. The in-app summary now mentions community sharing and anonymous first-party sponsored-card counts.

## Workflow review

| Product path | Source status | Remaining proof |
| --- | --- | --- |
| Signup, email confirmation, password recovery | Implemented with confirmation callback and error states | Physical Android email/deep-link and expired-link tests |
| Customer booking → provider booking view → provider status | Implemented, provider-scoped queries and guarded status changes | Two-account hosted test including duplicate/lost-response case |
| Community photo, private image access, notifications | Implemented with storage and database tests | Android restart, permission-denial and open/background/closed push tests |
| Logout, account deletion, export | Source fixes above; deletion function removes user-prefixed community media | Hosted deletion and stale-session test with disposable account |
| Provider dashboard | Build, type checks and 27 tests passed | Deploy the reviewed source; verify owner isolation and booking responses |
| Admin dashboard | Build, function type checks and 23 tests passed | Deploy ad/community changes; test administrator vs community-owner access |
| Sponsored campaign | Upload/review/approval/pause and active-window rendering implemented | Hosted storage/RLS, schedule, click/impression and no-campaign checks |
| Community privileges | Space, role and individual controls implemented; local SQL tests passed | Hosted migration and separate-user role checks |

## Unresolved gates

1. The operator name, address, age, public site and monitored contact addresses are undecided. Legal drafts cannot be published or linked yet. Do not fill them with assumed values.
2. No public privacy, terms or deletion pages have been verified. The new EAS build guard intentionally prevents a store build without their approved HTTPS URLs.
3. The signed beta AAB and hosted deployments have not been made from this working tree. Manual tester findings have not been supplied, so any runtime defect they reveal remains unknown.
4. The account export is an in-app convenience copy of user-readable records; it is not a complete legal subject-access fulfilment process. The approved privacy notice and support workflow must explain how to request the rest.
