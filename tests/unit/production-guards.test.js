import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('demo mode is opt-in and production dashboards use repository-backed data', () => {
  const runtime = read('src/config/runtime.js');
  const dashboard = read('src/screens/DashboardScreens.js');
  assert.match(runtime, /readBooleanFlag\(process\.env\.EXPO_PUBLIC_DEMO_MODE, false\)/);
  assert.match(dashboard, /loadBusinessDashboard/);
  assert.match(dashboard, /loadAdminDashboard/);
  assert.doesNotMatch(dashboard, /demoApplications|demoReports|demo-lead|Demo presentation/);
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

test('dashboard mutations use RLS-backed tables and the audited verification RPC', () => {
  const repository = read('src/data/dashboardRepository.js');
  assert.match(repository, /from\('provider_analytics_events'\)/);
  assert.match(repository, /from\('quote_requests'\)/);
  assert.match(repository, /rpc\('admin_decide_verification'/);
  assert.match(repository, /from\('community_post_reports'\)\.update/);
  assert.doesNotMatch(repository, /service.role|SERVICE_ROLE|admin_audit_log.*insert/i);
});

test('CI verifies tests, production export, and high-severity dependency audit', () => {
  const workflow = read('.github/workflows/quality.yml');
  assert.match(workflow, /npm test/);
  assert.match(workflow, /expo export --platform web/);
  assert.match(workflow, /npm audit --omit=dev --audit-level=high/);
});

test('admin operations use dedicated RPCs and produce audit records', () => {
  const repository = read('src/data/dashboardRepository.js');
  const migration = read('supabase/migrations/20260819120000_admin_audit_and_user_controls.sql');
  assert.match(repository, /admin_broadcast_notification/);
  assert.match(repository, /admin_set_user_moderation/);
  assert.match(migration, /insert into public\.admin_audit_log/);
  assert.match(migration, /Administrators cannot suspend their own account/);
});

test('admin operations require confirmations, decision notes, searchable members, and atomic report moderation', () => {
  const dashboard = read('src/screens/DashboardScreens.js');
  const repository = read('src/data/dashboardRepository.js');
  const migration = read('supabase/migrations/20260820100000_admin_operations_upgrade.sql');
  assert.match(dashboard, /Alert\.alert\('Remove this review\?'/);
  assert.match(dashboard, /Required decision note/);
  assert.match(dashboard, /Search member name or email/);
  assert.match(repository, /admin_search_members/);
  assert.match(repository, /admin_moderate_community_report/);
  assert.match(migration, /security definer/);
  assert.match(migration, /insert into public\.admin_audit_log/);
  assert.match(migration, /create index if not exists/);
});

test('business dashboard supports switching every owned provider', () => {
  const dashboard = read('src/screens/DashboardScreens.js');
  assert.match(dashboard, /setOwnedId/);
  assert.match(dashboard, /ownedProviders\.map/);
  assert.match(dashboard, /loadBusinessDashboard\(ownedId\)/);
  assert.match(dashboard, /accessibilityState=\{\{ selected \}\}/);
});

test('business dashboard provides owner operations instead of placeholder navigation', () => {
  const dashboard = read('src/screens/DashboardScreens.js');
  const repository = read('src/data/dashboardRepository.js');
  const migration = read('supabase/migrations/20260820110000_business_dashboard_operations.sql');
  assert.match(dashboard, /BusinessSectionTabs/);
  assert.match(dashboard, /BusinessLeadCard/);
  assert.match(dashboard, /BusinessBookingCard/);
  assert.match(dashboard, /ListingEditor/);
  assert.match(dashboard, /Payment history/);
  assert.doesNotMatch(
    dashboard,
    /label="Edit listing" onPress=\{\(\) => navigation\.navigate\('BecomeProvider'\)/,
  );
  assert.match(repository, /updateBusinessLead/);
  assert.match(repository, /updateBusinessBooking/);
  assert.match(repository, /updateBusinessListing/);
  assert.match(repository, /from\('payment_records'\)/);
  assert.match(migration, /quote_requests_provider_status_created_idx/);
  assert.match(migration, /bookings_provider_status_date_idx/);
});

test('business mutations are provider-scoped and consequential actions require confirmation', () => {
  const dashboard = read('src/screens/DashboardScreens.js');
  const repository = read('src/data/dashboardRepository.js');
  assert.match(repository, /eq\('provider_id',providerId\)/);
  assert.match(repository, /Unsupported lead status/);
  assert.match(repository, /Unsupported booking status/);
  assert.match(dashboard, /Publish listing changes\?/);
  assert.match(dashboard, /this enquiry\?/);
  assert.match(dashboard, /The customer will see this booking update/);
});

test('offline failures remain visible and do not stop later queued operations', () => {
  const sync = read('src/data/syncRepository.js');
  const context = read('src/context/AppStateContext.js');
  assert.doesNotMatch(sync, /if \(result\.error\) break/);
  assert.match(sync, /nextFailureState/);
  assert.match(context, /syncStatus/);
});
