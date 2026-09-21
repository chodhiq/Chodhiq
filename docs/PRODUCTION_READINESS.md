# Production readiness gates

ChodhiQ is releasable only when every blocking gate below has evidence attached to the release.

## Automated gates

- `npm ci` succeeds from a clean checkout.
- `npm run verify:release` passes.
- `npm run test:e2e:staging` runs without a skip.
- `npm run test:db` passes against the local Supabase stack.
- Supabase migrations apply to an empty database and a production-like snapshot.
- Dependency audit has no unaccepted high or critical findings.

## Mobile gates

- Signed Android and iOS release builds install on physical devices.
- Email, Google and Apple authentication return to the release build.
- VoiceOver and TalkBack cover onboarding, discovery, booking, claims, settings and deletion.
- Large text, reduced motion, dark themes, keyboard navigation and screen rotation are checked.
- Poor network, offline startup, expired session and interrupted uploads have usable recovery states.
- Notification permission denial, opt-out, receipt, tap and deep-link behavior are verified.

## Backend gates

- RLS integration tests prove cross-account reads and writes fail.
- Claim approval is the only path that assigns imported-listing ownership.
- Verification files are private and disappear after account deletion.
- Stripe test clocks cover renewal, failed payment, recovery, cancellation, refund and dispute.
- Webhook replay and duplicate delivery are tested.
- Backup restoration and migration rollback are rehearsed.

## Legal and operations gates

- Counsel approves privacy policy, terms, provider agreement and retention schedule.
- Support, moderation, incident response and data-rights owners are named.
- Store privacy disclosures match actual collection and SDK behavior.
- Error, function, database and payment alerts route to an on-call owner.
