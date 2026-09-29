import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const sourceFiles = fs
  .readdirSync(path.join(root, 'src', 'screens'))
  .filter((name) => name.endsWith('.js'));
const screenSource = sourceFiles
  .map((name) => fs.readFileSync(path.join(root, 'src', 'screens', name), 'utf8'))
  .join('\n');
const navigator = fs.readFileSync(path.join(root, 'src', 'navigation', 'RootNavigator.js'), 'utf8');

test('every literal navigation destination is registered as a stack or tab screen', () => {
  const destinations = [
    ...screenSource.matchAll(/navigation\.(?:navigate|replace)\(['"]([^'"]+)['"]/g),
  ].map((match) => match[1]);
  const registered = new Set(
    [...navigator.matchAll(/<(?:Stack|Tab)\.Screen\s+name="([^"]+)"/g)].map((match) => match[1]),
  );
  assert.deepEqual([...new Set(destinations.filter((name) => !registered.has(name)))], []);
});

test('every account menu destination is registered', () => {
  const menuRoutes = [...screenSource.matchAll(/route:\s*['"]([^'"]+)['"]/g)].map(
    (match) => match[1],
  );
  const registered = new Set(
    [...navigator.matchAll(/<(?:Stack|Tab)\.Screen\s+name="([^"]+)"/g)].map((match) => match[1]),
  );
  assert.deepEqual([...new Set(menuRoutes.filter((name) => !registered.has(name)))], []);
});

test('freelance marketplace content is not reachable from navigation', () => {
  const home = fs.readFileSync(path.join(root, 'src', 'screens', 'HomeScreen.js'), 'utf8');
  assert.doesNotMatch(navigator, /Stack\.Screen name="Creators"/);
  assert.doesNotMatch(home, /navigate\('Creators'\)|Freelancers/);
});
