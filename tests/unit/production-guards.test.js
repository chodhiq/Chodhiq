import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { validPublicLegalUrl } from '../../src/config/legal.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

function resolveBuildConfig(profile, overrides = {}) {
  const module = { exports: {} };
  runInNewContext(read('app.config.js'), {
    module,
    require: (name) =>
      name === './scripts/android-push-config.cjs'
        ? {
            androidPushConfigPath: () =>
              overrides.TEST_NO_PUSH_CONFIG ? null : 'synthetic/google-services.json',
          }
        : JSON.parse(read('app.base.json')),
    URL,
    process: {
      env: {
        EAS_BUILD: 'true',
        EAS_BUILD_PROFILE: profile,
        EXPO_PUBLIC_SUPABASE_URL: 'https://gfjhvsajwjrrlylgrkhf.supabase.co',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: 'public-key-fixture',
        EXPO_PUBLIC_EAS_PROJECT_ID: 'project-fixture',
        EXPO_PUBLIC_RELEASE_COMMIT: 'commit-fixture',
        ...overrides,
      },
    },
  });
  return module.exports;
}

test('direct-install beta can build without pretending legal drafts are published', () => {
  const config = resolveBuildConfig('beta-apk');
  assert.equal(config.android.package, 'com.chodhiq.app');
  for (const profile of ['beta', 'production', 'production-apk']) {
    assert.throws(() => resolveBuildConfig(profile), /EXPO_PUBLIC_TERMS_URL/);
  }
});

test('internal beta still rejects missing backend, the wrong backend, and demo mode', () => {
  assert.throws(
    () => resolveBuildConfig('beta-apk', { EXPO_PUBLIC_SUPABASE_ANON_KEY: '' }),
    /EXPO_PUBLIC_SUPABASE_ANON_KEY/,
  );
  assert.throws(
    () => resolveBuildConfig('beta-apk', { EXPO_PUBLIC_SUPABASE_URL: 'https://wrong.supabase.co' }),
    /ChodhiQ Production Supabase/,
  );
  assert.throws(
    () => resolveBuildConfig('beta-apk', { EXPO_PUBLIC_DEMO_MODE: 'true' }),
    /cannot enable EXPO_PUBLIC_DEMO_MODE/,
  );
});

test('internal beta refuses to ship without configured Android push', () => {
  assert.throws(
    () => resolveBuildConfig('beta-apk', { TEST_NO_PUSH_CONFIG: true }),
    /push setup is incomplete/,
  );
});

test('Android source-map upload skips cleanly when Sentry credentials are incomplete', () => {
  const gradle = read('android/app/build.gradle');
  assert.match(gradle, /sentryAuthToken && sentryOrg && sentryProject/);
  assert.match(gradle, /tasks\.configureEach[\s\S]*?_SentryUpload_[\s\S]*?onlyIf/);
  assert.match(gradle, /_SentryCollectModules_/);
  assert.match(
    gradle,
    /sentryNativeUploadEnabled = sentryUploadEnabled[\s\S]*SENTRY_DISABLE_NATIVE_DEBUG_UPLOAD/,
  );
  assert.match(gradle, /Sentry source-map upload skipped/);
});

test('production app config omits Sentry when source-map upload credentials are incomplete', () => {
  const config = resolveBuildConfig('production', {
    EXPO_PUBLIC_TERMS_URL: 'https://chodhiq.app/terms',
    EXPO_PUBLIC_PRIVACY_URL: 'https://chodhiq.app/privacy',
    EXPO_PUBLIC_DELETE_ACCOUNT_URL: 'https://chodhiq.app/delete-account',
    EXPO_PUBLIC_SENTRY_DSN: 'https://public@example.ingest.sentry.io/123',
  });
  assert.equal(
    config.plugins.some((plugin) =>
      Array.isArray(plugin)
        ? plugin[0] === '@sentry/react-native'
        : plugin === '@sentry/react-native',
    ),
    false,
  );
  assert.equal(JSON.parse(read('eas.json')).build.preview.environment, 'preview');
});

test('legal links only accept public credential-free HTTPS destinations', () => {
  assert.equal(validPublicLegalUrl('https://chodhiq.app/privacy'), true);
  for (const value of [
    '',
    'http://chodhiq.app/privacy',
    'https://user:pass@chodhiq.app/privacy',
    'https://example.com/privacy',
    'https://policy.test/privacy',
  ]) {
    assert.equal(validPublicLegalUrl(value), false, value);
  }
});

