import { useCallback, useEffect, useState } from 'react';
import { loadNotifications, markNotificationsRead } from '../../data/accountRepository';
import { formatNotification } from '../../data/accountMappers';
import { supabase } from '../../lib/supabase';

export function useNotificationState(session) {
  const [notifications, setNotifications] = useState([]);
  const refreshNotifications = useCallback(
    async (userId = session?.user?.id) => {
      if (!userId) return;
      const rows = await loadNotifications(userId);
      setNotifications(rows.map(formatNotification));
    },
    [session?.user?.id],
  );

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || !supabase) return undefined;
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
      void supabase.removeChannel(channel);
    };
  }, [refreshNotifications, session?.user?.id]);

  const markAllNotificationsRead = useCallback(async () => {
    if (!session?.user?.id) return;
    setNotifications((items) => items.map((item) => ({ ...item, read: true })));
    await markNotificationsRead(session.user.id);
  }, [session?.user?.id]);
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
