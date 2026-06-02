'use client';

import { ExternalLink, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useTxTracker } from '@/hooks/useTxTracker';

interface TxTrackerProps {
  transactionHash: string | null;
  onStatusChange?: (status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CONFIRMED' | null) => void;
}

/**
 * TxTracker Component
 * 
 * Displays blockchain transaction status with real-time polling via React Query.
 * Automatically stops polling upon SUCCESS or FAILED terminal states.
 * 
 * Features:
 * - Live transaction status updates
 * - Clickable link to Stellar blockchain explorer
 * - Status badges with color coding
 * - Loading and error states
 * - Exponential backoff polling strategy
 */
export function TxTracker({ transactionHash, onStatusChange }: TxTrackerProps) {
  const {
    status,
    message,
    stellarExplorerUrl,
    isLoading,
    isPolling,
    error,
    isTerminalState,
  } = useTxTracker(transactionHash);

  // Notify parent when status changes
  React.useEffect(() => {
    if (onStatusChange && status) {
      onStatusChange(status);
    }
  }, [status, onStatusChange]);

  if (!transactionHash) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
        <p className="text-sm text-gray-600 dark:text-gray-400">No transaction hash provided</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
        <div className="flex items-center gap-3">
          <Loader className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
          <div>
            <p className="font-medium text-blue-900 dark:text-blue-300">Loading transaction status...</p>
            <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">{transactionHash}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <div>
            <p className="font-medium text-red-900 dark:text-red-300">Error loading transaction</p>
            <p className="text-xs text-red-700 dark:text-red-400 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const statusConfig = {
    PENDING: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-700',
      badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      icon: Loader,
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      label: 'Pending Confirmation',
    },
    CONFIRMED: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-700',
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      icon: Loader,
      iconColor: 'text-blue-600 dark:text-blue-400',
      label: 'Confirmed',
    },
    SUCCESS: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-700',
      badge: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      icon: CheckCircle,
      iconColor: 'text-green-600 dark:text-green-400',
      label: 'Confirmed',
    },
    FAILED: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-700',
      badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      icon: AlertCircle,
      iconColor: 'text-red-600 dark:text-red-400',
      label: 'Failed',
    },
  };

  const config = statusConfig[status || 'PENDING'];
  const Icon = config.icon;

  return (
    <div className={`p-4 rounded-lg border ${config.bg} ${config.border} transition-colors`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Icon className={`w-5 h-5 flex-shrink-0 ${config.iconColor} ${status === 'PENDING' || status === 'CONFIRMED' ? 'animate-spin' : ''}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${config.badge}`}>
                {config.label}
              </span>
              {isPolling && (
                <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  Polling...
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Hash */}
      <div className="mb-3">
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Transaction Hash</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded font-mono text-gray-900 dark:text-gray-100 break-all">
            {transactionHash}
          </code>
          <a
            href={stellarExplorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
            aria-label="View on Stellar Explorer"
            title="View on Stellar Explorer"
          >
            <ExternalLink className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </a>
        </div>
      </div>

      {/* Message / Status Details */}
      {message && (
        <div className="mb-2">
          <p className="text-xs text-gray-700 dark:text-gray-300">{message}</p>
        </div>
      )}

      {/* Network Info */}
      <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Network: <span className="font-semibold">{process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet'}</span>
        </p>
      </div>
    </div>
  );
}

// Add React import for useEffect
import React from 'react';
