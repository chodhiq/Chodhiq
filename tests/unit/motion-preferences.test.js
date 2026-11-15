import test from 'node:test';
import assert from 'node:assert/strict';
import { createMotionPreferencesStore } from '../../src/lib/motionPreferencesStore.js';

function fixture(storedEffectsLevel = null) {
  const callbacks = {};
  let added = 0;
  let removed = 0;
  let systemReads = 0;
  let storageReads = 0;
  let resolve;
  const pending = new Promise((done) => {
    resolve = done;
  });
  const addEventListener = (name, callback) => {
    callbacks[name] = callback;
    added += 1;
    return {
      remove: () => {
        removed += 1;
      },
    };
  };
  const storage = {
    getItem: async () => {
      storageReads += 1;
      return storedEffectsLevel;
    },
    setItem: async (_key, value) => {
      storedEffectsLevel = value;
    },
    removeItem: async () => {
      storedEffectsLevel = null;
    },
  };
  const store = createMotionPreferencesStore(
    {
      isReduceMotionEnabled: () => {
        systemReads += 1;
        return pending;
      },
      addEventListener,
    },
    { currentState: 'active', addEventListener },
    storage,
  );
  return {
    store,
    callbacks,
    resolve,
    storage,
    reads: () => ({ storageReads, systemReads }),
    counts: () => ({ added, removed }),
  };
}

function flushAsyncReads() {
  return new Promise((resolve) => setImmediate(resolve));
}

test('many animated controls share native listeners and remove them after the last unmount', () => {
  const { store, counts } = fixture();
  const dispose = Array.from({ length: 100 }, () => store.subscribe(() => {}));
  assert.deepEqual(counts(), { added: 2, removed: 0 });
  dispose.slice(0, 99).forEach((unsubscribe) => unsubscribe());
  assert.deepEqual(counts(), { added: 2, removed: 0 });
  dispose[99]();
  assert.deepEqual(counts(), { added: 2, removed: 2 });
});

test('background and inactive states suspend ambient motion without duplicate notifications', async () => {
  const { store, callbacks, resolve } = fixture();
  let updates = 0;
  const dispose = store.subscribe(() => {
    updates += 1;
  });
  resolve(false);
  await flushAsyncReads();
  assert.deepEqual(store.getSnapshot(), {
    reducedMotion: false,
    systemReducedMotion: false,
    visualEffectsLevel: null,
    visualEffectsLoaded: true,
    foreground: true,
  });
  callbacks.change('background');
  const background = store.getSnapshot();
  callbacks.change('inactive');
  assert.equal(store.getSnapshot(), background);
  callbacks.change('active');
  assert.equal(updates, 4);
  dispose();
});

test('an older asynchronous preference read cannot undo a newer accessibility setting', async () => {
  const { store, callbacks, resolve } = fixture();
  const dispose = store.subscribe(() => {});
  callbacks.reduceMotionChanged(true);
  resolve(false);
  await Promise.resolve();
  assert.equal(store.getSnapshot().reducedMotion, true);
  dispose();
});

test('a preference read arriving after teardown cannot update the store', async () => {
  const { store, resolve } = fixture();
  const dispose = store.subscribe(() => {});
  dispose();
  const previous = store.getSnapshot();
  resolve(false);
  await Promise.resolve();
  assert.equal(store.getSnapshot(), previous);
});

test('stored visual effects override system motion and device policy, and persist changes', async () => {
  const { store, storage } = fixture('off');
  const dispose = store.subscribe(() => {});
  await flushAsyncReads();
  assert.equal(store.getSnapshot().visualEffectsLevel, 'off');
  assert.equal(store.getSnapshot().reducedMotion, true);

  await store.setVisualEffectsLevel('full');
  assert.equal(store.getSnapshot().visualEffectsLevel, 'full');
  assert.equal(store.getSnapshot().reducedMotion, false);
  assert.equal(await storage.getItem(), 'full');
  dispose();
});

test('reads the stored setting before querying system reduced motion', async () => {
  const { store, reads } = fixture('off');
  const dispose = store.subscribe(() => {});
  assert.deepEqual(reads(), { storageReads: 0, systemReads: 0 });
  await flushAsyncReads();
  assert.deepEqual(reads(), { storageReads: 1, systemReads: 1 });
  assert.equal(store.getSnapshot().visualEffectsLevel, 'off');
  dispose();
});
