const fs = require('node:fs');
const path = require('node:path');

const [auditFile, assetDirectory, hostingConfigFile, auditStatusText] = process.argv.slice(2);
if (!auditFile || !assetDirectory || !hostingConfigFile || auditStatusText === undefined) {
  console.error(
    'Usage: node check-static-site-audit.cjs <audit-json> <static-assets-dir> <hosting-config> <npm-exit-code>',
  );
  process.exit(1);
}

const auditStatus = Number(auditStatusText);
let audit;
let hosting;
try {
  audit = JSON.parse(fs.readFileSync(auditFile, 'utf8'));
  hosting = JSON.parse(fs.readFileSync(hostingConfigFile, 'utf8'));
} catch (error) {
  console.error(`Could not read audit or hosting configuration: ${error.message}`);
  process.exit(1);
}

if (audit.error || !audit.metadata?.vulnerabilities || !audit.vulnerabilities) {
  console.error('npm audit did not return a complete vulnerability report.');
  console.error(JSON.stringify(audit.error || audit, null, 2));
  process.exit(1);
}

const absoluteAssets = path.resolve(assetDirectory);
if (hosting.static?.directory !== 'dist/client' || absoluteAssets !== path.resolve('dist/client')) {
  console.error('Expected a static-only deployment from dist/client; cannot scope the audit.');
  process.exit(1);
}
if (!fs.existsSync(path.join(absoluteAssets, 'index.html'))) {
  console.error('Static export has no index.html; cannot scope the audit.');
  process.exit(1);
}

function findSourceMaps(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return findSourceMaps(fullPath);
    return entry.isFile() && entry.name.endsWith('.map') ? [fullPath] : [];
  });
}

const maps = findSourceMaps(absoluteAssets);
if (maps.length === 0) {
  console.error('Static export produced no JavaScript source maps; cannot scope the audit.');
  process.exit(1);
}

const sources = maps.flatMap((file) => {
  const map = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(map.sources)) throw new Error(`Source map has no sources array: ${file}`);
  return map.sources.map((source) => source.replaceAll('\\', '/'));
});

const allowedUnbundledAdvisories = new Map([
  ['GHSA-vfj7-8cjw-p6xm', 'braces'],
  ['GHSA-g7r4-m6w7-qqqr', 'esbuild'],
]);

function collectAdvisories(name, seen = new Set()) {
  if (seen.has(name)) return [];
  const vulnerability = audit.vulnerabilities[name];
  if (!vulnerability) return [];
  const pathSeen = new Set(seen).add(name);
  return (vulnerability.via || []).flatMap((entry) => {
    if (typeof entry === 'string') return collectAdvisories(entry, pathSeen);
    return typeof entry === 'object' && entry !== null ? [entry] : [];
  });
}

function packageIsBundled(packageName) {
  const escaped = packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return sources.some((source) => new RegExp(`(?:^|/)node_modules/${escaped}/`).test(source));
}

const blocked = [];
const highOrCritical = Object.entries(audit.vulnerabilities).filter(([, item]) =>
  ['high', 'critical'].includes(item.severity),
);

for (const [name] of highOrCritical) {
  const advisories = collectAdvisories(name).filter((advisory) =>
    ['high', 'critical'].includes(advisory.severity),
  );
  const isOnlyKnownUnbundled =
    advisories.length > 0 &&
    advisories.every((advisory) => {
      const id = advisory.url?.split('/').pop();
      const expectedPackage = allowedUnbundledAdvisories.get(id);
      return expectedPackage !== undefined && !packageIsBundled(expectedPackage);
    });
    if (!isOnlyKnownUnbundled) blocked.push(name);
}

if (blocked.length > 0) {
  console.error(`High or critical advisories affect static-site JavaScript: ${blocked.join(', ')}`);
  process.exit(1);
}

if (auditStatus !== 0 && highOrCritical.length === 0 && audit.metadata.vulnerabilities.total === 0) {
  console.error(`npm audit exited ${auditStatus} without a reported vulnerability; failing closed.`);
  process.exit(1);
}

console.log(
  `No high or critical advisories affect deployed static-site JavaScript (${highOrCritical.length} dependency-tree entries traced). Known build-tool advisories are excluded only after static deployment and source-map verification.`,
);
