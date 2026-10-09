import test from 'node:test';
import assert from 'node:assert/strict';
import { createMotionPreferencesStore } from '../../src/lib/motionPreferencesStore.js';

function fixture() {
  const callbacks = {};
  let added = 0;
  let removed = 0;
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
  const store = createMotionPreferencesStore(
    { isReduceMotionEnabled: () => pending, addEventListener },
    { currentState: 'active', addEventListener },
  );
  return { store, callbacks, resolve, counts: () => ({ added, removed }) };
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
  await Promise.resolve();
  assert.deepEqual(store.getSnapshot(), { reducedMotion: false, foreground: true });
  callbacks.change('background');
  const background = store.getSnapshot();
  callbacks.change('inactive');
  assert.equal(store.getSnapshot(), background);
  callbacks.change('active');
  assert.equal(updates, 3);
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
