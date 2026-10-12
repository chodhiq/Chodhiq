const fs = require('node:fs');
const path = require('node:path');

const [auditFile, bundleDirectory, auditStatusText] = process.argv.slice(2);
if (!auditFile || !bundleDirectory || !auditStatusText) {
  console.error('Usage: node check-android-bundle-audit.cjs <audit-json> <android-export-dir> <npm-exit-code>');
  process.exit(1);
}

const auditStatus = Number(auditStatusText);
let audit;
try {
  audit = JSON.parse(fs.readFileSync(auditFile, 'utf8'));
} catch (error) {
  console.error('Could not read npm audit JSON: ' + error.message);
  process.exit(1);
}

if (audit.error || !audit.metadata?.vulnerabilities || !audit.vulnerabilities) {
  console.error('npm audit did not return a complete vulnerability report.');
  console.error(JSON.stringify(audit.error || audit, null, 2));
  process.exit(1);
}

function findSourceMaps(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return findSourceMaps(fullPath);
    return entry.isFile() && entry.name.endsWith('.hbc.map') ? [fullPath] : [];
  });
}

const maps = findSourceMaps(path.resolve(bundleDirectory));
if (maps.length === 0) {
  console.error('Android export did not produce a Hermes source map; cannot scope the audit.');
  process.exit(1);
}

const sources = maps.flatMap((file) => {
  const map = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(map.sources)) throw new Error('Source map has no sources array: ' + file);
  return map.sources.map((source) => source.replaceAll('\\', '/'));
});

const allowedUnbundledAdvisories = new Map([
  ['GHSA-vfj7-8cjw-p6xm', 'braces'],
  ['GHSA-86w9-cpqp-85rv', 'node-forge'],
]);

function collectAdvisories(name, seen) {
  const visited = seen || new Set();
  if (visited.has(name)) return [];
  const vulnerability = audit.vulnerabilities[name];
  if (!vulnerability) return [];
  const pathSeen = new Set(visited);
  pathSeen.add(name);
  return (vulnerability.via || []).flatMap((entry) => {
    if (typeof entry === 'string') return collectAdvisories(entry, pathSeen);
    return typeof entry === 'object' && entry !== null ? [entry] : [];
  });
}

function packageIsBundled(packageName) {
  return sources.some((source) => source.includes('/node_modules/' + packageName + '/'));
}

const blocked = [];
const highOrCritical = Object.entries(audit.vulnerabilities).filter(([, item]) =>
  ['high', 'critical'].includes(item.severity),
);

for (const [name] of highOrCritical) {
  const advisories = collectAdvisories(name);
  const isOnlyKnownUnbundled = advisories.length > 0 && advisories.every((advisory) => {
    const id = advisory.url?.split('/').pop();
    const expectedPackage = allowedUnbundledAdvisories.get(id);
    return expectedPackage === advisory.name && !packageIsBundled(expectedPackage);
  });
  if (!isOnlyKnownUnbundled) blocked.push(name);
}

if (blocked.length > 0) {
  console.error('High or critical advisories affect Android-bundled dependencies: ' + blocked.join(', '));
  process.exit(1);
}

if (auditStatus !== 0 && highOrCritical.length === 0 && audit.metadata.vulnerabilities.total === 0) {
  console.error('npm audit exited ' + auditStatus + ' without a reported vulnerability; failing closed.');
  process.exit(1);
}

console.log('No high or critical advisories affect bundled Android JavaScript (' + highOrCritical.length + ' dependency-tree entries traced). Known unpatched build-tool advisories are excluded only after source-map verification.');
