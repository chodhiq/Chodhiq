# ChodhiQ beta privacy policy

**Status:** Working copy aligned to the published beta Privacy page; wider-launch review remains open.
**Version:** 0.1.1-beta
**Effective date:** 19 October 2026 (updated beta page)

## 1. Who is responsible for your information

ChodhiQ is the startup's trading name and operates virtually from India. It has no physical office address. The founder asked that their personal name not appear on the public beta pages. For privacy questions, rights requests, or account deletion, contact `office@chodhiq.co.uk`. General enquiries: `contact@chodhiq.co.uk`; support, moderation, and appeals: `support@chodhiq.co.uk`; business and client communications: `business@chodhiq.co.uk`. This notice covers the ChodhiQ beta app and related provider and administration dashboards.

The current beta is intended for users in the United Kingdom. Development and operations are in India, with a UK team belonging to the startup. Any expansion to other countries will be assessed before launch there. The team's formal establishment/representative status and any required cross-border arrangements remain for wider-launch review.

## 2. Information used by the beta

- **Accounts:** name, email, authentication identifiers, profile fields, selected area, preferences, and login/session information. The authentication provider handles passwords and confirmation or recovery links.
- **Marketplace activity:** saved providers, searches and discovery activity where recorded, enquiries and quote requests, booking details, provider responses, reviews, and reports.
- **Community activity:** posts, comments, likes, saved posts, memberships, space permissions, block/report actions, personal listings, and photos you choose to upload. A post may include your selected city when you choose to share it.
- **Business information:** listings, contact and service details, ownership claims, applications, verification evidence, and decisions recorded by authorised reviewers.
- **Device and permissions:** platform information, push-notification tokens and preferences, and location coordinates when you grant permission. Coordinates may be precise depending on your device permission. The app stores selected location and some coordinates/preferences locally to support discovery after reopening.
- **Test promotions:** the campaign and placement, a randomly generated app-session identifier, view or click event, and event time. The first-party event code does not store a long-lived advertising identifier or a viewer's name/email in the campaign event record. This does not make all technical or network data anonymous.
- **Diagnostics:** errors, app area, operation, platform, and technical performance information. Error reporting attempts to redact direct identifiers; technical logs may still contain personal information and need controlled access.
- **Support and safety:** messages you send us, privacy/deletion requests, moderation reports, reviewer actions, and security/audit records.

Current beta configuration disables ChodhiQ payments and Google banner ads. This policy does not assume that future payment or advertising features are active. Those features require a reviewed policy and appropriate disclosures before activation.

Do not put passwords, identity documents, health information, or other sensitive details in public posts or ordinary bug reports. Upload verification evidence only through the designated private process. Photos and documents can contain metadata or information about other people; only submit material you are authorised to share.

## 3. Why information is used

We use information to provide accounts, discovery, enquiries, bookings and community features; deliver service notifications; review business applications; respond to requests; investigate abuse; and diagnose failures.

The beta uses information for the purposes below. The precise lawful basis for each processing activity must be confirmed against the deployed service before wider launch:

- **Contract or steps at your request:** information necessary to create an account and provide the core service you request.
- **Legitimate interests:** proportionate security, fraud prevention, moderation, and service reliability, subject to a documented assessment and your right to object.
- **Consent where applicable:** genuinely optional processing where consent is required. A device permission or acceptance of the Terms is not blanket consent to marketing, analytics, or tracking.
- **Legal obligation:** processing required by an identified applicable law, where that obligation actually applies.

Location is used for nearby discovery when permitted; diagnostics support reliability and security; sponsored-card selection can use the selected city and view/click counts use a randomly generated app-session identifier. The beta does not use personal data for marketing or third-party advertising. Any required consent or legitimate-interests assessment must be completed before changing these purposes or enabling optional third-party advertising.

## 4. Permissions and local storage

You may refuse location, photos/media, or notification permissions and change them later in device settings. Refusal limits the relevant feature but should not prevent unrelated use. Where supported, you can select an area manually instead of sharing coordinates.

Local storage supports sign-in sessions, preferences, selected area, cached/offline content, and pending actions. Native authentication tokens use secure storage where supported. Browser storage is subject to your browser and device controls. Uninstalling the app is not the same as deleting a server account.

Push notifications may display some message content on your lock screen, depending on device settings. Do not assume a notification is private from anyone who can see your device.

## 5. Test promotional cards

Approved test campaigns may appear in the home feed. Current source can select campaigns using the selected city and records session-based view/click events to measure delivery. Provider and administrator permissions govern access to campaign metrics and records.

Campaign selection may use the selected city. First-party campaign view/click events use a randomly generated app-session identifier and event time; provider and administrator permissions govern access. The beta does not use personal data for marketing or advertising, and Google banner ads are disabled. We will revise this notice and required in-app disclosures before introducing materially different targeting or third-party advertising.

Opening a promotional destination or another external link sends you to a separate service whose privacy practices apply there.

## 6. Who receives information

