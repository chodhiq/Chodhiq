import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

registerHooks({
  resolve(specifier, context, nextResolve) {
    return specifier === 'cloudflare:workers'
      ? { url: specifier, shortCircuit: true }
      : nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    return url === 'cloudflare:workers'
      ? { format: 'module', source: 'export const tracing = undefined;', shortCircuit: true }
      : nextLoad(url, context);
  },
});

async function render() {
  const workerUrl = new URL('../dist/server/index.js', import.meta.url);
  workerUrl.searchParams.set('test', `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request('http://localhost/', { headers: { accept: 'text/html' } }),
    {
      ASSETS: { fetch: async () => new Response('Not found', { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test('server-renders the ChodhiQ business shell', async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>ChodhiQ Business/);
  assert.match(html, /data-theme="light"/);
  assert.match(html, /role="switch"/);
  assert.match(html, /Use dark appearance/);
  assert.match(html, />Light</);
  assert.match(html, /Securing your workspace/);
});

test('unapproved public legal routes remain unavailable', async () => {
  const { default: worker } = await import('../dist/server/index.js');
  const environment = { ASSETS: { fetch: async () => new Response('Not found', { status: 404 }) } };
  const context = { waitUntil() {}, passThroughOnException() {} };
  for (const path of [
    '/terms',
    '/privacy',
    '/delete-account',
    '/moderation-policy',
    '/retention-policy',
  ]) {
    const response = await worker.fetch(
      new Request(`https://example.com${path}`, { headers: { accept: 'text/html' } }),
      environment,
      context,
    );
    assert.equal(response.status, 404, `${path} must stay unpublished`);
  }
});

test('business sign-in shares the dashboard tablet and mobile breakpoints', async () => {
  const responsive = await readFile(new URL('../app/responsive.css', import.meta.url), 'utf8');
  assert.match(responsive, /min-width:\s*821px[\s\S]*max-width:\s*1100px/);
  assert.match(responsive, /max-width:\s*820px/);
  assert.match(responsive, /max-width:\s*520px/);
});

