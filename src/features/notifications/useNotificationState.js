import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { loadNotifications, markNotificationsRead } from '../../data/accountRepository';
import { formatNotification } from '../../data/accountMappers';
import { supabase } from '../../lib/supabase';
import { getNotificationsModule } from '../../lib/notificationRuntime';

export function useNotificationState(session) {
  const [notifications, setNotifications] = useState([]);
  const requestSequence = useRef(0);
  const currentUser = useRef(session?.user?.id);
  currentUser.current = session?.user?.id;
  const refreshNotifications = useCallback(
    async (userId = session?.user?.id) => {
      if (!userId) return;
      const request = ++requestSequence.current;
      const rows = await loadNotifications(userId);
      if (currentUser.current === userId && request === requestSequence.current)
        setNotifications(rows.map(formatNotification));
    },
    [session?.user?.id],
  );

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || !supabase) return undefined;
    void refreshNotifications().catch(() => {});
    const foreground = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshNotifications().catch(() => {});
    });
    const channel = supabase
      .channel(`customer-notifications-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => refreshNotifications().catch(() => {}),
      )
      .subscribe();
    const fallback = setInterval(() => refreshNotifications().catch(() => {}), 60_000);
    return () => {
      clearInterval(fallback);
      foreground.remove();
      void supabase.removeChannel(channel);
    };
  }, [refreshNotifications, session?.user?.id]);

  const markAllNotificationsRead = useCallback(async () => {
    const userId = session?.user?.id;
    const ids = notifications.filter((item) => !item.read).map((item) => item.id);
    if (!userId || !ids.length) return;
    await markNotificationsRead(userId, ids);
    if (currentUser.current !== userId) return;
    ++requestSequence.current;
    const cleared = new Set(ids);
    setNotifications((items) =>
      items.map((item) => (cleared.has(item.id) ? { ...item, read: true } : item)),
    );
    const native = getNotificationsModule();
    if (native) {
      const delivered = await native.getPresentedNotificationsAsync().catch(() => []);
      await Promise.all(
        delivered
          .filter((item) => cleared.has(item.request.content.data?.notificationId))
          .map((item) => native.dismissNotificationAsync(item.request.identifier).catch(() => {})),
      );
    }
  }, [notifications, session?.user?.id]);
  const replaceNotifications = useCallback(
    (rows) => setNotifications(rows.map(formatNotification)),
    [],
  );

  return {
    notifications,
    setNotifications,
    replaceNotifications,
    refreshNotifications,
    markAllNotificationsRead,
    unreadCount: notifications.filter((item) => !item.read).length,
  };
}