test('demo mode is opt-in and dashboards are isolated from the customer app', () => {
  const runtime = read('src/config/runtime.js');
  const navigator = read('src/navigation/RootNavigator.js');
  const businessDashboard = read('business-dashboard/lib/use-business-dashboard.ts');
  const adminDashboard = read('admin-dashboard/lib/admin.tsx');
  assert.match(runtime, /readBooleanFlag\(process\.env\.EXPO_PUBLIC_DEMO_MODE, false\)/);
  assert.doesNotMatch(navigator, /DashboardScreens|BusinessDashboard|AdminDashboard/);
  assert.match(businessDashboard, /from\('providers'\)/);
  assert.match(businessDashboard, /\.eq\('owner_id', uid\)/);
  assert.match(adminDashboard, /app_metadata\?\.role !== 'admin'/);
  assert.match(adminDashboard, /isAdmin: session\?\.user\.app_metadata\?\.role === 'admin'/);
});

test('provider posts are restricted to businesses owned by the active user', () => {
  const marketplace = read('src/screens/MarketplaceScreens.js');
  assert.match(marketplace, /access\.ownedProviders/);
  assert.match(marketplace, /ownedIds\.has\(String\(providerId\)\)/);
  assert.doesNotMatch(marketplace, /providers\.slice\(0,\s*12\)/);
});

test('community post input is bounded and normalized before persistence', () => {
  const marketplace = read('src/screens/MarketplaceScreens.js');
  assert.match(marketplace, /cleanText\(title[^]*max: 120/);
  assert.match(marketplace, /cleanText\(body[^]*max: 2000/);
  assert.match(marketplace, /maxLength=\{120\}/);
  assert.match(marketplace, /maxLength=\{2000\}/);
});

test('active admin verification and report mutations use audited RPCs', () => {
  const verification = read('admin-dashboard/app/verification/page.tsx');
  const reports = read('admin-dashboard/app/components/report-queue.tsx');
  assert.match(verification, /rpc\("admin_decide_verification"/);
  assert.match(verification, /server_audited: true/);
  assert.match(reports, /admin_resolve_report/);
  assert.doesNotMatch(verification, /service.role|SERVICE_ROLE|admin_audit_log.*insert/i);
});

test('CI verifies tests, production export, and high-severity dependency audit', () => {
  const workflow = read('.github/workflows/quality.yml');
  assert.match(workflow, /npm test/);
  assert.match(workflow, /expo export --platform web/);
  assert.match(workflow, /npm audit --omit=dev --audit-level=high/);
});

test('admin operations use dedicated RPCs and produce audit records', () => {
  const migration = read('supabase/migrations/20260819120000_admin_audit_and_user_controls.sql');
  assert.match(migration, /admin_broadcast_notification/);
  assert.match(migration, /admin_set_user_moderation/);
  assert.match(migration, /insert into public\.admin_audit_log/);
  assert.match(migration, /Administrators cannot suspend their own account/);
});

test('admin operations require confirmations, decision notes, and audited report moderation', () => {
  const applications = read('admin-dashboard/app/applications/page.tsx');
  const reviews = read('admin-dashboard/app/components/operations-pages.tsx');
  const reports = read('admin-dashboard/app/components/report-queue.tsx');
  const members = read('admin-dashboard/app/components/enhanced-list-pages.tsx');
  const migration = read('supabase/migrations/20260820100000_admin_operations_upgrade.sql');
  assert.match(reviews, /confirmAction/);
  assert.match(applications, /Review note \(visible to applicant\)/);
  assert.match(members, /Search users/);
  assert.match(reports, /admin_resolve_report/);
  assert.match(reports, /admin_transition_community_post/);
  assert.match(migration, /security definer/);
  assert.match(migration, /insert into public\.admin_audit_log/);
  assert.match(migration, /create index if not exists/);
});

test('business dashboard only loads the authenticated owners provider', () => {
  const dashboard = read('business-dashboard/lib/use-business-dashboard.ts');
  assert.match(dashboard, /const uid = session\.user\.id/);
  assert.match(dashboard, /\.eq\('owner_id', uid\)/);
  assert.match(dashboard, /\.maybeSingle\(\)/);
});

test('business dashboard loads provider-scoped services, reviews, analytics, and leads', () => {
  const dashboard = read('business-dashboard/lib/use-business-dashboard.ts');
  for (const table of ['services', 'reviews', 'provider_analytics_events', 'quote_requests']) {
    assert.match(dashboard, new RegExp(`from\\('${table}'\\)[^]*eq\\('provider_id'`));
  }
  assert.match(dashboard, /provider_entitlements/);
});

test('business mutations are provider-scoped and consequential actions require confirmation', () => {
  const dashboard = read('business-dashboard/app/page.tsx');
  const hook = read('business-dashboard/lib/use-business-dashboard.ts');
  assert.match(hook, /eq\('provider_id', nextProvider\.id\)/);
  assert.match(dashboard, /window\.confirm/);
  assert.match(dashboard, /provider\.id/);
});

test('offline failures remain visible and do not stop later queued operations', () => {
  const sync = read('src/data/syncRepository.js');
  const context = read('src/context/AppStateContext.js');
  assert.doesNotMatch(sync, /if \(result\.error\) break/);
  assert.match(sync, /prepareQueuedPayload/);
  assert.match(context, /syncStatus/);
});
