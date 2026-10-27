# Brand, logo, and operational-account migration

Use this checklist for the ChodhiQ domain and role-based email aliases. The four aliases currently forward to the existing Gmail inbox; they are not separate mailboxes and do not provide branded outbound sending. Do not rename production identifiers or transfer the final owner account until recovery access is tested.

## Recommended mailbox roles

Create role-based mailboxes or shared aliases under the company domain:

| Purpose | Address | Used for |
| --- | --- | --- |
| General enquiries | `contact@chodhiq.co.uk` | Website enquiries and early-access questions |
| Customer support | `support@chodhiq.co.uk` | Customer help, complaints, and in-app support links |
| Business communications | `business@chodhiq.co.uk` | Provider onboarding and client communications |
| Official correspondence | `office@chodhiq.co.uk` | Privacy requests, account deletion, and formal correspondence |

All four addresses currently forward to `chodhiq@gmail.com`. Cloudflare Email Routing handles inbound mail only; replies from Gmail will use the Gmail address unless outbound email is configured separately. The forwarding destination must remain verified and protected with MFA and recovery options.

## Code configuration

### Customer app

Set the `EXPO_PUBLIC_BRAND_*` and contact variables documented in `chodhiq/.env.example`. Native identity settings are supplied separately through:

- `EXPO_APP_SLUG`
- `EXPO_IOS_BUNDLE_ID`
- `EXPO_ANDROID_PACKAGE`

The customer callback scheme is fixed as `chodhiq` across debug and release builds so it stays aligned with the Android intent filters and Supabase redirect allowlist.

The runtime brand defaults live in `chodhiq/src/config/brand.js`. Expo build identity is centralised in `chodhiq/app.config.js`.

Changing a bundle identifier creates a different installed application. Changing the URL scheme requires updating Supabase OAuth allowlists, email redirects, payment callbacks, deep links, and notification links.

### Admin dashboard

Set `NEXT_PUBLIC_BRAND_*`, support, privacy, and security addresses from `admin-dashboard/.env.example`. The supplied light/dark wordmarks and compact favicon are installed in `admin-dashboard/public`; the existing social-preview design now uses the new wordmark.

### Business dashboard

Set `NEXT_PUBLIC_BRAND_*`, support, business, and billing addresses from `business-dashboard/.env.example`. The supplied light/dark wordmarks and compact favicon are installed in `business-dashboard/public`; the existing social-preview design now uses the new wordmark.

## Account transfer order

1. Register and protect the company domain using the new primary-owner mailbox.
2. Keep the four forwarding aliases active and the destination Gmail protected with MFA and recovery options. Move to hosted mailboxes later if separate inboxes or branded replies are needed.
3. Invite the new owner/admin identities to source control, Supabase, Cloudflare/hosting, Expo/EAS, Apple, Google, Stripe, monitoring, and notification services.
4. Verify the new accounts can sign in and perform their intended role before removing personal access.
5. Transfer billing profiles, recovery contacts, webhook contacts, DNS ownership, and app-store agreements.
6. Rotate service secrets and recovery codes after the ownership transfer.
7. Update repository environments using the variables above and deploy to staging first.
8. Test authentication callbacks, deep links, email delivery, payments, notifications, support links, and all three product builds.
9. Promote the verified configuration to production.
10. Remove the personal mailbox only after an access audit confirms that no service still depends on it.

## Logo asset handoff

The latest transparent horizontal wordmark is kept in `assets/brand/source/chodhiq-logo-dark-mode.png`; its dark-text light-surface variant and compact Q icon are derived in the same source folder. Run `workspace-scripts/process-brand-assets.ps1` to refresh the app, dashboard, marketing-site, and documentation copies.

The following source assets are still needed from the designer:

- Editable vector master (`.svg` or design-source file)
- Dedicated high-resolution compact app mark (the current app and browser icons use the Q cropped from the wordmark)
- Written app-icon safe-area guidance
- Social-preview image
- Written colour, spacing, and minimum-size guidance

The current square app and browser icons use the supplied wordmark's Q mark; replace the cropped mark with a dedicated vector or high-resolution square export from the designer when available. Keep social-preview artwork as a separately composed asset rather than enlarging the compact icon.
