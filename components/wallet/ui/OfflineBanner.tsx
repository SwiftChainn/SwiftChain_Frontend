'use client';

import useOffline from '@/hooks/useOffline';
import { WifiOff } from 'lucide-react';

/**
 * OfflineBanner — Component to display network status fallback.
 */
const OfflineBanner = () => {
  const { isOnline } = useOffline();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] animate-in fade-in slide-in-from-top duration-300">
      <div className="bg-gradient-to-r from-red-600 to-red-500 text-white px-6 py-2.5 flex items-center justify-center gap-3 shadow-lg backdrop-blur-md bg-opacity-95">
        <WifiOff className="w-4 h-4 animate-pulse" />
        <p className="text-sm font-semibold tracking-wide">
          You are currently offline.{' '}
          <span className="font-normal opacity-90 ml-1.5">
            Transactions are disabled until connection is restored.
          </span>
        </p>
      </div>
    </div>
  );
};

export default OfflineBanner;
