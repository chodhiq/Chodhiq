# Provider email confirmation incident — 2026-09-22

Production Supabase Auth redirected a provider signup confirmation to `http://localhost:3000`, which was unreachable outside a local development server. Authentication → URL Configuration had that localhost Site URL and no redirect allowlist entries. The business dashboard already passed `window.location.origin` to `signUp`, but Supabase ignored that unlisted redirect and used the Site URL.

## Production configuration corrected

- Site URL: `https://chodhiq-business-dashboard.chodhiq.workers.dev`
- Exact Redirect URLs: the business and admin dashboard origins, `chodhiq://auth/callback`, and `chodhiq://auth/reset`

The Supabase dashboard displayed the saved Site URL and all four redirect entries. Older emails retain their original localhost target. Request a fresh confirmation email after the change.

The affected `domg0772@gmail.com` production account was confirmed and recorded a sign-in shortly after the original email was sent. It does not need another confirmation; the provider can sign in at the hosted business dashboard with the password set during signup.

## Provider app follow-up

The business dashboard source now offers a resend confirmation action after signup and on the sign-in form. It requests the hosted origin as `emailRedirectTo`. On a signup confirmation return, the app establishes the session and removes tokens from the address bar. `npm run verify` passed (lint, web and worker type checks, build, 21 tests).

After the account owner approved the full verified business dashboard build, Wrangler deployed it to the Production Worker on 2026-09-22 with `--keep-vars`. Cloudflare reported version `a2c16696-d1c5-4d46-97d8-116837e52fa7`. A browser reload of the hosted provider sign-in page showed the new **Resend confirmation email** action. The local Production target check passed, and the hosted admin applications page loaded in Chrome.

A fresh email click-through has not been exercised. Live provider password entry and submission remain for the account owner; the affected account is already confirmed.
