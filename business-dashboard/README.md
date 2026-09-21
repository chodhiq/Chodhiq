# ChodhiQ Business Dashboard

The owner workspace for verified ChodhiQ providers. Business owners can manage their public profile, opening hours, services, reviews, organic community promotions, customer leads, analytics and notifications. Subscription checkout is disabled for the initial launch.

## Requirements

- Node.js 22.13 or newer
- The same Supabase project and migrations used by the ChodhiQ customer app
- A provider owned by the signed-in user
- Approved provider verification before the main workspace unlocks

## Environment

Copy `.env.example` to `.env.local` and set the public Supabase URL and publishable/anonymous key. Never put a Supabase service-role key in this browser application.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_KEY
SITE_URL=http://localhost:3000
```

## Commands

```bash
npm install
npm run dev
npm run verify
```

`npm run verify` runs lint, browser and worker type checks, a production build, route tests, and business-input validation tests.

## Backend dependencies

The dashboard relies on Row Level Security for provider ownership. Apply the canonical migrations from `../supabase/migrations` before testing. Required storage buckets include private `verification-documents` and public `provider-media`, both with owner-scoped write policies.

Stripe checkout remains behind both the dashboard `NEXT_PUBLIC_ENABLE_PAYMENTS` flag and the Edge Function `ENABLE_PAYMENTS` server-side kill switch. Both default to `false` for the initial launch.

## Release gates still requiring an environment

- Test claim, verification, owner isolation, lead response, and review reply with two real staging accounts.
- Verify organic promotion policy and moderation, and prove the checkout kill switch returns HTTP 503.
- Confirm storage upload, cleanup, MIME, and size policies in Supabase.
- Test responsive layouts and keyboard/screen-reader behavior in supported browsers.
- Configure production domains, redirects, monitoring, backups, and support ownership.
