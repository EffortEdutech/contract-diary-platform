// ============================================================================
// File 2: frontend/src/components/common/OfflineSyncStatus.js
// ============================================================================

import React, { useState } from 'react';
import { useSyncStatus } from '../../hooks/useSyncStatus';

/**
 * Offline sync status indicator component
 * Shows sync status, pending items, and sync controls
 */
const OfflineSyncStatus = ({ position = 'fixed' }) => {
  const { syncStats, syncProgress, isOnline, sync, retryFailed } = useSyncStatus();
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't show if everything is synced and online
  if (isOnline && syncStats.pending === 0 && syncStats.failed === 0 && !syncStats.isSyncing) {
    return null;
  }

  // Determine status color
  const getStatusColor = () => {
    if (!isOnline) return 'bg-yellow-500';
    if (syncStats.isSyncing) return 'bg-blue-500';
    if (syncStats.failed > 0) return 'bg-red-500';
    if (syncStats.pending > 0) return 'bg-orange-500';
    return 'bg-green-500';
  };

  // Determine status text
  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (syncStats.isSyncing) return 'Syncing...';
    if (syncStats.failed > 0) return `${syncStats.failed} Failed`;
    if (syncStats.pending > 0) return `${syncStats.pending} Pending`;
    return 'Synced';
  };

  // Determine status icon
  const getStatusIcon = () => {
    if (!isOnline) return '📴';
    if (syncStats.isSyncing) return '🔄';
    if (syncStats.failed > 0) return '❌';
    if (syncStats.pending > 0) return '⏳';
    return '✅';
  };

  const positionClasses = position === 'fixed' 
    ? 'fixed bottom-4 right-4 z-50'
    : '';

  return (
    <div className={`${positionClasses}`}>
      {/* Compact Status Badge */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`${getStatusColor()} text-white px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-2 font-medium text-sm`}
      >
        <span>{getStatusIcon()}</span>
        <span>{getStatusText()}</span>
        <span className="text-xs opacity-75">
          {syncStats.isSyncing ? `${syncProgress?.completed || 0}/${syncProgress?.total || 0}` : ''}
        </span>
      </button>

      {/* Expanded Status Panel */}
      {isExpanded && (
        <div className="absolute bottom-14 right-0 bg-white rounded-lg shadow-2xl border border-gray-200 w-80 max-w-full">
          {/* Header */}
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-bold text-gray-900">Sync Status</h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* Status Details */}
          <div className="p-4 space-y-4">
            {/* Connection Status */}
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-700">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            {/* Sync Statistics */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-orange-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-orange-600">
                  {syncStats.pending}
                </div>
                <div className="text-xs text-orange-600 mt-1">Pending</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-green-600">
                  {syncStats.synced}
                </div>
                <div className="text-xs text-green-600 mt-1">Synced</div>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-red-600">
                  {syncStats.failed}
                </div>
                <div className="text-xs text-red-600 mt-1">Failed</div>
              </div>
            </div>

            {/* Sync Progress */}
            {syncStats.isSyncing && syncProgress && (
              <div>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Syncing...</span>
                  <span>{syncProgress.completed}/{syncProgress.total}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ 
                      width: `${(syncProgress.completed / syncProgress.total) * 100}%` 
                    }}
                  />
                </div>
                {syncProgress.currentItem && (
                  <div className="text-xs text-gray-500 mt-1">
                    {syncProgress.currentItem}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              {isOnline && syncStats.pending > 0 && !syncStats.isSyncing && (
                <button
                  onClick={() => sync()}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  🔄 Sync Now
                </button>
              )}
              
              {syncStats.failed > 0 && !syncStats.isSyncing && (
                <button
                  onClick={() => retryFailed()}
                  className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 text-sm font-medium"
                >
                  🔄 Retry Failed
                </button>
              )}
            </div>

            {/* Offline Message */}
            {!isOnline && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                <p className="font-medium mb-1">📴 Working Offline</p>
                <p className="text-xs">
                  Your changes are saved locally and will sync automatically when you're back online.
                </p>
              </div>
            )}

            {/* Pending Items Info */}
            {syncStats.pending > 0 && isOnline && !syncStats.isSyncing && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <p className="font-medium mb-1">⏳ {syncStats.pending} Items Waiting</p>
                <p className="text-xs">
                  Click "Sync Now" to upload your offline changes.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OfflineSyncStatus;