import test from 'node:test';
import assert from 'node:assert/strict';
import { createImageRevealRegistry, imageIdentity } from '../../src/lib/imageRevealRegistry.js';

test('local assets and remote sources keep their identity across renders', () => {
  assert.equal(imageIdentity(42), 'asset:42');
  assert.equal(
    imageIdentity({ uri: 'https://example.com/image.jpg' }),
    imageIdentity({ uri: 'https://example.com/image.jpg', width: 200 }),
  );
  assert.notEqual(imageIdentity(42), imageIdentity(43));
  assert.notEqual(
    imageIdentity([{ uri: 'a' }, { uri: 'b' }]),
    imageIdentity([{ uri: 'b' }, { uri: 'a' }]),
  );
});
test('loaded images remain revealed when revisiting a screen', () => {
  const registry = createImageRevealRegistry();
  assert.equal(registry.has('hero'), false);
  registry.mark('hero');
  assert.equal(registry.has('hero'), true);
  registry.mark('hero');
  assert.equal(registry.has('hero'), true);
  assert.equal(registry.has('new-hero'), false);
});
test('missing sources do not wait for a load event', () => {
  const registry = createImageRevealRegistry();
  assert.equal(registry.has(imageIdentity(undefined)), true);
  registry.mark('');
  assert.equal(registry.has(''), true);
});
test('image history stays bounded without duplicate loads evicting other images', () => {
  const registry = createImageRevealRegistry(2);
  registry.mark('first');
  registry.mark('second');
  registry.mark('second');
  assert.equal(registry.has('first'), true);
  registry.mark('third');
  assert.equal(registry.has('first'), false);
  assert.equal(registry.has('second'), true);
  assert.equal(registry.has('third'), true);
});
