# ChodhiQ beta legal information checklist

**Status:** Private planning document. Founder decisions recorded 18 October 2026. The static beta information site has been published; this checklist tracks consistency and launch follow-up.
**Prepared:** 5 October 2026

The official public site is `https://chodhiq.co.uk/` and is hosted through Cloudflare. Static beta page sources (`privacy.html`, `terms.html`, and `delete-account.html`) are in `site-static/`; confirm deployment at the corresponding `chodhiq.co.uk` paths before relying on them. The separate business-dashboard legal routes use a generated approval bundle and are not the same publication. Keep the static pages, draft policies, app disclosures, and store answers consistent.

## 1. Confirmed beta facts and current follow-ups

1. **Operator and organization:** ChodhiQ is the startup/trading name and operates virtually from India. The founder asked that their personal name not appear on the public pages. There is no physical office address. The public pages identify ChodhiQ and provide monitored email contacts; before a wider launch, confirm the legally appropriate controller/operator identity and any required representative details.
2. **Team and territory:** The beta is for UK users; development/operations are in India, with a UK team belonging to the startup. Do not describe the UK team as a UK establishment or GDPR representative without confirming its formal status.
3. **Monitored contacts:** `support@chodhiq.co.uk` for support/moderation/appeals; `office@chodhiq.co.uk` for privacy/deletion; `contact@chodhiq.co.uk` for general enquiries; `business@chodhiq.co.uk` for business/client communications. The aliases forward to the verified Gmail inbox. Support is monitored daily; report acknowledgement target is three working days. Appeals may be filed within 30 days and have a 30-day decision target.
4. **Eligibility:** Founder approved an 18+ beta. The public page states 18+; verify the released app's age controls and store audience disclosures before wider launch.
5. **Cross-border/legal review:** Review the operator's applicable law, UK GDPR territorial scope, any UK representative requirement, international access/transfers, and Online Safety Act scope before wider launch. A beta label does not itself exempt the service from applicable law.
6. **Published data disclosures:** The Privacy page lists account/profile, marketplace, community/photos, provider/business, device/location/push, sponsored-card event, diagnostics, support and safety data. It names Supabase, Resend SMTP for Supabase authentication emails, Google sign-in, Expo/FCM, OpenStreetMap, postcodes.io, Cloudflare confirmation hosting, and Sentry as used by beta-play code paths. It discloses Supabase region Mumbai (ap-south-1), Resend email/log storage in the United States (30-day retention on the Free plan, 7-day backups; Ireland is the sending region only), account deletion within 14 days, and no routine ChodhiQ database backups. Keep these statements aligned with actual deployed configuration and provider account settings.
7. **Public website:** The official site is `https://chodhiq.co.uk/` and is served through Cloudflare. Verify live content and links whenever the static pages in `site-static/` are updated. The business-dashboard legal routes are a separate gated publication path.

## 2. Decisions to approve

8. **Deletion and retention:** The public page states deletion within 14 days after a request and no routine database backups. Keep that promise only while the deployed deletion process and backup configuration support it. The public page does not assign separate periods to each record category; confirm these before wider launch and reconcile with implementation evidence.
9. **Promotions:** The published notice says personal data is not used for marketing or advertising, while separately disclosing labelled first-party sponsored cards, selected-city campaign selection, and session-based view/click counts. Keep this distinction clear; Google banner ads are disabled in the beta profile. Confirm event access and cleanup against the deployed configuration.
10. **Moderation:** Daily support monitoring, 3-working-day acknowledgement, 30-day appeal filing window, and 30-day appeal decision target are the founder's stated operating targets. Review staffing/escalation and complete the applicable UK online-safety scope/risk assessment.
11. **Payments and commercial terms:** The public beta terms state ChodhiQ payments and provider subscriptions are disabled. Confirm that the released beta matches. If paid features are enabled, update pricing, billing, cancellation/refund rules, and privacy disclosures before release.
12. **Wider-launch review:** Before wider launch, complete qualified review of operator identity, governing law, liability language, transfer/representative requirements, record-specific retention, and applicable online-safety duties. The current short beta pages are already published; do not describe the static pages as unpublished.

## 3. Checks for development and operations

These are verification tasks, not facts the founders need to guess:

- Identify the actual production suppliers, SDKs, processors/recipients, service roles, hosting regions, and data received. Source includes Supabase, Expo notifications, optional Sentry, dashboard hosting, and external map/CDN services; actual enabled configuration must be confirmed.
- Confirm which India-based and UK-based personnel can access user information, their roles, supplier contracts, applicable international-transfer arrangements, and security controls. Resend states that email message content and delivery logs are stored in the United States even when the Ireland sending region is selected. Do not claim UK-only storage without evidence.
- Verify signup/age eligibility, real policy links, optional permission explanations, consent, notification preferences, and diagnostics in the signed beta.
- Test hosted deletion with a disposable account: authentication removal, stale sessions, database rows, all upload buckets including application proofs, shared content, device caches, exceptions, and backup restoration controls. Do not use a real account for this test.
- Verify retention jobs and backup expiry against the chosen periods. Record any mismatch for a fix before the policy makes the corresponding promise.
- Inspect promotional delivery and measurement, recipient permissions, network metadata, and any optional tracking. Do not describe session-based records as wholly anonymous.
- Establish secure handling of support, deletion, and formal privacy requests. The in-app export covers accessible records and may not fulfil a complete formal access request.
- Match Google Play Data safety answers, target audience, SDK behaviour, the public policies, and the real released binary. Source checks are not proof of a hosted deployment or phone test.

## 4. Publication steps

1. Keep the already published static beta pages current with the verified build and operational facts.
2. Before enabling the separate business-dashboard legal routes or preparing a wider launch, complete the remaining owner decisions, engineering checks, and legal/privacy review.
3. Only then record approval in `PUBLICATION.json`, run `npm run legal:prepare`, verify the business dashboard, and deploy that separate site. Do not invent values or approval names/dates.
4. Verify public HTTPS pages and test the deletion contact mechanism after each deployment.
5. Keep beta app/store URLs and disclosures aligned with the pages and the exact released build.

The static beta pages are already published. The separate business-dashboard bundle remains unapproved and `PUBLICATION.json` has not been created. `npm run legal:check` may still report unrelated provider-agreement approval items; use its current output rather than treating the published static pages as missing. The PDF is not a substitute for a public page.

## Official references

- [Resend GDPR and data retention](https://resend.com/security/gdpr): Resend says message content and delivery logs are stored in the United States, the selected sending region does not change storage location, and Free-plan email/log retention is 30 days while the account is active; backups persist for 7 days. Checked 19 October 2026.
- [Google Play User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en): public non-PDF Privacy Policy, accurate data disclosures, and account deletion.
- [Google Play account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en): in-app and outside-app request paths; legitimate retained data must be explained.
- [ICO privacy information guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/what-privacy-information-should-we-provide/): identity/contact, purposes and bases, recipients, transfers, retention and rights.
- [CMA unfair contract terms guidance](https://www.gov.uk/government/publications/unfair-contract-terms-cma37): review consumer terms, including liability and other restrictive clauses, for fairness.

References checked on 5 October 2026. Resolve legal requirements for the actual operator and service before publication.
