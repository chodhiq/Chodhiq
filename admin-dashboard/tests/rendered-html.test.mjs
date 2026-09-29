import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

async function render(path = '/') {
  const workerUrl = new URL('../dist/server/index.js', import.meta.url);
  workerUrl.searchParams.set('test', `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: 'text/html' } }),
    { ASSETS: { fetch: async () => new Response('Not found', { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

const routes = [
  '/',
  '/applications',
  '/providers',
  '/verification',
  '/community',
  '/campaigns',
  '/subscriptions',
  '/payments',
  '/users',
  '/audit',
  '/reports/providers',
  '/reports/community',
  '/reviews',
  '/activity',
  '/categories',
  '/demand',
  '/admins',
  '/analytics',
  '/notifications',
  '/moderation/providers',
  '/moderation/community',
];
test('server renders every routed admin page', async () => {
  for (const path of routes) {
    const response = await render(path);
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get('content-type') ?? '', /^text\/html\b/i);
  }
});

test('paused launch gates commercial navigation and direct routes', async () => {
  const [shell, payments, subscriptions] = await Promise.all([
    readFile(new URL('../app/components/admin-shell.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/payments/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/subscriptions/page.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(shell, /NEXT_PUBLIC_ENABLE_MONETISATION/);
  assert.match(payments, /Payments paused/);
  assert.match(subscriptions, /Subscriptions paused/);
});

test('admin sign-in uses the approved artwork and responsive dashboard breakpoints', async () => {
  const [shell, responsive] = await Promise.all([
    readFile(new URL('../app/components/admin-shell.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/responsive.css', import.meta.url), 'utf8'),
  ]);
  assert.match(shell, /src="\/admin-login-side\.png"/);
  assert.match(shell, /Authorized access/);
  assert.match(shell, /Access is restricted to authorized/);
  assert.match(responsive, /min-width:\s*821px[\s\S]*max-width:\s*1100px/);
  assert.match(responsive, /max-width:\s*820px/);
  assert.match(responsive, /max-width:\s*520px/);
});

test('campaign operations expose approval, pause and performance reporting', async () => {
  const source = await readFile(new URL('../app/campaigns/page.tsx', import.meta.url), 'utf8');
  assert.match(source, /ad_campaign_enquiries/);
  assert.match(source, /ad_campaign_performance/);
  assert.match(source, /transition\(row, "approved"\)/);
  assert.match(source, /transition\(row, "paused"\)/);
});

test('ships all route entrypoints including provider detail', async () => {
  for (const path of [
    ...routes.slice(1).map((route) => `app${route}/page.tsx`),
    'app/providers/[id]/page.tsx',
  ])
    await access(new URL(`../${path}`, import.meta.url));
});

test('preserves role gate, shared session context and audited mutations', async () => {
  const [admin, shell] = await Promise.all([
    readFile(new URL('../lib/admin.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/components/admin-shell.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(admin, /app_metadata\?\.role\s*===\s*['"]admin['"]/);
  assert.match(admin, /AdminAuthContext\.Provider/);
  assert.match(admin, /AdminActionsContext\.Provider/);
  assert.match(admin, /admin_audit_log/);
  assert.match(admin, /source:\s*['"]admin_dashboard['"]/);
  assert.match(shell, /Administrator role required/);
});

test('routes implement requested operations', async () => {
  const [ops, lists, gov, provider, reports, verification] = await Promise.all(
    [
      'operations-pages.tsx',
      'enhanced-list-pages.tsx',
      'governance-pages.tsx',
      '../providers/[id]/page.tsx',
      'report-queue.tsx',
      '../verification/page.tsx',
    ].map((path) => readFile(new URL(`../app/components/${path}`, import.meta.url), 'utf8')),
  );
  assert.match(ops, /review_replies/);
  assert.match(lists, /sponsored_rank/);
  assert.match(ops, /categories/);
  assert.match(ops, /quote_requests/);
  assert.match(ops, /bookings/);
  assert.match(gov, /admin-role-control/);
  assert.match(gov, /provider_analytics_events/);
  assert.match(gov, /subscription_requests/);
  assert.match(provider, /verification_requests/);
  assert.match(provider, /provider_entitlements/);
  assert.match(reports, /reporter_id/);
  assert.match(verification, /admin_decide_verification/);
});

test('phase two routes query real marketplace tables', async () => {
  const source = await readFile(
    new URL('../app/components/phase2-pages.tsx', import.meta.url),
    'utf8',
  );
  for (const table of [
    'community_posts',
    'quote_requests',
    'bookings',
    'provider_entitlements',
    'subscription_requests',
  ])
    assert.match(source, new RegExp(`from\\(["']${table}["']\\)`));
  assert.match(source, /community_post_\$\{status\}/);
  assert.match(source, /count:\s*["']exact["']/);
});

test('routed operations have one implementation and deterministic hydration markup', async () => {
  const [theme, shell, lists, operations, governance, phaseTwo] = await Promise.all([
    readFile(new URL('../app/theme-controls.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/components/admin-shell.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/components/enhanced-list-pages.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/components/operations-pages.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/components/governance-pages.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/components/phase2-pages.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(theme, /type Theme = "light" \| "dark"/);
  assert.match(theme, /useState<Theme>\(savedTheme\)/);
  assert.match(theme, /role="switch"/);
  assert.doesNotMatch(theme, /"system"|Matte|Midnight|Warm/);
  assert.match(shell, /timeZone:\s*['"]Europe\/London['"]/);
  assert.match(shell, /today \|\| `\$\{brand\.name\} administration`/);
  assert.doesNotMatch(shell, /\{new Date\(\)\.toLocaleDateString/);
  assert.match(lists, /ProvidersOperationsPage/);
  assert.match(lists, /UsersOperationsPage/);
  assert.match(lists, /PaymentsOperationsPage/);
  assert.doesNotMatch(operations, /function ProvidersPage/);
  assert.doesNotMatch(governance, /function UsersPage/);
  assert.doesNotMatch(phaseTwo, /function PaymentsPage/);
});

test('password recovery survives auth event timing', async () => {
  const shell = await readFile(
    new URL('../app/components/admin-shell.tsx', import.meta.url),
    'utf8',
  );
  const client = await readFile(new URL('../lib/supabase.ts', import.meta.url), 'utf8');
  assert.match(shell, /window\.location\.hash\.includes\(['"]type=recovery['"]\)/);
  assert.match(shell, /event === ['"]PASSWORD_RECOVERY['"]/);
  assert.match(shell, /resetPasswordForEmail/);
  assert.match(shell, /updateUser\(\{ password \}\)/);
  assert.match(shell, /supabase\.auth\.setSession/);
  assert.match(shell, /access_token/);
  assert.match(shell, /refresh_token/);
  assert.match(client, /detectSessionInUrl:\s*false/);
});

test('source and rendered routes contain no common mojibake sequences', async () => {
  const sourceFiles = [
    '../app/layout.tsx',
    '../app/components/admin-shell.tsx',
    '../app/components/enhanced-list-pages.tsx',
    '../app/components/operations-pages.tsx',
    '../app/components/governance-pages.tsx',
    '../app/components/phase2-pages.tsx',
  ];
  for (const file of sourceFiles)
    assert.doesNotMatch(await readFile(new URL(file, import.meta.url), 'utf8'), /â|Â|Ã/);
  for (const path of routes) assert.doesNotMatch(await (await render(path)).text(), /â|Â|Ã/);
});

test('growing lists use exact counts and server ranges', async () => {
  const files = await Promise.all(
    [
      'operations-pages.tsx',
      'enhanced-list-pages.tsx',
      'governance-pages.tsx',
      'report-queue.tsx',
    ].map((path) => readFile(new URL(`../app/components/${path}`, import.meta.url), 'utf8')),
  );
  const source = files.join('\n');
  assert.ok((source.match(/count:\s*["']exact["']/g) || []).length >= 6);
  assert.ok((source.match(/\.range\(/g) || []).length >= 8);
  assert.doesNotMatch(source, /\.limit\((50|100)\)/);
});

test('phase one regressions stay fixed', async () => {
  const [css, admin, shell, operations] = await Promise.all([
    readFile(new URL('../app/globals.css', import.meta.url), 'utf8'),
    readFile(new URL('../lib/admin.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/components/admin-shell.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/components/operations-pages.tsx', import.meta.url), 'utf8'),
  ]);
  assert.equal((css.match(/:root\s*\{/g) || []).length, 1);
  assert.doesNotMatch(css, /Reference dashboard visual system|nth-child\(n\+6\)/);
  assert.match(admin, /ToastType\s*=\s*['"]success['"]\s*\|\s*['"]error['"]/);
  assert.match(shell, /toast\.type === ['"]error['"]/);
  assert.doesNotMatch([shell, operations].join('\n'), /window\.confirm|\bconfirm\(/);
});

test('production workflows expose search, confirmations, exports, bulk actions and realtime', async () => {
  const [shell, lists, reports, verification] = await Promise.all([
    readFile(new URL('../app/components/admin-shell.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/components/enhanced-list-pages.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/components/report-queue.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/verification/page.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(shell, /providers.*profiles.*community_posts/s);
  assert.match(shell, /role="alertdialog"/);
  assert.match(lists, /exportCsv\(datedFilename\("(providers|users|payments)-current-page"/);
  assert.match(lists, /Suspend selected/);
  assert.match(reports, /Dismiss selected/);
  assert.match(reports, /postgres_changes/);
  assert.match(verification, /postgres_changes/);
});

test('community moderation uses live, validated, audited admin controls', async () => {
  const [page, sql] = await Promise.all([
    readFile(new URL('../app/components/phase2-pages.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../db/admin_routed_operations.sql', import.meta.url), 'utf8'),
  ]);
  assert.match(page, /postgres_changes/);
  assert.match(page, /admin_transition_community_post/);
  assert.match(page, /note\.length < 8/);
  assert.match(page, /confirmAction/);
  assert.match(sql, /Admins read all community posts/);
  assert.match(sql, /public\.is_admin\(\)/);
  assert.match(sql, /admin_audit_log/);
});
