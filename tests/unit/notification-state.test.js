import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { formatNotification } from '../../src/data/accountMappers.js';

// Execute the actual hook with a small deterministic hook host; no native device or network.
const source = readFileSync(
  new URL('../../src/features/notifications/useNotificationState.js', import.meta.url),
  'utf8',
)
  .replace(/^import .*;\r?\n/gm, '')
  .replace('export function useNotificationState', 'function useNotificationState');
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
};
function host({ mark = async () => {}, load = async () => [], native = null } = {}) {
  const slots = [];
  let cursor = 0;
  const useState = (initial) => {
    const i = cursor++;
    if (!(i in slots)) slots[i] = initial;
    return [
      slots[i],
      (next) => {
        slots[i] = typeof next === 'function' ? next(slots[i]) : next;
      },
    ];
  };
  const useRef = (initial) => {
    const i = cursor++;
    if (!(i in slots)) slots[i] = { current: initial };
    return slots[i];
  };
  const hook = new Function(
    'useState',
    'useRef',
    'useCallback',
    'useEffect',
    'markNotificationsRead',
    'loadNotifications',
    'formatNotification',
    'getNotificationsModule',
    source + '; return useNotificationState;',
  )(
    useState,
    useRef,
    (fn) => fn,
    () => {},
    mark,
    load,
    formatNotification,
    () => native,
  );
  return (userId = 'user-a') => {
    cursor = 0;
    return hook({ user: { id: userId } });
  };
}
const row = (id) => ({ id, title: id, body: 'Update', read_at: null });

test('Read all clears only its snapshot and preserves a newly arriving notification', async () => {
  const pending = deferred();
  let written;
  const render = host({
    mark: (user, ids) => {
      written = { user, ids };
      return pending.promise;
    },
  });
  render().replaceNotifications([row('one'), row('two')]);
  const clearing = render().markAllNotificationsRead();
  render().setNotifications((items) => [...items, formatNotification(row('new'))]);
  pending.resolve();
  await clearing;
  assert.deepEqual(written, { user: 'user-a', ids: ['one', 'two'] });
  assert.deepEqual(
    render()
      .notifications.filter((n) => !n.read)
      .map((n) => n.id),
    ['new'],
  );
});

test('failed Read all leaves notifications unread for retry', async () => {
  const render = host({
    mark: async () => {
      throw new Error('offline');
    },
  });
  render().replaceNotifications([row('one')]);
  await assert.rejects(render().markAllNotificationsRead(), /offline/);
  assert.equal(render().unreadCount, 1);
});

test('a stale refresh cannot resurrect cleared notifications', async () => {
  const pending = deferred();
  const render = host({ load: () => pending.promise });
  render().replaceNotifications([row('one')]);
  const refresh = render().refreshNotifications();
  await render().markAllNotificationsRead();
  pending.resolve([row('one')]);
  await refresh;
  assert.equal(render().unreadCount, 0);
});

test('Read all dismisses matching phone notifications without dismissing new ones', async () => {
  const dismissed = [];
  const render = host({
    native: {
      getPresentedNotificationsAsync: async () =>
        ['one', 'new'].map((id) => ({
          request: { identifier: 'phone-' + id, content: { data: { notificationId: id } } },
        })),
      dismissNotificationAsync: async (id) => {
        dismissed.push(id);
      },
    },
  });
  render().replaceNotifications([row('one')]);
  await render().markAllNotificationsRead();
  assert.deepEqual(dismissed, ['phone-one']);
});

test('an old account refresh cannot overwrite a newly signed-in account', async () => {
  const pending = deferred();
  const render = host({ load: () => pending.promise });
  const refresh = render().refreshNotifications();
  render('user-b').replaceNotifications([row('new-account')]);
  pending.resolve([row('old-account')]);
  await refresh;
  assert.equal(render('user-b').notifications[0].id, 'new-account');
});
