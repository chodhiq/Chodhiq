import { useCallback, useState } from 'react';
import { flushPendingOperations } from '../data/syncRepository';
import {
  discardPendingOperation,
  resumeAuthRequiredOperations,
  retryPendingOperation,
} from '../data/localDatabase';

const initialStatus = {
  running: false,
  synced: 0,
  pending: 0,
  failed: 0,
  failedOperations: [],
  authRequiredOperations: [],
  syncedOperations: [],
  lastRunAt: null,
};

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

  const retryFailedOperation = useCallback(
    async (id) => {
      await retryPendingOperation(id);
      return retryPendingOperations();
    },
    [retryPendingOperations],
  );

  const discardFailedOperation = useCallback(async (id) => {
    await discardPendingOperation(id);
    setSyncStatus((current) => ({
      ...current,
      failedOperations: current.failedOperations.filter((item) => item.id !== id),
      failed: Math.max(0, current.failed - 1),
    }));
  }, []);

  const resumeAuthRequiredWrites = useCallback(async () => {
    const count = await resumeAuthRequiredOperations();
    if (count) return retryPendingOperations();
    return null;
  }, [retryPendingOperations]);

  return {
    syncStatus,
    retryPendingOperations,
    retryFailedOperation,
    discardFailedOperation,
    resumeAuthRequiredWrites,
  };
}
