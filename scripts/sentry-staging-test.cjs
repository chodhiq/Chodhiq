const crypto = require('node:crypto');
const fs = require('node:fs');
const https = require('node:https');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const envFile = path.join(root, '.env.local');
const local = fs.existsSync(envFile)
  ? Object.fromEntries(
      fs
        .readFileSync(envFile, 'utf8')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#') && line.includes('='))
        .map((line) => {
          const separator = line.indexOf('=');
          return [line.slice(0, separator), line.slice(separator + 1)];
        }),
    )
  : {};

const dsnValue = process.env.EXPO_PUBLIC_SENTRY_DSN || local.EXPO_PUBLIC_SENTRY_DSN;
const release = process.env.EXPO_PUBLIC_RELEASE_COMMIT || local.EXPO_PUBLIC_RELEASE_COMMIT;
if (!dsnValue || !release) {
  console.error(
    'Set EXPO_PUBLIC_SENTRY_DSN and EXPO_PUBLIC_RELEASE_COMMIT before running this staging drill.',
  );
  process.exit(1);
}

const dsn = new URL(dsnValue);
const projectId = dsn.pathname.replace(/^\//, '');
const eventId = crypto.randomBytes(16).toString('hex');
const payload = JSON.stringify({
  event_id: eventId,
  timestamp: new Date().toISOString(),
  platform: 'node',
  level: 'error',
  environment: 'staging',
  release,
  logger: 'chodhiq.monitoring-drill',
  message: 'ChodhiQ staging alert drill',
  tags: { drill: 'staging-alert', synthetic: 'true' },
  extra: { purpose: 'Verify Sentry ingestion and alert routing. Contains no customer data.' },
});

const request = https.request(
  {
    protocol: dsn.protocol,
    hostname: dsn.hostname,
    port: dsn.port || 443,
    path: `/api/${projectId}/store/`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'X-Sentry-Auth': `Sentry sentry_version=7,sentry_key=${dsn.username},sentry_client=chodhiq-drill/1.0`,
    },
  },
  (response) => {
    response.resume();
    response.on('end', () => {
      if (response.statusCode >= 200 && response.statusCode < 300) {
        console.log(`Staging drill event accepted by Sentry: ${eventId}`);
        return;
      }
      console.error(`Sentry rejected the staging drill event with HTTP ${response.statusCode}.`);
      process.exitCode = 1;
    });
  },
);
request.on('error', (error) => {
  console.error(`Unable to send staging drill event: ${error.message}`);
  process.exitCode = 1;
});
request.end(payload);
