// ============================================================================
// SYNC STATUS HOOK & OFFLINE INDICATOR COMPONENT
// ============================================================================

// ============================================================================
// File 1: frontend/src/hooks/useSyncStatus.js
// ============================================================================

import { useState, useEffect } from 'react';
import { syncService } from '../services/syncService';
import { useOnlineStatus } from './useOnlineStatus';

/**
 * Hook for tracking sync status and statistics
 */
export const useSyncStatus = () => {
  const isOnline = useOnlineStatus();
  const [syncStats, setSyncStats] = useState({
    pending: 0,
    synced: 0,
    failed: 0,
    total: 0,
    isSyncing: false
  });
  const [syncProgress, setSyncProgress] = useState(null);

  // Load sync stats
  const loadStats = async () => {
    const stats = await syncService.getSyncStats();
    setSyncStats(stats);
  };

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && syncStats.pending > 0 && !syncStats.isSyncing) {
      console.log('📱 Device online with pending items, starting auto-sync...');
      handleSync();
    }
  }, [isOnline]);

  // Listen to sync progress
  useEffect(() => {
    const handleProgress = (progress) => {
      setSyncProgress(progress);
      if (progress.status === 'completed' || progress.status === 'error') {
        loadStats(); // Refresh stats after sync
      }
    };

    syncService.addListener(handleProgress);
    loadStats(); // Initial load

    // Refresh stats every 10 seconds
    const interval = setInterval(loadStats, 10000);

    return () => {
      syncService.removeListener(handleProgress);
      clearInterval(interval);
    };
  }, []);

  const handleSync = async () => {
    const result = await syncService.startSync();
    await loadStats();
    return result;
  };

  const handleRetry = async () => {
    const result = await syncService.retryFailed();
    await loadStats();
    return result;
  };

  const handleClearSynced = async () => {
    await syncService.clearSynced();
    await loadStats();
  };

  return {
    syncStats,
    syncProgress,
    isOnline,
    sync: handleSync,
    retryFailed: handleRetry,
    clearSynced: handleClearSynced,
    refreshStats: loadStats
  };
};

export default useSyncStatus;



