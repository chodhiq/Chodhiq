import { useCallback, useState } from 'react';
import { flushPendingOperations } from '../data/syncRepository';

const initialStatus = { running: false, synced: 0, pending: 0, failed: 0, lastRunAt: null };

export function useOfflineSync() {
  const [syncStatus, setSyncStatus] = useState(initialStatus);

  const retryPendingOperations = useCallback(async () => {
    setSyncStatus((current) => ({ ...current, running: true }));
    try {
      const result = await flushPendingOperations();
      const next = { ...result, running: false, lastRunAt: new Date().toISOString() };
      setSyncStatus(next);
      return next;
    } catch (error) {
      setSyncStatus((current) => ({ ...current, running: false }));
      throw error;
    }
  }, []);

  return { syncStatus, retryPendingOperations };
}
