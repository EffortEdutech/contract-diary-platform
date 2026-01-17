// ============================================================================
// ONLINE STATUS HOOK - Network Detection
// ============================================================================
// File: frontend/src/hooks/useOnlineStatus.js
// Purpose: React hook to detect online/offline status
// ============================================================================

import { useState, useEffect } from 'react';

/**
 * Hook to detect online/offline status
 * @returns {boolean} isOnline - true if online, false if offline
 */
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      console.log('📱 Device is ONLINE');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('📴 Device is OFFLINE');
      setIsOnline(false);
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};

export default useOnlineStatus;
