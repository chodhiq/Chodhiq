# Store privacy and content disclosures

**Status:** Submission worksheet; answers must be reconciled with the signed production binaries and SDK manifests.

## Apple App Privacy candidate answers

| Apple data type                     | Collected                                                   | Linked to user     | Tracking    | Purpose                                                    |
| ----------------------------------- | ----------------------------------------------------------- | ------------------ | ----------- | ---------------------------------------------------------- |
| Name / email address                | Yes                                                         | Yes                | No          | App functionality, account management                      |
| User ID                             | Yes                                                         | Yes                | No          | App functionality, security                                |
| Physical address                    | No for customers; provider service location may be supplied | Yes where supplied | No          | App functionality                                          |
| Approximate location                | Yes when enabled/selected                                   | Potentially        | No          | App functionality                                          |
| Photos or videos                    | Optional                                                    | Yes                | No          | Profile, review, community and provider functionality      |
| Other user content                  | Yes                                                         | Yes                | No          | Quotes, bookings, reviews, posts, reports and verification |
| Purchases                           | Only if provider subscriptions are enabled                  | Yes                | No          | App functionality                                          |
| Device ID / push token              | Yes                                                         | Yes                | No          | Notifications, security                                    |
| Crash and performance data          | Yes when Sentry is enabled                                  | Minimise linkage   | No          | App functionality, analytics limited to diagnostics        |
| Advertising data/device identifiers | Only when advertising is enabled and consent allows         | SDK-dependent      | Potentially | Third-party advertising                                    |

Confirm whether Google Mobile Ads constitutes tracking in the final configuration and complete Apple's tracking-domain/ATT requirements if applicable. Do not declare “data not collected.”

## Google Play Data safety candidate answers

- Account, personal information, app activity, user-generated content, approximate location, photos/files, device identifiers, diagnostics and optional purchase information are collected as described above.
- Data is encrypted in transit.
- Users can request deletion both in-app and through the public deletion page.
- Data sharing must include each production SDK/vendor recipient. Advertising disclosures depend on the exact consent and SDK configuration in the submitted artifact.
- Complete the separate content-rating questionnaire for user-generated community posts, reviews and direct customer-provider communications.

## Permissions and declarations

| Permission/capability        | User-facing purpose                                            | Gate                                               |
| ---------------------------- | -------------------------------------------------------------- | -------------------------------------------------- |
| Approximate/precise location | Show nearby businesses and services                            | Test denial and settings recovery on signed builds |
| Camera/photos                | User-chosen profile, review, community or verification uploads | Confirm actual Android/iOS permission manifests    |
| Notifications                | Quote, booking, provider and account updates                   | Opt-in; confirm token clearing on opt-out          |
| Advertising identifier       | Optional advertising delivery/measurement                      | Confirm consent, declarations and production IDs   |

Required Play/App Store declarations also include ads, app access/reviewer credentials, target audience/age, content rating, data deletion, privacy policy, content rights and export/encryption compliance.
