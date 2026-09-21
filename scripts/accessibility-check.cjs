const fs = require('node:fs');
const path = require('node:path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const root = path.resolve(__dirname, '..');
const targets = ['src/screens', 'src/components'];
const interactive = new Set(['TouchableOpacity', 'Pressable']);
const formControls = new Set(['TextInput', 'Switch']);
const failures = [];

function filesIn(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? filesIn(target) : entry.name.endsWith('.js') ? [target] : [];
  });
}

const attributeNames = (node) =>
  new Set(
    node.attributes.filter((item) => item.type === 'JSXAttribute').map((item) => item.name.name),
  );
const containsText = (node) => {
  if (!node || typeof node !== 'object') return false;
  if (
    node.type === 'JSXElement' &&
    node.openingElement.name.type === 'JSXIdentifier' &&
    node.openingElement.name.name === 'Text'
  )
    return true;
  return Object.values(node).some((value) =>
    Array.isArray(value) ? value.some(containsText) : containsText(value),
  );
};

for (const file of targets.flatMap((target) => filesIn(path.join(root, target)))) {
  const source = fs.readFileSync(file, 'utf8');
  const ast = parser.parse(source, { sourceType: 'module', plugins: ['jsx'] });
  traverse(ast, {
    JSXOpeningElement(currentPath) {
      const { node } = currentPath;
      if (node.name.type !== 'JSXIdentifier') return;
      const name = node.name.name;
      const attributes = attributeNames(node);
      const location = `${path.relative(root, file)}:${node.loc.start.line}`;
      const parent = currentPath.parentPath?.node;
      const iconOnly =
        interactive.has(name) && parent?.type === 'JSXElement' && !containsText(parent);
      if (iconOnly && !attributes.has('accessibilityRole'))
        failures.push(`${location} icon-only ${name} needs accessibilityRole`);
      if (iconOnly && !attributes.has('accessibilityLabel'))
        failures.push(`${location} icon-only ${name} needs accessibilityLabel`);
      if (
        formControls.has(name) &&
        !attributes.has('accessibilityLabel') &&
        !attributes.has('placeholder')
      )
        failures.push(`${location} ${name} needs accessibilityLabel or placeholder`);
    },
  });
}

if (failures.length) {
  console.error(failures.map((failure) => `FAIL: ${failure}`).join('\n'));
  process.exit(1);
}
console.log('Accessibility JSX invariants passed.');
