# Showcase evidence package

Run `node scripts/verify-showcase.mjs` from the workspace root immediately before the showcase and retain its terminal output with the release commit hash.

Manual evidence still required:

- Desktop screenshots at 1440×900 for mobile web, business dashboard, and every admin route being showcased.
- Mobile screenshots at 390×844 for customer provider details, review form, booking form, quote history, business leads, and critical admin pages.
- Browser console screenshot showing no errors or hydration warnings after navigating the full route.
- Short recording of administrator sign-in, non-admin rejection, provider edit/refresh, verification, moderation, suspension/reactivation, a partially failed bulk action, and the resulting audit entries.
- Supabase project reference and a written confirmation that it is staging.
- Staging reset command output after the rehearsal.

Do not use screenshots from `.cleanup-quarantine-*`; they are directory-import previews, not current product evidence.
