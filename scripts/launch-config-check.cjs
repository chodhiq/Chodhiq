const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function readEnv(relativePath) {
  const file = path.join(root, relativePath);
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const separator = line.indexOf('=');
        return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
      }),
  );
}

const placeholder = (value) =>
  !value || /your-|example\.com|placeholder|changeme|test-key/i.test(value);

const targets = [
  {
    name: 'customer app',
    file: '.env.local',
    required: [
      'EXPO_PUBLIC_SUPABASE_URL',
      'EXPO_PUBLIC_SUPABASE_ANON_KEY',
      'EXPO_PUBLIC_EAS_PROJECT_ID',
      'EXPO_PUBLIC_SUPPORT_EMAIL',
      'EXPO_PUBLIC_PRIVACY_EMAIL',
    ],
  },
  {
    name: 'business dashboard',
    file: 'business-dashboard/.env.local',
    required: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SITE_URL'],
  },
  {
    name: 'admin dashboard',
    file: 'admin-dashboard/.env.local',
    required: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SITE_URL'],
  },
];

const failures = [];
for (const target of targets) {
  const values = readEnv(target.file);
  for (const key of target.required) {
    if (placeholder(values[key])) failures.push(`${target.name}: ${key}`);
  }
}

const appEnv = readEnv('.env.local');
const appDefaultEnv = readEnv('.env');
const businessEnv = readEnv('business-dashboard/.env.local');
const adminEnv = readEnv('admin-dashboard/.env.local');
const productionUrl = 'https://gfjhvsajwjrrlylgrkhf.supabase.co';
for (const [name, values, key] of [
  ['customer app .env', appDefaultEnv, 'EXPO_PUBLIC_SUPABASE_URL'],
  ['customer app .env.local', appEnv, 'EXPO_PUBLIC_SUPABASE_URL'],
  ['business dashboard', businessEnv, 'NEXT_PUBLIC_SUPABASE_URL'],
  ['admin dashboard', adminEnv, 'NEXT_PUBLIC_SUPABASE_URL'],
]) {
  if (values[key] !== productionUrl) failures.push(`${name}: must target ChodhiQ Production`);
}
const productionKey = businessEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (
  !productionKey ||
  appDefaultEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY !== productionKey ||
  appEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY !== productionKey ||
  adminEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY !== productionKey
) {
  failures.push('public Supabase keys must match across all three production apps');
}
if (businessEnv.SITE_URL !== 'https://chodhiq-business-dashboard.chodhiq.workers.dev') {
  failures.push('business dashboard: SITE_URL must target the hosted Production dashboard');
}
if (adminEnv.SITE_URL !== 'https://chodhiq-admin-dashboard.chodhiq.workers.dev') {
  failures.push('admin dashboard: SITE_URL must target the hosted Production dashboard');
}
if (String(appEnv.EXPO_PUBLIC_DEMO_MODE).toLowerCase() === 'true') {
  failures.push('customer app: EXPO_PUBLIC_DEMO_MODE must not be true');
}

if (failures.length) {
  console.error('Launch configuration is incomplete:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Launch configuration files contain all required non-placeholder values.');
