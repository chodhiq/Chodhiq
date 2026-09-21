# Brand, logo, and operational-account migration

Use this checklist when the final company name, logo, domain, and shared mailboxes are approved. Do not rename production identifiers or transfer the final owner account until recovery access is tested.

## Recommended mailbox roles

Create role-based mailboxes or shared aliases under the company domain:

| Purpose | Suggested address | Used for |
| --- | --- | --- |
| Primary ownership | `owner@company-domain` | Domain registrar, cloud organisation, billing recovery |
| Engineering | `engineering@company-domain` | Source hosting, deployments, technical alerts |
| Administration | `admin@company-domain` | Admin dashboard access and operational ownership |
| Support | `support@company-domain` | Customer help and in-app support links |
| Business support | `business@company-domain` | Provider onboarding and verification help |
| Privacy | `privacy@company-domain` | Data requests, deletion, retention questions |
| Security | `security@company-domain` | Vulnerability reports and security alerts |
| Billing | `billing@company-domain` | Stripe, invoices, subscription support |
| Legal | `legal@company-domain` | Terms, policies, complaints, formal notices |

Use shared access, MFA, recovery codes, and at least two authorised administrators for critical accounts. Avoid making one employee mailbox the sole owner.

## Code configuration

### Customer app

Set the `EXPO_PUBLIC_BRAND_*` and contact variables documented in `chodhiq/.env.example`. Native identity settings are supplied separately through:

- `EXPO_APP_SLUG`
- `EXPO_APP_SCHEME`
- `EXPO_IOS_BUNDLE_ID`
- `EXPO_ANDROID_PACKAGE`

The runtime brand defaults live in `chodhiq/src/config/brand.js`. Expo build identity is centralised in `chodhiq/app.config.js`.

Changing a bundle identifier creates a different installed application. Changing the URL scheme requires updating Supabase OAuth allowlists, email redirects, payment callbacks, deep links, and notification links.

### Admin dashboard

Set `NEXT_PUBLIC_BRAND_*`, support, privacy, and security addresses from `chodhiq-admin-dashboard/.env.example`. Replace `public/favicon.svg` and `public/og.png` after final logo assets are approved.

### Business dashboard

Set `NEXT_PUBLIC_BRAND_*`, support, business, and billing addresses from `chodhiq-business-dashboard/.env.example`. Replace `public/favicon.svg` and `public/og.png` after approval.

## Account transfer order

1. Register and protect the company domain using the new primary-owner mailbox.
2. Create role mailboxes, MFA, recovery codes, and a password-manager organisation.
3. Invite the new owner/admin identities to source control, Supabase, Cloudflare/hosting, Expo/EAS, Apple, Google, Stripe, monitoring, and notification services.
4. Verify the new accounts can sign in and perform their intended role before removing personal access.
5. Transfer billing profiles, recovery contacts, webhook contacts, DNS ownership, and app-store agreements.
6. Rotate service secrets and recovery codes after the ownership transfer.
7. Update repository environments using the variables above and deploy to staging first.
8. Test authentication callbacks, deep links, email delivery, payments, notifications, support links, and all three product builds.
9. Promote the verified configuration to production.
10. Remove the personal mailbox only after an access audit confirms that no service still depends on it.

## Logo asset handoff

Request these approved source files from the designer:

- Editable vector master (`.svg` or design-source file)
- Full horizontal logo and compact mark
- Light and dark variants
- Transparent PNG exports
- Square app icon with safe padding
- Android adaptive foreground/background assets
- iOS 1024×1024 icon without transparency
- Web favicon and social-preview image
- Written colour, spacing, and minimum-size guidance

Keep temporary initials until the approved assets arrive. Do not upscale a small raster logo for app-store or social assets.
