import { installKeyboardVisibility } from '../../packages/web-forms/keyboard-visibility.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { keyboardScrollAdjustment } from '../../src/lib/keyboardGeometry.js';
import { mergeCommunityPage } from '../../src/lib/communityPaging.js';
import { performancePolicy } from '../../src/lib/performancePolicy.js';
import { notificationDestination } from '../../src/lib/notificationDestination.js';
import { isSafeAppLink } from '../../src/lib/authCallback.js';
import { pushRegistrationErrorMessage } from '../../src/lib/pushRegistrationErrors.js';
const { androidPushConfigPath, validateAndroidPushConfig } = createRequire(import.meta.url)(
  '../../scripts/android-push-config.cjs',
);
test('keyboard clearance handles overlay, resized windows, and already-visible fields', () => {
  const base = {
    containerTop: 80,
    containerHeight: 720,
    inputTop: 650,
    inputHeight: 60,
    keyboardTop: 500,
    offset: 100,
  };
  assert.deepEqual(keyboardScrollAdjustment(base), {
    overlap: 300,
    scrollY: 330,
    needsScroll: true,
  });
  assert.deepEqual(keyboardScrollAdjustment({ ...base, containerHeight: 420 }), {
    overlap: 0,
    scrollY: 330,
    needsScroll: true,
  });
  assert.deepEqual(keyboardScrollAdjustment({ ...base, inputTop: 150 }), {
    overlap: 300,
    scrollY: 100,
    needsScroll: false,
  });
});
test('keyboard clearance supports old Android resize events without keyboard coordinates', () => {
  assert.deepEqual(
    keyboardScrollAdjustment({
      containerTop: 80,
      containerHeight: 400,
      inputTop: 450,
      inputHeight: 50,
      offset: 0,
    }),
    { overlap: 0, scrollY: 40, needsScroll: true },
  );
  assert.equal(
    keyboardScrollAdjustment({
      containerTop: 80,
      containerHeight: 400,
      inputTop: 0,
      inputHeight: 50,
      offset: 20,
    }).scrollY,
    0,
  );
});
test('community comment composer resizes above the Android keyboard', () => {
  const source = readFileSync(
    new URL('../../src/screens/CommunityScreen.js', import.meta.url),
    'utf8',
  );
  const modalStart = source.indexOf('<Modal\n        visible={!!commentsPost}');
  assert.notEqual(modalStart, -1);
  const modalEnd = source.indexOf('</Modal>', modalStart);
  assert.notEqual(modalEnd, -1);
  const commentsModal = source.slice(modalStart, modalEnd);
  assert.match(commentsModal, /behavior=\{Platform\.OS === 'ios' \? 'padding' : 'height'\}/);
  assert.match(commentsModal, /accessibilityLabel="Write a comment"/);
});
test('feed page merges preserve earlier rows and replace overlapping server updates', () => {
  const old = [{ id: 'a', created_at: '2026-10-06T10:00:00Z', body: 'old' }];
  const incoming = [
    { id: 'b', created_at: '2026-10-06T09:00:00Z' },
    { id: 'a', created_at: '2026-10-06T10:00:00Z', body: 'new' },
  ];
  const merged = mergeCommunityPage(old, incoming);
  assert.deepEqual(
    merged.map((p) => p.id),
    ['a', 'b'],
  );
  assert.equal(merged[0].body, 'new');
  assert.deepEqual(
    mergeCommunityPage(old, [incoming[0]], true).map((p) => p.id),
    ['b'],
  );
});
test('memory policy only opts known low-memory devices into lighter budgets', () => {
  assert.equal(performancePolicy(2 * 1024 ** 3).lowMemory, true);
  assert.equal(performancePolicy(6 * 1024 ** 3).lowMemory, false);
  for (const value of [null, undefined, 0, Infinity, NaN])
    assert.equal(performancePolicy(value).lowMemory, false);
  assert.ok(
    performancePolicy(2 * 1024 ** 3).listWindow < performancePolicy(6 * 1024 ** 3).listWindow,
  );
});
test('push errors distinguish permission, build configuration, timeouts and account setup', () => {
  assert.match(pushRegistrationErrorMessage({ code: 'PUSH_PERMISSION_DENIED' }), /phone settings/);
  assert.match(
    pushRegistrationErrorMessage({ code: 'PUSH_CLIENT_CONFIG_MISSING' }),
    /missing Android push/,
  );
  assert.match(pushRegistrationErrorMessage({ code: 'PUSH_TIMEOUT' }), /timed out/);
  assert.match(pushRegistrationErrorMessage({ code: 'PUSH_PROFILE_MISSING' }), /account profile/);
});
test('Android push validation rejects service accounts and wrong package configurations', () => {
  const good = {
    project_info: { project_id: 'test-project', project_number: '123' },
    client: [
      {
        client_info: {
          mobilesdk_app_id: '1:123:android:abc',
          android_client_info: { package_name: 'com.chodhiq.app' },
        },
      },
    ],
  };
  assert.equal(validateAndroidPushConfig(good), true);
  assert.throws(
    () =>
      validateAndroidPushConfig({
        type: 'service_account',
        private_key: 'test-fixture-private-key',
      }),
    /never a service-account/,
  );
  assert.throws(() => validateAndroidPushConfig({ ...good, client: [] }), /does not match/);
  assert.throws(() => validateAndroidPushConfig({}), /incomplete/);
});

