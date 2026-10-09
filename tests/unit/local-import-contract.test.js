import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { parse } = require('@babel/parser');
const { getBindingIdentifiers } = require('@babel/types');
const root = path.resolve('src');
const cache = new Map();
function resolveLocal(file, source) {
  const target = path.resolve(path.dirname(file), source);
  return [target, target + '.js', path.join(target, 'index.js')].find(
    (candidate) =>
      candidate.endsWith('.js') && fs.existsSync(candidate) && fs.statSync(candidate).isFile(),
  );
}
function exportsOf(file) {
  if (cache.has(file)) return cache.get(file);
  const names = new Set();
  cache.set(file, names);
  const ast = parse(fs.readFileSync(file, 'utf8'), { sourceType: 'module', plugins: ['jsx'] });
  for (const node of ast.program.body) {
    if (node.type === 'ExportDefaultDeclaration') names.add('default');
    if (node.type === 'ExportNamedDeclaration') {
      if (node.declaration)
        for (const name of Object.keys(getBindingIdentifiers(node.declaration))) names.add(name);
      for (const specifier of node.specifiers)
        names.add(specifier.exported.name || specifier.exported.value);
    }
    if (node.type === 'ExportAllDeclaration') {
      const target = resolveLocal(file, node.source.value);
      if (target) for (const name of exportsOf(target)) if (name !== 'default') names.add(name);
    }
  }
  return names;
}
function importFailures(file, source) {
  const failures = [];
  const ast = parse(source, { sourceType: 'module', plugins: ['jsx'] });
  for (const node of ast.program.body) {
    if (node.type !== 'ImportDeclaration' || !node.source.value.startsWith('.')) continue;
    const target = resolveLocal(file, node.source.value);
    if (!target) continue;
    const exported = exportsOf(target);
    for (const specifier of node.specifiers) {
      if (specifier.type === 'ImportNamespaceSpecifier') continue;
      const name =
        specifier.type === 'ImportDefaultSpecifier'
          ? 'default'
          : specifier.imported.name || specifier.imported.value;
      if (!exported.has(name))
        failures.push(
          path.relative(root, file) + ': ' + node.source.value + ' has no ' + name + ' export',
        );
    }
  }
  return failures;
}
function filesIn(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? filesIn(path.join(directory, entry.name))
        : entry.name.endsWith('.js')
          ? [path.join(directory, entry.name)]
          : [],
    );
}
test('mobile local imports resolve to actual default or named exports', () => {
  const failures = [path.resolve('App.js'), ...filesIn(root)].flatMap((file) =>
    importFailures(file, fs.readFileSync(file, 'utf8')),
  );
  assert.deepEqual(failures, []);
});
test('the import audit rejects calling a default-only hook through a named import', () => {
  const file = path.join(root, 'screens', 'CommunityScreen.js');
  assert.equal(
    importFailures(file, "import { useLiveCallback } from '../hooks/useLiveCallback';").length,
    1,
  );
  assert.deepEqual(
    importFailures(file, "import useLiveCallback from '../hooks/useLiveCallback';"),
    [],
  );
});
