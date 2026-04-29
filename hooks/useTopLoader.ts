/**
 * useTopLoader Hook
 * Custom hook for managing top loader state
 * Integrates with TopLoaderService to handle route navigation loading feedback
 */

'use client';

import { useEffect, useState } from 'react';
import { topLoaderService } from '@/services/topLoaderService';

/**
 * Hook that provides loading state during route transitions
 * @returns {boolean} isLoading - True when navigation is in progress
 */
export function useTopLoader(): boolean {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initialize the service on first use
    topLoaderService.initialize();

    // Subscribe to loading state changes
    const unsubscribe = topLoaderService.subscribe(setIsLoading);

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  return isLoading;
}
