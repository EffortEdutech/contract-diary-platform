
// ============================================================================
// File 3: frontend/src/components/common/OfflineIndicator.js
// ============================================================================

import React from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

/**
 * Simple offline indicator badge
 * Shows in page header or form
 */
const OfflineIndicator = ({ className = '' }) => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className={`inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium ${className}`}>
      <span className="w-2 h-2 bg-yellow-600 rounded-full animate-pulse" />
      <span>Offline Mode</span>
    </div>
  );
};

export default OfflineIndicator;