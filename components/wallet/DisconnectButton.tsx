'use client';

import { useWallet } from '@/hooks/useWallet';

export function DisconnectButton() {
  const { isConnected, address, disconnect } = useWallet();

  const handleDisconnect = () => {
    void disconnect();
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
        onClick={handleDisconnect}
        className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm font-medium"
        type="button"
      >
        Disconnect Wallet
      </button>
    </div>
  );
}
