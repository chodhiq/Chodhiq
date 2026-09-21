# Provider directory publication audit

Reviewed: 2026-08-15

## Publication rules

A listing is not production-ready merely because its details are public elsewhere. Publish only when all of these are recorded:

1. The business is currently trading and its name, service, address, phone and official URL agree across authoritative sources.
2. South Indian relevance is explicit in the business's own description or documented service offering (for example Tamil, Telugu, Malayalam/Kerala, Kannada, Chettinad, or South Indian). Do not infer ethnicity from a person's or business's name.
3. `provider_publication_consents.status = 'consented'`, with a dated contact reference.
4. Images are uploaded by the owner, licensed to ChodhiQ, or supplied under an explicitly compatible licence. Search-engine and Google Maps imagery must not be copied.
5. Verification and publication consent are separate decisions.

## Current findings

- The South Indian import contains many strong explicit matches, especially records labelled South Indian, Tamil/Chettinad, Kerala, Tamil weddings, Bharatanatyam, or Kerala clothing.
- Broad entries labelled only Indian, Gujarati, Hare Krishna, multicultural, or South Asian are not confirmed South Indian matches. Keep them out of the production South Indian filter until manually substantiated.
- Every imported record currently says ownership is not verified. Treat consent as `not_contacted` until evidence is recorded in the consent table.
- The seven legacy mock listings use Picsum placeholder photography. The app now rejects those URLs and displays bundled category artwork; galleries remain empty until authorised provider images exist.
- `SA Electrical & Plumbing Contractors` has a Maps-derived phone/address record, but the discovered official SA Electrical pages describe electrical services and use different contact details. This is not sufficient to verify a dedicated plumber profile.
- No dedicated plumber with explicit, authoritative South Indian relevance was found in this audit. Do not fabricate or infer one. Add the first candidate through owner onboarding and consent, or document an explicit community-service source before import.

## Consent outreach template

Subject: Please confirm your free ChodhiQ business listing

Hello,

We are preparing ChodhiQ, a UK directory for South Indian communities. We found publicly available details for **[business]** at **[source]**. Before publishing, please confirm that you want the listing included and that the business name, category, address, phone, website and service areas are correct.

Please also send photographs you own and authorise ChodhiQ to display, or confirm that we should publish without photos. Consent can be withdrawn at any time by contacting **[support address]**.

No outreach has been sent from this repository. A team member must use an approved business communication channel and record the response reference without storing private message content unnecessarily.
