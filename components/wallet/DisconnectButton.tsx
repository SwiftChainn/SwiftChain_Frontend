'use client';

import { useWallet } from '@/hooks/useWallet';
import useOffline from '@/hooks/useOffline';

export function DisconnectButton() {
  const { isConnected, address, disconnect } = useWallet();
  const { isOnline } = useOffline();

  const handleDisconnect = () => {
    if (!isOnline) return;
    disconnect();
  };

  if (!isConnected) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-secondary">No wallet connected</span>
        <button
          disabled
          className="px-4 py-2 bg-gray-300 text-gray-500 rounded-md text-sm font-medium cursor-not-allowed"
          type="button"
        >
          Disconnect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-secondary truncate max-w-xs">
        {address}
      </span>
      <button
        disabled={!isOnline}
        onClick={handleDisconnect}
        className={`px-4 py-2 rounded-md transition-colors text-sm font-medium ${
          isOnline
            ? 'bg-red-500 text-white hover:bg-red-600 active:scale-95 shadow-sm'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed grayscale'
        }`}
        type="button"
      >
        {isOnline ? 'Disconnect Wallet' : 'Offline'}
      </button>
    </div>
  );
}
