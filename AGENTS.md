# ChodhiQ workspace instructions

This directory is the single authoritative ChodhiQ workspace.

- Make all current and future product changes only under `C:\Users\ASUS\Documents\Codex\chodhiq`.
- The customer Expo app is at the workspace root.
- The provider web app is in `business-dashboard`.
- The administration web app is in `admin-dashboard`.
- Shared Supabase migrations and functions are in `supabase`.
- Shared release documentation is in `project-docs`.
- Do not use or synchronize older copies under Downloads unless the user explicitly requests recovery from a named backup.
- Preserve `.env` and `.env.local` files and never commit or display their secret values.
- Before handing off code changes, run the relevant verification command from this workspace.
