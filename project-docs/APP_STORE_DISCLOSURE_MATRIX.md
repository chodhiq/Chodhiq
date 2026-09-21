# ChodhiQ app-store disclosure matrix

Status: requires signed-build and counsel verification before submission.

| Capability/data | Purpose | Linked to identity | Tracking | User control/evidence |
| --- | --- | --- | --- | --- |
| Email/profile | Authentication and account service | Yes | No | Export/deletion workflow test pending |
| Approximate location/city | Nearby marketplace discovery | Potentially | No | Permission denial and settings test pending |
| Photos/camera | Optional profile, review and community uploads | Yes when submitted | No | Permission strings configured; device test pending |
| Quotes/bookings/messages | Customer-provider workflows | Yes | No | Participant-only RLS test pending |
| Verification documents | Provider ownership review | Yes | No | Private storage/signed URL test pending |
| Push token | Opted-in notifications | Yes | No | Opt-in/out and token clearing test pending |
| Purchases | Provider subscriptions through Stripe | Yes | No | Stripe lifecycle test pending |
| Diagnostics | Reliability and security | Minimise/pseudonymise | No | Redaction and retention approval pending |
| Advertising identifier | Optional advertising, only if enabled and consented | Platform-dependent | Potentially | Production configuration currently keeps payments off; genuine-ID/consent test pending |

Submission owners must reconcile this matrix with the exact signed binary, Apple privacy labels, Google Play Data safety form, SDK manifests, privacy policy URL, account-deletion URL and advertising configuration. Any SDK or feature change requires a new review.

