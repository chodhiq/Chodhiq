const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

const client = read('src/lib/supabase.js');
const context = read('src/context/AppStateContext.js');
const dashboard = read('src/screens/DashboardScreens.js');
const migration = read('db/20260812_security_hardening.sql');
const checkout = read('supabase/functions/create-checkout-session/index.ts');
const webhook = read('supabase/functions/stripe-webhook/index.ts');
const subscriptionClient = read('src/data/subscriptionRepository.js');
const pushFunction = read('supabase/functions/push-notification/index.ts');
const leadFunction = read('supabase/functions/deliver-provider-leads/index.ts');
const moderationFunction = read('supabase/functions/admin-user-control/index.ts');
const securityRemediation = read('supabase/migrations/20260901130000_security_remediation.sql');
const providerWorker = read('business-dashboard/worker/index.ts');
const secureWorkflowMigration = read(
  'supabase/migrations/20260817120000_secure_claims_bookings_and_push_consent.sql',
);

assert(
  !/SERVICE_ROLE|STRIPE_SECRET|DATABASE_URL/.test(client),
  'Frontend Supabase client references a server secret.',
);
assert(
  !client.includes('signInAnonymously'),
  'Guest flow creates an authenticated anonymous Supabase user.',
);
assert(
  context.includes('[signedIn, setSignedIn] = useState(false)'),
  'App defaults to an authenticated-looking state.',
);
assert(
  dashboard.includes('access.isAdmin') && dashboard.includes('access.ownedProviders'),
  'Dashboard role gates are missing.',
);
assert(
  migration.includes('protect_provider_security_fields'),
  'Protected provider fields lack database enforcement.',
);
assert(migration.includes('stripe_webhook_events'), 'Stripe webhook idempotency table is missing.');
assert(
  !checkout.includes('"Access-Control-Allow-Origin": "*"'),
  'Checkout function permits every web origin.',
);
assert(checkout.includes('safeReturnUrl'), 'Checkout redirect URL allowlist is missing.');
assert(
  checkout.includes('isLoopback') && checkout.includes('allowedOrigins.has(url.origin)'),
  'Local HTTP redirects are not constrained to allowlisted loopback origins.',
);
assert(
  webhook.includes('constructEventAsync') && webhook.includes('stripe_webhook_events'),
  'Webhook signature or replay protection is missing.',
);
assert(
  subscriptionClient.includes("functions.invoke('create-checkout-session'") &&
    subscriptionClient.includes('chodhiq://subscription'),
  'Mobile subscription checkout is not wired to the authenticated Edge Function.',
);
assert(
  webhook.includes('provider_entitlements') &&
    webhook.includes('subscription_requests') &&
    webhook.includes('payment_records'),
  'Successful Stripe checkout does not activate entitlements and record payment state.',
);
assert(
  pushFunction.includes('PUSH_WEBHOOK_SECRET') && pushFunction.includes('.from("notifications")'),
  'Push webhook does not authenticate and reload the canonical notification.',
);
assert(
  secureWorkflowMigration.includes('validate_booking_service_provider') &&
    secureWorkflowMigration.includes('protect_booking_actor_fields'),
  'Booking database invariants are missing.',
);
assert(
  webhook.includes('customer.subscription.updated') && webhook.includes('invoice.payment_failed'),
  'Stripe lifecycle handling does not revoke benefits after payment or status failures.',
);
assert(leadFunction.includes('checkRateLimit'), 'Lead delivery lacks persistent rate limiting.');
assert(
  moderationFunction.includes('record_user_moderation_change') &&
    !moderationFunction.includes('Account changed but audit recording failed'),
  'Moderation state and audit are not committed atomically.',
);
assert(
  securityRemediation.includes('drop policy if exists "Clients record MVP events"') &&
    securityRemediation.includes('revoke insert on public.mvp_events'),
  'Anonymous analytics ingestion can bypass the Edge Function.',
);
assert(
  providerWorker.includes('Content-Security-Policy') && !providerWorker.includes("'unsafe-eval'"),
  'Provider worker does not enforce the hardened CSP.',
);

if (failures.length) {
  console.error(failures.map((item) => `FAIL: ${item}`).join('\n'));
  process.exit(1);
}
console.log('Security invariants passed.');
