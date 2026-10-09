# ChodhiQ public legal pages

The business dashboard hosts `/terms`, `/privacy`, `/delete-account`, `/moderation-policy`, and `/retention-policy`. Until legal publication is approved, these routes return 404. The customer beta build separately refuses missing or placeholder HTTPS legal URLs.

Before publication, decide and verify the legal operator name and address, company number (or an accurate not-applicable statement), support and monitored privacy email addresses, minimum user age, effective date, governing law, and approved liability wording. Confirm the actual public website origin. Review the policies against production data flows, the retention schedule, processors and transfers, the account deletion implementation, and Google Play Data safety answers. Obtain legal and privacy sign-off. Do not put invented values into these documents.

Fill the placeholders in `TERMS_OF_SERVICE.md`, `PRIVACY_POLICY.md`, `MODERATION_POLICY.md`, and `RETENTION_POLICY.md`. Create `PUBLICATION.json` from `PUBLICATION.example.json` with the approved HTTPS origin, monitored privacy email, approving names, and approval date. Run `npm run legal:prepare` from the workspace root. It refuses missing approval fields, invalid URL/email, and unresolved placeholders, then writes the approved content to `business-dashboard/lib/legal-publication.generated.json`.

Review the generated pages and run `npm run verify` in `business-dashboard`. Deploy that site, then check that all five routes return 200 without sign-in on the actual public origin, have the reviewed content, and that the deletion email is monitored and can process a request. Set `EXPO_PUBLIC_TERMS_URL`, `EXPO_PUBLIC_PRIVACY_URL`, and `EXPO_PUBLIC_DELETE_ACCOUNT_URL` in the beta build environment to the corresponding real HTTPS URLs. Run `npm run verify:release` and build a new beta AAB. Enter the same privacy and deletion URLs in Play Console.

The published legal text is versioned with the code. Any later policy change requires a fresh review, `legal:prepare`, deployment, and confirmation that the app and store links still resolve.
