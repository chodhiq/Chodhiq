import { readFile } from 'node:fs/promises';

// Use only an explicitly supplied Management API credential. This script never
// reads credential stores or .env files and patches only these three settings.
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error(
    'Set SUPABASE_ACCESS_TOKEN in your shell before running this scoped configuration update.',
  );
  process.exit(1);
}
const endpoint = 'https://api.supabase.com/v1/projects/gfjhvsajwjrrlylgrkhf/config/auth';
const confirmationUrl = 'https://chodhiq-business-dashboard.chodhiq.workers.dev/auth/confirm';
const template = await readFile(
  new URL('../supabase/templates/confirmation.html', import.meta.url),
  'utf8',
);
async function request(method, body) {
  const response = await fetch(endpoint, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Auth configuration request failed (HTTP ${response.status}).`);
  return response.json();
}
try {
  // Fail before touching Auth if the hosted route has not been deployed yet.
  const page = await fetch(confirmationUrl, { signal: AbortSignal.timeout(20000) });
  if (!page.ok || !(await page.text()).includes('confirmation-title'))
    throw new Error('Deploy the hosted confirmation page before updating email configuration.');
  const before = await request('GET');
  if (before.site_url !== 'https://chodhiq-business-dashboard.chodhiq.workers.dev')
    throw new Error(
      'Production Site URL differs from the expected ChodhiQ host. No settings changed.',
    );
  const redirects = new Set(
    (before.uri_allow_list || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  );
  redirects.add(confirmationUrl);
  const patch = {
    uri_allow_list: [...redirects].join(','),
    mailer_subjects_confirmation: 'Confirm your ChodhiQ email address',
    mailer_templates_confirmation_content: template,
  };
  if (process.argv.includes('--apply')) {
    await request('PATCH', patch);
    const after = await request('GET');
    if (Object.entries(patch).some(([key, value]) => after[key] !== value))
      throw new Error('Auth configuration readback did not match the requested update.');
    console.log(
      'Verified: exact redirect added and branded confirmation template applied. Existing redirect entries were preserved.',
    );
  } else {
    console.log(
      'Review complete. Only the exact confirmation redirect, email subject and confirmation template will change. Run with --apply to apply them.',
    );
  }
} catch (error) {
  // Never print response bodies or credentials.
  console.error(
    error instanceof Error
      ? error.message.replaceAll(token, '[REDACTED]')
      : 'Auth configuration failed.',
  );
  process.exitCode = 1;
}
