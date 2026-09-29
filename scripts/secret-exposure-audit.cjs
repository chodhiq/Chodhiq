const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const ignoredDirectories = new Set([
  '.git',
  '.next',
  '.expo',
  '.npm-cache',
  '.temp',
  '.vinext',
  '.wrangler',
  'build',
  'coverage',
  'node_modules',
  'output',
  'outputs',
  'work',
]);
const textExtensions = new Set([
  '',
  '.cjs',
  '.css',
  '.env',
  '.example',
  '.html',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.mjs',
  '.ps1',
  '.sql',
  '.toml',
  '.ts',
  '.tsx',
  '.txt',
  '.yaml',
  '.yml',
]);

const credentialPatterns = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g],
  ['AWS access key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ['GitHub token', /\b(?:gh[opsu]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/g],
  ['Stripe secret key', /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/g],
  ['Google OAuth client secret', /\bGOCSPX-[A-Za-z0-9_-]{20,}\b/g],
  ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g],
  ['Sentry auth token', /\bsntrys_[A-Za-z0-9_-]{20,}\b/g],
  ['Expo access token', /\b(?:expo|eas)_[A-Za-z0-9_-]{30,}\b/g],
  [
    'credential-bearing URL',
    /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s/:]+:[^\s/@]+@/gi,
  ],
];

const suspiciousAssignment =
  /\b([A-Z0-9_]*(?:PASSWORD|PRIVATE_KEY|SERVICE_ROLE|SECRET|AUTH_TOKEN|ACCESS_TOKEN)[A-Z0-9_]*)[ \t]*[:=][ \t]*(?:"([^"\r\n]+)"|'([^'\r\n]+)'|`([^`\r\n]+)`)/gi;
const allowedExamples =
  /^(?:your[-_]|replace[-_]|example[-_]|placeholder|changeme|paste[-_]|test[-_]|<)/i;
const findings = [];

function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      visit(file);
      continue;
    }
    if (!entry.isFile()) continue;
    const extension = path.extname(entry.name).toLowerCase();
    if (!textExtensions.has(extension) && !entry.name.startsWith('.env')) continue;
    if (fs.statSync(file).size > 8 * 1024 * 1024) continue;
    let contents;
    try {
      contents = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    if (contents.includes('\0')) continue;
    scan(file, contents);
  }
}

function add(file, contents, index, type, name = '') {
  const line = contents.slice(0, index).split('\n').length;
  findings.push({ file: path.relative(root, file).replaceAll('\\', '/'), line, type, name });
}

function scan(file, contents) {
  for (const [type, pattern] of credentialPatterns) {
    pattern.lastIndex = 0;
    for (const match of contents.matchAll(pattern)) add(file, contents, match.index, type);
  }
  const relative = path.relative(root, file).replaceAll('\\', '/');
  if (relative.includes('/dist/') || relative.startsWith('dist')) return;
  suspiciousAssignment.lastIndex = 0;
  for (const match of contents.matchAll(suspiciousAssignment)) {
    const value = match[2] || match[3] || match[4] || '';
    if (/resetpassword/i.test(match[1])) continue;
    if (
      value.length < 8 ||
      allowedExamples.test(value) ||
      value.includes('process.env') ||
      value.includes('Deno.env')
    )
      continue;
    add(file, contents, match.index, 'suspicious literal assignment', match[1]);
  }
}

visit(root);

if (findings.length) {
  console.error(`Potential secret exposures: ${findings.length}`);
  for (const finding of findings) {
    console.error(
      `${finding.file}:${finding.line} ${finding.type}${finding.name ? ` (${finding.name})` : ''}`,
    );
  }
  process.exit(1);
}

console.log('Redacted secret-exposure audit passed; no known private credential patterns found.');