test('Android push config resolves the local client file for native builds', () => {
  const projectRoot = mkdtempSync(path.join(os.tmpdir(), 'chodhiq-push-config-'));
  const localConfig = path.join(projectRoot, 'google-services.json');
  const configuredConfig = path.join(projectRoot, 'eas-google-services.json');
  const config = {
    project_info: { project_id: 'test-project', project_number: '123' },
    client: [
      {
        client_info: {
          mobilesdk_app_id: '1:123:android:abc',
          android_client_info: { package_name: 'com.chodhiq.app' },
        },
      },
    ],
  };
  try {
    writeFileSync(localConfig, JSON.stringify(config));
    writeFileSync(configuredConfig, JSON.stringify(config));
    assert.equal(androidPushConfigPath({}, projectRoot), localConfig);
    assert.equal(
      androidPushConfigPath({ GOOGLE_SERVICES_JSON: configuredConfig }, projectRoot),
      configuredConfig,
    );
    assert.throws(
      () =>
        androidPushConfigPath(
          { GOOGLE_SERVICES_JSON: path.join(projectRoot, 'missing.json') },
          projectRoot,
        ),
      /configured Android Firebase client file is missing/,
    );
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('deep-link validation rejects malformed encodings and oversized inputs', () => {
  assert.equal(isSafeAppLink('chodhiq://auth/callback?code=a%20b'), true);
  assert.equal(isSafeAppLink('chodhiq://auth/callback?code=%E0%A4%A'), false);
  assert.equal(isSafeAppLink('chodhiq://auth/callback?code=%'), false);
  assert.equal(isSafeAppLink('x'.repeat(8193)), false);
});

test('push taps route general notifications and reject another account destination', () => {
  assert.deepEqual(notificationDestination({ type: 'booking', userId: 'me' }, 'me'), {
    route: 'Notifications',
  });
  assert.equal(notificationDestination({ userId: 'other' }, 'me'), null);
  assert.equal(notificationDestination({}, null), null);
  const id = '96300000-0000-4000-8000-000000000020';
  assert.deepEqual(notificationDestination({ entityType: 'community_post', entityId: id }, 'me'), {
    route: 'Community',
    params: { postId: id },
  });
});

test('web forms reveal a keyboard-covered field and remove listeners on cleanup', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const handlers = new Map();
  let scrolled = 0;
  const element = {
    matches: () => true,
    getBoundingClientRect: () => ({ top: 700, bottom: 760 }),
    scrollIntoView: () => {
      scrolled++;
    },
  };
  const viewport = {
    height: 500,
    offsetTop: 0,
    addEventListener: (name, handler) => handlers.set('viewport-' + name, handler),
    removeEventListener: (name) => handlers.delete('viewport-' + name),
  };
  const win = {
    innerWidth: 390,
    innerHeight: 844,
    visualViewport: viewport,
    addEventListener: (name, handler) => handlers.set('window-' + name, handler),
    removeEventListener: (name) => handlers.delete('window-' + name),
  };
  const doc = {
    activeElement: element,
    body: { dataset: {} },
    querySelector: () => ({ getBoundingClientRect: () => ({ height: 112 }) }),
    addEventListener: (name, handler) => handlers.set(name, handler),
    removeEventListener: (name) => handlers.delete(name),
  };
  const cleanup = installKeyboardVisibility(win, doc);
  handlers.get('focusin')();
  t.mock.timers.tick(121);
  assert.equal(scrolled, 1);
  assert.equal(doc.body.dataset.editing, 'true');
  cleanup();
  assert.equal(handlers.size, 0);
  assert.equal(doc.body.dataset.editing, undefined);
});
