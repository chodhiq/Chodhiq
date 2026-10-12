const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(process.argv[2] || '');
if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
  console.error('Android export directory does not exist.');
  process.exit(1);
}

function findSourceMaps(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return findSourceMaps(fullPath);
    return entry.isFile() && entry.name.endsWith('.hbc.map') ? [fullPath] : [];
  });
}

const maps = findSourceMaps(root);
if (maps.length === 0) {
  console.error('Android export did not produce a Hermes source map; cannot verify bundle contents.');
  process.exit(1);
}

const sources = maps.flatMap((file) => {
  const map = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(map.sources)) throw new Error('Source map has no sources array: ' + file);
  return map.sources.map((source) => source.replaceAll('\\', '/'));
});

const auditOnlyPackages = ['braces', 'node-forge', 'micromatch', 'xcode'];
const included = auditOnlyPackages.filter((name) =>
  sources.some((source) => source.includes('/node_modules/' + name + '/')),
);

if (included.length > 0) {
  console.error('Unexpected audit-only packages in Android JavaScript bundle: ' + included.join(', '));
  process.exit(1);
}

console.log('Verified ' + sources.length + ' Android source-map entries; no ' + auditOnlyPackages.join(', ') + ' modules are bundled.');