- The provider receives the information needed to handle your enquiry or booking. Providers are responsible for their own handling of information outside ChodhiQ.
- Other users can see content and profile information you make visible in public or shared community spaces. Access to restricted spaces depends on membership and permissions. Others may keep copies of content they have already seen.
- Authorised ChodhiQ staff and reviewers access information needed for support, verification, moderation, administration, and security.
- Technical services used by beta-play code paths include Supabase (authentication, database, storage, and Edge Function requests); Resend (SMTP delivery for Supabase authentication emails, including confirmation and password recovery); Google (native Google sign-in); Expo and Firebase Cloud Messaging (push-token registration and Android push delivery); OpenStreetMap (map tiles); postcodes.io (postcode suggestions); Cloudflare-hosted ChodhiQ confirmation page (email-confirmation callback); and Sentry (crash/error reports and sampled performance traces). Use depends on the feature and user choices. This list describes services in use and does not determine each supplier's legal role or every item of information they may receive. Stripe payments and Google Mobile Ads are disabled in the beta-play profile. The Google Maps SDK is disabled in that profile; Google Maps direction links remain available.
- For authentication email delivery, Resend receives recipient email addresses, message content, and delivery logs. Resend states that customer data, including message content and delivery logs, is stored in the United States. The Ireland sending region controls where email is sent from; it does not change the storage location. On the Free plan, Resend retains email and log data for 30 days while the account is active; its backups persist for 7 days.
- We may share limited information with advisers or competent authorities where necessary and lawful.

Community photos use a private storage bucket and time-limited access links in the current implementation, but authorised viewers can download or copy an image. Sponsored-card images are public. Loading external map tiles or resources sends technical information such as IP address and the requested map area/resources to those services; the approved recipient list must include them.

## 7. Processing outside the UK

Hosting, supplier operations, or authorised team access may involve information being processed outside the UK. The team operates from India and also has a UK team. Supabase app data is stored in South Asia (Mumbai, ap-south-1). Resend stores email message content and delivery logs in the United States; the configured Ireland sending region does not change that storage location. Team access, supplier processing locations and safeguards, and whether a UK representative is required remain for wider-launch review.

We will not describe UK-only storage or claim an international-transfer safeguard without confirming it for the production configuration.

## 8. Retention and account deletion

After an account deletion request, personal data is deleted within 14 days, except for limited records that the law requires ChodhiQ to keep. No routine database backups are currently kept. Device session, preference, selected-area, and cached information may remain on the device until cleared or the app is uninstalled. The separate [retention schedule](./RETENTION_POLICY.md) records the additional category-level periods and operational checks still to be confirmed before wider launch.

Request account deletion in **Profile > Settings > Privacy & your data**, or use the outside-app page at `https://chodhiq.co.uk/delete-account.html`. You can also send a request to `office@chodhiq.co.uk`. We may ask for proportionate proof of account ownership; do not send your password. If you no longer have access to the account email, explain this so an alternative verification method can be considered.

The final policy must explain which account records, posts, comments, photos, and business records are removed; which specific records may lawfully remain; and when remaining copies expire. Account suspension or uninstalling the app does not itself complete deletion. Copies held independently by recipients are outside the app deletion mechanism, although relevant privacy rights may still apply to them.

## 9. Your choices and rights

Depending on the circumstances, you can request access, correction, deletion, restriction, or portability, and object to processing. Where processing is based on consent, you may withdraw consent without affecting earlier lawful processing. Where we rely on legitimate interests, **you have the right to object to that processing**. You also have the right to object to processing for direct marketing.

The in-app export provides a copy of records accessible to your account; it is not necessarily a complete response to a formal access request. Contact `office@chodhiq.co.uk` for a formal request or assistance. We will explain any applicable limitation and may verify identity proportionately.

You can complain to the UK Information Commissioner's Office through [ico.org.uk](https://ico.org.uk/). You may contact us first if you wish, but doing so is not a condition of complaining to the regulator.

## 10. Age limit

ChodhiQ's intended minimum user age is 18. Contact `office@chodhiq.co.uk` if you believe someone below the permitted age has provided personal information. An age-checking control will be implemented and verified before launch.

## 11. Security and changes

The current implementation uses authentication, role and database access controls, private storage for relevant uploads, and restricted privileged server operations. No service can guarantee complete security. The final operational safeguards, supplier agreements, incident process, and reviewer access must be verified before release.

We will update this policy when practices change, state its effective date, and provide appropriate notice of material changes. A beta label does not reduce the privacy information or protections users need.

## Wider-launch review notes

- This working copy reflects the currently published beta notice. Before a wider launch, review the appropriate controller identity and contact disclosures, any UK representative requirement, team/supplier access and transfer safeguards, and age/store disclosures. ChodhiQ currently operates virtually and has no physical address; do not insert one unless supplied.
- Current source deletes author-linked community posts/comments through database cascades and removes user-prefixed community/provider/verification files before deleting authentication access. Do not change this behaviour or present a different policy without an approved decision and a tested implementation.
- Confirm hosted deletion, business-application uploads, linked records, device caches, retention jobs, backup expiry, and any retained log identifiers; source inspection alone does not prove complete hosted deletion.
- Confirm location precision, promotion targeting and event measurement, diagnostic suppliers, map services, hosting regions, and overseas access against the signed beta and deployed dashboards.
- Confirm lawful bases, supplier roles/recipients, transfer safeguards, retention/deletion controls, and relevant assessments. Match the published text, in-app disclosures, consent flows, and Google Play Data safety answers.
- The separate business-dashboard publication workflow requires its own review/approval record; it is independent of the static beta notice served through the Cloudflare website.
