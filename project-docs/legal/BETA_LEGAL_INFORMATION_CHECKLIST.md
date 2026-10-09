# ChodhiQ beta legal information checklist

**Status:** Private planning document. No names, personal addresses, or personal contact details supplied in chat have been used. All legal details need fresh confirmation before release.
**Prepared:** 5 October 2026

The Terms and Privacy Policy are beta drafts based on the existing app and dashboard source. They are not published policies. The PDF checklist is a review aid; Google Play requires the public Privacy Policy at a working web URL, not as a PDF.

## 1. Information to provide when ready

1. **Operator:** What is the actual legal arrangement: an individual, joint operators, a partnership, or a registered organisation? Supply the approved legal names/status only when ready to include them in public documents. Do not imply company registration that does not exist.
2. **Postal contact:** What public correspondence address can receive legal and privacy letters? It need not be chosen by the development team; confirm a suitable legitimate address and any applicable address requirements.
3. **Monitored contacts:** Which approved email(s) handle support, complaints, privacy rights, and account deletion? Who is responsible for checking and responding? One monitored inbox can cover several purposes.
4. **Eligibility:** What is the final minimum age, and how should the app enforce it? A sentence in the policy does not implement an age restriction.
5. **Service territory and law:** Where will beta users be served? What is the actual operating base and proposed governing law? Check mandatory consumer/privacy rules rather than assuming that team locations decide these.
6. **Public website:** Which existing or new HTTPS site will host Terms, Privacy, and the outside-app deletion page? A custom domain is optional if the chosen host provides stable public URLs. Supply the chosen origin when ready.

## 2. Decisions to approve

7. **Deletion:** Should deletion remove the user's posts, comments, photos, bookings, and business records? Current source deletes author-linked community posts/comments and user-prefixed uploads. Confirm the intended outcome and legitimate, specific exceptions before changing code or publishing wording. Account deletion must remove associated user data, subject to transparently disclosed legitimate retention.
8. **Retention:** Approve periods or objective criteria for bookings, applications, verification evidence, support requests, moderation/security logs, promotional events, and backups. Assign owners and confirm automatic cleanup. Avoid retaining everything indefinitely or promising immediate backup erasure without evidence.
9. **Promotions:** Will test cards use selected city, categories, interests, or user activity? What view/click data is recorded, who can inspect it, and how long is it retained? Current source accepts a selected city and uses random session identifiers for events. Decide any consent/opt-out requirements after privacy review. Google banner ads are disabled in current beta configuration.
10. **Moderation:** Who handles reports and appeals? Approve a monitored channel, response/appeal targets, urgent escalation, and evidence retention. Review relevant UK online-safety obligations for the actual service.
11. **Payments and commercial terms:** Confirm that the released beta matches the current no-payments configuration. If a paid feature is enabled, provide pricing, billing, cancellation/refund rules, and required payment privacy disclosures before release.
12. **Publication approval:** Approve the final operator arrangement, liability wording, governing law, effective date, policy version, and responsible review/publication owners. Complete legal/privacy review appropriate to the actual service. Do not assume beta or unregistered status creates an exemption.

## 3. Checks for development and operations

These are verification tasks, not facts the founders need to guess:

- Identify the actual production suppliers, SDKs, processors/recipients, service roles, hosting regions, and data received. Source includes Supabase, Expo notifications, optional Sentry, dashboard hosting, and external map/CDN services; actual enabled configuration must be confirmed.
- Confirm overseas staff access and applicable international-transfer arrangements, supplier contracts, and security controls. Do not claim UK-only storage without evidence.
- Verify signup/age eligibility, real policy links, optional permission explanations, consent, notification preferences, and diagnostics in the signed beta.
- Test hosted deletion with a disposable account: authentication removal, stale sessions, database rows, all upload buckets including application proofs, shared content, device caches, exceptions, and backup restoration controls. Do not use a real account for this test.
- Verify retention jobs and backup expiry against the chosen periods. Record any mismatch for a fix before the policy makes the corresponding promise.
- Inspect promotional delivery and measurement, recipient permissions, network metadata, and any optional tracking. Do not describe session-based records as wholly anonymous.
- Establish secure handling of support, deletion, and formal privacy requests. The in-app export covers accessible records and may not fulfil a complete formal access request.
- Match Google Play Data safety answers, target audience, SDK behaviour, the public policies, and the real released binary. Source checks are not proof of a hosted deployment or phone test.

## 4. Publication steps

1. Finish the owner decisions and engineering checks, then complete all placeholders in the Terms, Privacy, moderation, and retention drafts.
2. Review the final wording and record publication approval in `PUBLICATION.json`; do not fill it with invented names or approval dates.
3. Run `npm run legal:prepare`, then the business-dashboard verification. Deploy the reviewed site.
4. Verify public HTTPS `/terms`, `/privacy`, and `/delete-account` without sign-in; also verify the linked moderation and retention pages. Test the deletion contact mechanism.
5. Configure the three real URLs in the beta environment and Play Console. Run the customer release checks and build the signed AAB.

While placeholders remain, legal generation and beta release readiness remain blocked. The current default generated bundle remains unapproved; the legal routes return 404. The PDF is not a substitute for publication.

## Official references

- [Google Play User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en): public non-PDF Privacy Policy, accurate data disclosures, and account deletion.
- [Google Play account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en): in-app and outside-app request paths; legitimate retained data must be explained.
- [ICO privacy information guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/what-privacy-information-should-we-provide/): identity/contact, purposes and bases, recipients, transfers, retention and rights.
- [CMA unfair contract terms guidance](https://www.gov.uk/government/publications/unfair-contract-terms-cma37): review consumer terms, including liability and other restrictive clauses, for fairness.

References checked on 5 October 2026. Resolve legal requirements for the actual operator and service before publication.
