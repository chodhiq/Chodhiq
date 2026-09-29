const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

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

const local = readEnv('.env.local');
const value = (name) => process.env[name] || local[name] || '';
const placeholder = (input) =>
  !input || /your-|example\.com|placeholder|changeme|set-in-/i.test(input);
const required = [
  'EXPO_PUBLIC_SENTRY_DSN',
  'EXPO_PUBLIC_RELEASE_COMMIT',
  'SENTRY_ORG',
  'SENTRY_PROJECT',
  'SENTRY_AUTH_TOKEN',
];
const failures = required.filter((name) => placeholder(value(name)));

let head = '';
try {
  head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
} catch {
  failures.push('git repository/HEAD');
}
if (head && value('EXPO_PUBLIC_RELEASE_COMMIT') && value('EXPO_PUBLIC_RELEASE_COMMIT') !== head) {
  failures.push('EXPO_PUBLIC_RELEASE_COMMIT does not match git HEAD');
}

if (failures.length) {
  console.error('Monitoring configuration is incomplete:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  'Sentry DSN, release identity, project metadata, and source-map upload credentials are configured.',
);
