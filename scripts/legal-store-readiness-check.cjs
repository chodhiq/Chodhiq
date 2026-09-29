const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const directories = ['project-docs/legal', 'project-docs/store'];
const files = directories.flatMap((directory) =>
  fs
    .readdirSync(path.join(root, directory))
    .filter((name) => name.endsWith('.md'))
    .map((name) => path.join(root, directory, name)),
);
const unresolved = [];
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const placeholders = [...content.matchAll(/\{\{([A-Z0-9_]+)\}\}/g)].map((match) => match[1]);
  if (placeholders.length) {
    unresolved.push(`${path.relative(root, file)}: ${[...new Set(placeholders)].join(', ')}`);
  }
}

if (unresolved.length) {
  console.error('Legal/store publication is blocked by unresolved approved values:');
  unresolved.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}
console.log('Legal and store documents contain no unresolved publication placeholders.');
