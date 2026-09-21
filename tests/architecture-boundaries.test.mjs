import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import * as sharedValidation from '../packages/validation/index.js';

test('shared validation is executable and product adapters preserve its contract', async () => {
  assert.equal(sharedValidation.cleanEmail(' PERSON@Example.COM '), 'person@example.com');
  const [mobile, business] = await Promise.all([
    readFile(new URL('../src/lib/validation.js', import.meta.url), 'utf8'),
    readFile(new URL('../business-dashboard/lib/validation.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(mobile, /packages\/validation/);
  // The provider dashboard is deployed from its own repository, so its adapter
  // intentionally carries the same small contract without a parent-directory import.
  assert.match(business, /validateText/);
  assert.match(business, /validateService/);
  assert.doesNotMatch(business, /\.\.\/\.\.\/packages/);
});

test('feature state owns marketplace and notification synchronization', async () => {
  const [context, marketplace, notifications] = await Promise.all([
    readFile(new URL('../src/context/AppStateContext.js', import.meta.url), 'utf8'),
    readFile(
      new URL('../src/features/marketplace/useMarketplaceState.js', import.meta.url),
      'utf8',
    ),
    readFile(
      new URL('../src/features/notifications/useNotificationState.js', import.meta.url),
      'utf8',
    ),
  ]);
  assert.match(context, /useMarketplaceState/);
  assert.match(context, /useNotificationState/);
  assert.match(marketplace, /loadMarketplace/);
  assert.match(notifications, /postgres_changes/);
  assert.match(notifications, /removeChannel/);
});