test('paused launch hides subscription checkout surfaces', async () => {
  const source = await readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');
  assert.match(source, /NEXT_PUBLIC_ENABLE_PAYMENTS/);
  assert.match(source, /paymentsEnabled\s*&&\s*\(\s*<div className=['"]side-card['"]>/);
  assert.match(source, /disabled=\{!paymentsEnabled/);
});

test('Sites packaging is serialized to avoid concurrent drizzle copies', async () => {
  const plugin = await readFile(new URL('../build/sites-vite-plugin.ts', import.meta.url), 'utf8');
  assert.match(plugin, /packagingQueue/);
  assert.match(plugin, /packagingQueue\.then\(packageOutput, packageOutput\)/);
});

test('providers can submit campaign enquiries without buying subscriptions', async () => {
  const source = await readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');
  assert.match(source, /ad_campaign_enquiries/);
  assert.match(source, /Submit campaign enquiry/);
  assert.match(source, /Nothing is published until ChodhiQ approves/);
});

test('ships the shared light and dark dashboard themes', async () => {
  const [layout, controls, theme] = await Promise.all([
    readFile(new URL('../app/layout.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/theme-controls.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/theme.css', import.meta.url), 'utf8'),
  ]);
  assert.match(layout, /<ThemeControls \/>/);
  assert.match(layout, /data-theme="light"/);
  assert.match(controls, /type Theme = "light" \| "dark"/);
  assert.match(controls, /role="switch"/);
  assert.doesNotMatch(controls, /"system"|Matte|Midnight|Warm/);
  assert.match(theme, /\[data-theme="light"\]/);
  assert.match(theme, /\[data-theme="dark"\]/);
  assert.match(theme, /#10b84a/i);
});

test('uses PostgreSQL weekday numbering and avoids placeholder auth calls', async () => {
  const [page, dashboard, domain] = await Promise.all([
    readFile(new URL('../app/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../lib/use-business-dashboard.ts', import.meta.url), 'utf8'),
    readFile(new URL('../lib/business-dashboard-domain.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(domain, /label:\s*['"]Monday['"],\s*dayOfWeek:\s*1/);
  assert.match(domain, /label:\s*['"]Sunday['"],\s*dayOfWeek:\s*0/);
  assert.match(dashboard, /useState\(isSupabaseConfigured\)/);
  assert.match(dashboard, /if\s*\(!isSupabaseConfigured\)\s*return/);
  assert.doesNotMatch(page + dashboard, /from\(['"]providers['"]\)\s*\.select\(['"]\*['"]\)/);
});

test('business signup routes through application review before provider access', async () => {
  const [page, migration] = await Promise.all([
    readFile(new URL('../app/page.tsx', import.meta.url), 'utf8'),
    readFile(
      new URL(
        '../../supabase/migrations/20260901140000_provider_dashboard_approval_gate.sql',
        import.meta.url,
      ),
      'utf8',
    ),
  ]);
  assert.match(page, /BusinessApplication session=/);
  const application = await readFile(
    new URL('../app/business-application.tsx', import.meta.url),
    'utf8',
  );
  assert.match(application, /auth\.signUp/);
  assert.match(application, /submit_business_application/);
  assert.match(application, /review_due_at/);
  assert.match(page, /signInWithPassword/);
  assert.doesNotMatch(page, /signInWithOAuth/);
  assert.doesNotMatch(page, /auth\.signUp/);
  assert.match(migration, /drop policy if exists "Owners create provider"/);
  assert.match(migration, /with check \(public\.is_admin\(\)\)/);
});

test('password recovery survives auth event timing', async () => {
  const [page, dashboard] = await Promise.all([
    readFile(new URL('../app/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../lib/use-business-dashboard.ts', import.meta.url), 'utf8'),
  ]);
  const authSource = page + dashboard;
  const client = await readFile(new URL('../lib/supabase.ts', import.meta.url), 'utf8');
  assert.match(authSource, /window\.location\.hash\.includes\('type=recovery'\)/);
  assert.match(authSource, /event === 'PASSWORD_RECOVERY'/);
  assert.match(page, /resetPasswordForEmail/);
  assert.match(page, /updateUser\(\{ password \}\)/);
  assert.match(authSource, /supabase\.auth\.setSession/);
  assert.match(authSource, /access_token/);
  assert.match(authSource, /refresh_token/);
  assert.match(client, /detectSessionInUrl:\s*false/);
});

test('loads and marks owner notifications', async () => {
  const page = await readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /from\(['"]notifications['"]\)[\s\S]*?\.select/);
  assert.match(page, /\.is\(['"]read_at['"],\s*null\)/);
  assert.match(page, /aria-label="Notifications"/);
});

test('database triggers cover marketplace notification events', async () => {
  const migration = await readFile(
    new URL('../../db/20260813_in_app_notifications.sql', import.meta.url),
    'utf8',
  );
  assert.match(migration, /after insert on public\.reviews/i);
  assert.match(migration, /after update of status on public\.verification_requests/i);
  assert.match(migration, /after insert on public\.quote_requests/i);
  assert.match(migration, /after update of status on public\.quote_requests/i);
  assert.match(migration, /recipient is not null/);
});

test('owners can send in-app quote responses', async () => {
  const source = await readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');
  assert.match(source, /response_message/);
  assert.match(source, /Response sent to the customer/);
  assert.match(source, /Send response/);
});

test('owner writes use validated transactional workflows', async () => {
  const [source, leadApi] = await Promise.all([
    readFile(new URL('../app/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../lib/lead-api.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(source, /replace_provider_hours/);
  assert.match(source, /respondToLead/);
  assert.match(leadApi, /respond_to_quote/);
  assert.match(source, /validateUpload/);
  assert.match(source, /validateService/);
  assert.match(source, /window\.confirm\([\s\S]*?['"]Delete this service/);
  assert.doesNotMatch(source, /Hours were cleared but could not be replaced/);
});
