import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { serviceNames, serviceTaxonomy } from '../src/data/serviceTaxonomy.js';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('launch service taxonomy is complete and database-backed', async () => {
  assert.equal(serviceTaxonomy.length, 9);
  assert.equal(serviceNames.length, 120);
  for (const required of [
    'Solar Installer',
    'Roadside Assistance',
    'Disability Support',
    'SEO Specialist',
    'Man with a Van',
    'Massage Therapist',
    'Wedding Planner',
    'Malayalam Teacher',
    'Waste Management',
  ]) {
    assert.ok(serviceNames.includes(required), `${required} is missing`);
  }
  const migration = await read('supabase/migrations/20260831100000_canonical_service_catalog.sql');
  assert.match(migration, /create table if not exists public\.service_catalog/);
  assert.match(migration, /catalog_service_id uuid references public\.service_catalog/);
  assert.match(migration, /Public reads active service catalogue/);
});

test('production demo assets are not referenced and ad delivery requires consent', async () => {
  const [catalog, discovery, banner, consent, privacy, appConfig] = await Promise.all([
    read('src/data/assetCatalog.js'),
    read('src/data/discoveryData.js'),
    read('src/components/GoogleBanner.native.js'),
    read('src/hooks/useAdvertisingConsent.native.js'),
    read('src/screens/PrivacyScreen.js'),
    read('app.config.js'),
  ]);
  assert.doesNotMatch(catalog, /assets\/demo/);
  assert.match(discovery, /export const creators = \[\]/);
  assert.match(banner, /!loaded \|\| !allowed/);
  assert.match(consent, /AdsConsent\.gatherConsent/);
  assert.match(consent, /canRequestAds/);
  assert.match(appConfig, /delayAppMeasurementInit:\s*true/);
  assert.match(privacy, /Advertising choice/);
  assert.match(appConfig, /Ad-enabled production builds require genuine IDs/);
  assert.match(appConfig, /ca-app-pub-3940256099942544~3347511713/);
  assert.match(appConfig, /\n\s*googleMobileAdsPlugin,\n/);
  assert.match(appConfig, /Google Maps cannot be enabled without GOOGLE_MAPS_API_KEY/);
});

test('native release identity and server-side payment pause are enforced', async () => {
  const [app, env, eas, navigator, checkout] = await Promise.all([
    read('app.base.json'),
    read('.env.example'),
    read('eas.json'),
    read('src/navigation/RootNavigator.js'),
    read('supabase/functions/create-checkout-session/index.ts'),
  ]);
  assert.match(app, /com\.chodhiq\.app/);
  assert.match(app, /android\.permission\.RECORD_AUDIO/);
  assert.match(env, /EXPO_IOS_BUNDLE_ID=com\.chodhiq\.app/);
  assert.match(env, /EXPO_ANDROID_PACKAGE=com\.chodhiq\.app/);
  assert.match(eas, /"production"/);
  assert.doesNotMatch(navigator, /DashboardScreens/);
  assert.match(checkout, /ENABLE_PAYMENTS/);
  assert.match(checkout, /Payments are currently unavailable/);
});

test('password recovery returns securely to the app and preview builds gate unfinished features', async () => {
  const [auth, account, navigator, eas, appConfig] = await Promise.all([
    read('src/lib/supabase.js'),
    read('src/screens/AccountScreens.js'),
    read('src/navigation/RootNavigator.js'),
    read('eas.json'),
    read('app.config.js'),
  ]);
  assert.match(auth, /resetPasswordForEmail/);
  assert.match(auth, /exchangeCodeForSession/);
  assert.match(auth, /updateUser\(\{ password \}\)/);
  assert.match(account, /Forgot password\?/);
  assert.match(account, /Choose a new password/);
  assert.match(navigator, /ResetPassword: 'auth\/reset'/);
  assert.match(eas, /"preview"[\s\S]*"EXPO_PUBLIC_ENABLE_PAYMENTS": "false"/);
  assert.match(eas, /"preview"[\s\S]*"EXPO_PUBLIC_ENABLE_GOOGLE_ADS": "false"/);
  assert.match(appConfig, /EAS_BUILD_PROFILE === 'production'/);
});

test('custom advertising loads only approved in-window inventory and records delivery', async () => {
  const [migration, repository, home] = await Promise.all([
    read('supabase/migrations/20260825140000_custom_ad_campaigns.sql'),
    read('src/data/adCampaignRepository.js'),
    read('src/screens/HomeScreen.js'),
  ]);
  for (const table of [
    'ad_campaign_enquiries',
    'ad_campaigns',
    'ad_campaign_events',
    'ad_campaign_invoices',
  ])
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
  assert.match(migration, /now\(\) between c\.starts_at and c\.ends_at/);
  assert.match(migration, /ad_campaign_performance/);
  assert.match(repository, /list_active_ad_campaigns/);
  assert.match(repository, /record_ad_campaign_event/);
  assert.match(home, /recordCampaignEvent\(campaign\.id, 'impression'\)/);
  assert.match(home, /recordCampaignEvent\(campaign\.id, 'click'\)/);
});

