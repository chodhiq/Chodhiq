import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createSelectionSnapshot,
  createSelectorStore,
  shallowEqual,
} from '../../src/lib/selectorStore.js';

test('shallow-equal selectors retain their selection when an unrelated domain changes', () => {
  const initial = { savedIds: ['p1'], unreadCount: 0, providers: [{ id: 'p1' }] };
  const store = createSelectorStore(initial);
  const selectorRef = { current: (state) => ({ savedIds: state.savedIds }) };
  const equalityRef = { current: shallowEqual };
  const selectionRef = { current: { initialized: false, value: undefined } };
  const selected = createSelectionSnapshot(store, selectorRef, equalityRef, selectionRef);

  store.setSnapshot({ ...initial, unreadCount: 1 });
  const afterNotification = createSelectionSnapshot(store, selectorRef, equalityRef, selectionRef);
  assert.equal(afterNotification, selected);

  store.setSnapshot({ ...initial, savedIds: ['p1', 'p2'], unreadCount: 1 });
  const afterSave = createSelectionSnapshot(store, selectorRef, equalityRef, selectionRef);
  assert.notEqual(afterSave, selected);
  assert.deepEqual(afterSave.savedIds, ['p1', 'p2']);
});

test('selector store notifies subscribers only when the snapshot reference changes', () => {
  const store = createSelectorStore({ count: 1 });
  let notifications = 0;
  const unsubscribe = store.subscribe(() => {
    notifications += 1;
  });

  const first = store.getSnapshot();
  store.setSnapshot(first);
  store.setSnapshot({ count: 2 });
  unsubscribe();
  store.setSnapshot({ count: 3 });

  assert.equal(notifications, 1);
});
