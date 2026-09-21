# ChodhiQ — South Indian UK Marketplace

ChodhiQ connects the South Indian community in the UK with businesses, freelancers and content creators. End users use the directory and community feed for free; recurring provider subscriptions fund the platform.

## Subscription plans

| Plan | Monthly price | Benefits |
|---|---:|---|
| Free | £0 | Basic profile, contact details, Google Maps, one category, standard search visibility and profile claiming |
| Community | £10 | Free benefits plus up to three promotional image posts per month, offers and community-feed visibility |
| Top 10 | £25 | Community benefits plus promoted Top 10 search placement |
| Top 5 | £50 | All benefits plus promoted Top 5 search placement and maximum exposure |

Paid placements must be relevant to the selected category and location and must always be marked **Sponsored** or **Promoted**.

## Community participation

Customers and providers may publish text-only discussions, recommendations, complaints and personal experiences for free. Promotional images and posters are provider-only paid features. Providers cannot pay to remove criticism; they may reply or request moderation.

## Verification

Before paid features are activated, require email verification, phone verification, proof of ownership, official business evidence and manual admin approval. A verification badge is issued only after approval.

## Secure payment flow

Provider selects plan → Stripe Checkout → verified Stripe webhook → Supabase Edge Function → server-side subscription activation → premium features unlocked.

The mobile app must never activate subscriptions directly. Verification documents belong in private storage, and subscription tables remain protected by RLS and server-only writes.

## Search principles

Ranking combines verification, profile completeness, relevance, location, rating and paid promotion. Payment improves visibility but does not override relevance, safety or quality.
