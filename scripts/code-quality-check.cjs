const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const failures = [];
const sourceFiles = [];

function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(target);
    else if (/\.(js|ts|mjs)$/.test(entry.name)) sourceFiles.push(target);
  }
}

collect(path.join(root, 'src'));
for (const file of sourceFiles) {
  const relative = path.relative(root, file);
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    if (line.length > 300) failures.push(`${relative}:${index + 1} exceeds 300 characters`);
  });
  const portableRelative = relative.split(path.sep).join('/');
  if (!['src/components/AppText.js', 'src/components/AppTextInput.js'].includes(portableRelative)) {
    const source = lines.join('\n');
    if (/import\s+\{[^}]*\bText\s*(?:,|\})[^}]*\}\s*from\s+['"]react-native['"]/.test(source)) {
      failures.push(`${relative} must use AppText instead of importing Text from react-native`);
    }
    if (
      /import\s+\{[^}]*\bTextInput\s*(?:,|\})[^}]*\}\s*from\s+['"]react-native['"]/.test(source)
    ) {
      failures.push(
        `${relative} must use AppTextInput instead of importing TextInput from react-native`,
      );
    }
  }
}

for (const relative of [
  'src/lib/validation.js',
  'src/data/bookingRepository.js',
  'src/data/bookingMapper.js',
  'src/data/subscriptionRepository.js',
  'src/lib/pushNotifications.js',
  'src/data/categoryMatching.js',
  'src/data/syncPolicy.js',
  'src/data/accountMappers.js',
  'src/data/bookingMapper.js',
]) {
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  if (!source.startsWith('// @ts-check')) failures.push(`${relative} must retain // @ts-check`);
}

if (failures.length) {
  console.error(failures.map((failure) => `FAIL: ${failure}`).join('\n'));
  process.exit(1);
}
console.log(`Code-quality invariants passed for ${sourceFiles.length} source files.`);