test('provider detail includes guarded review, quote, and booking workflows', async () => {
  const source = await read('src/screens/ProviderDetailScreen.js');
  assert.match(source, /Leave a review/);
  assert.match(source, /reviewBusy/);
  assert.match(source, /Request a Quote/);
  assert.match(source, /Request a booking/);
  assert.match(source, /bookingBusy/);
  assert.match(source, /navigation\.navigate\('Welcome'\)/);
});

test('account surfaces display provider responses and booking states', async () => {
  const source = await read('src/screens/AccountScreens.js');
  assert.match(source, /BUSINESS RESPONSE/);
  assert.match(source, /My bookings/);
  assert.match(source, /Cancel booking/);
  assert.match(source, /No bookings yet/);
});

test('repositories validate customer writes before Supabase mutations', async () => {
  const [reviews, bookings, accounts] = await Promise.all([
    read('src/data/reviewRepository.js'),
    read('src/data/bookingRepository.js'),
    read('src/data/accountRepository.js'),
  ]);
  assert.match(reviews, /rating < 1 \|\| rating > 5/);
  assert.match(reviews, /comment\.length > 500/);
  assert.match(bookings, /Choose a future date and time/);
  assert.match(bookings, /notes\.length > 1000/);
  assert.match(accounts, /response_message/);
});

test('placeholder photography is rejected from public UI', async () => {
  const [catalog, details] = await Promise.all([
    read('src/data/assetCatalog.js'),
    read('src/components/ProviderDetailComponents.js'),
  ]);
  assert.match(catalog, /picsum\\\.photos/);
  assert.match(details, /No verified business photos have been added yet/);
});

test('production startup cannot seed bundled prototype listings', async () => {
  const [marketplaceState, nativeStore, webStore, repository, config] = await Promise.all([
    read('src/features/marketplace/useMarketplaceState.js'),
    read('src/data/localDatabase.native.js'),
    read('src/data/localDatabase.web.js'),
    read('src/data/providerRepository.js'),
    read('app.config.js'),
  ]);
  assert.match(marketplaceState, /DEMO_MODE \? mockCategories : \[\]/);
  assert.match(marketplaceState, /DEMO_MODE \? mockProviders : \[\]/);
  assert.match(nativeStore, /DEMO_MODE \? seedProviders : \[\]/);
  assert.match(webStore, /DEMO_MODE \? providers : \[\]/);
  assert.match(repository, /DEMO_MODE \? bundledProviders : \[\]/);
  assert.match(config, /Production builds cannot enable EXPO_PUBLIC_DEMO_MODE/);
});

test('imported claims defer ownership until admin approval', async () => {
  const migration = await read(
    'supabase/migrations/20260817120000_secure_claims_bookings_and_push_consent.sql',
  );
  const claimBody = migration.slice(
    migration.indexOf('create function public.claim_imported_provider'),
    migration.indexOf('create or replace function public.list_claimable_providers'),
  );
  assert.doesNotMatch(claimBody, /update public\.providers set owner_id/);
  assert.match(claimBody, /insert into public\.verification_requests/);
  assert.match(migration, /new\.status = 'approved'/);
  assert.match(migration, /owner_id = new\.submitted_by/);
});

test('booking cancellation cannot overwrite provider-owned fields', async () => {
  const migration = await read(
    'supabase/migrations/20260817120000_secure_claims_bookings_and_push_consent.sql',
  );
  assert.match(migration, /protect_booking_actor_fields/);
  assert.match(migration, /new\.provider_message is distinct from old\.provider_message/);
  assert.match(migration, /new\.responded_at is distinct from old\.responded_at/);
  assert.match(migration, /Customers may only cancel their own booking/);
});

test('push opt-out is persisted and clears the registered token', async () => {
  const preferences = await read('src/hooks/useCommunicationPreferences.js');
  assert.match(preferences, /PREFERENCES_KEY/);
  assert.match(preferences, /AsyncStorage\.setItem\(PREFERENCES_KEY/);
  assert.match(preferences, /preferences\.push \? registerPushToken : clearPushToken/);
  assert.match(preferences, /if \(!ready \|\| !userId\)/);
});

test('push delivery authenticates webhooks and reloads canonical content', async () => {
  const source = await read('supabase/functions/push-notification/index.ts');
  assert.match(source, /PUSH_WEBHOOK_SECRET/);
  assert.match(source, /x-webhook-secret/);
  assert.match(source, /from\("notifications"\)/);
  assert.match(source, /title: notification\.title/);
});

test('claims expire and booking services must belong to their provider', async () => {
  const migration = await read(
    'supabase/migrations/20260817120000_secure_claims_bookings_and_push_consent.sql',
  );
  assert.match(migration, /interval '24 hours'/);
  assert.match(migration, /validate_booking_service_provider/);
  assert.match(migration, /provider_id = new\.provider_id/);
});

test('Stripe lifecycle revokes benefits for inactive and failed subscriptions', async () => {
  const webhook = await read('supabase/functions/stripe-webhook/index.ts');
  assert.match(webhook, /customer\.subscription\.updated/);
  assert.match(webhook, /invoice\.payment_failed/);
  assert.match(webhook, /offers_active: false/);
});

test('booking cancellation rejects stale updates', async () => {
  const repository = await read('src/data/bookingRepository.js');
  assert.match(repository, /select\(\s*'id,status'\s*\)\s*\.maybeSingle\(\)/);
  assert.match(repository, /can no longer be cancelled/);
});
