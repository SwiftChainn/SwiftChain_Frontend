'use client';

import React, { useEffect } from 'react';
import { ExternalLink, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useTxTracker } from '@/hooks/useTxTracker';
import { TransactionStatus } from '@/types/transaction';

// ─── Types ─────────────────────────────────────────────────────────────────

interface TransactionTrackerProps {
  /**
   * The 64-character Stellar transaction hash to track.
   * Passing `null` renders an empty-state placeholder.
   */
  transactionHash: string | null;
  /**
   * Optional callback fired whenever the displayed status changes.
   * Useful for parent components that need to react to terminal states
   * (e.g., unlock a "Continue" button after SUCCESS).
   */
  onStatusChange?: (status: TransactionStatus | null) => void;
}

// ─── Status display config ──────────────────────────────────────────────────

interface StatusConfig {
  bg: string;
  border: string;
  badge: string;
  Icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  animate: boolean;
  label: string;
}

const STATUS_CONFIG: Record<TransactionStatus, StatusConfig> = {
  PENDING: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-200 dark:border-yellow-700',
    badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    Icon: Loader,
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    animate: true,
    label: 'Pending Confirmation',
  },
  CONFIRMED: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-700',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    Icon: Loader,
    iconColor: 'text-blue-600 dark:text-blue-400',
    animate: true,
    label: 'Confirmed',
  },
  SUCCESS: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-700',
    badge: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    Icon: CheckCircle,
    iconColor: 'text-green-600 dark:text-green-400',
    animate: false,
    label: 'Confirmed',
  },
  FAILED: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-700',
    badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    Icon: AlertCircle,
    iconColor: 'text-red-600 dark:text-red-400',
    animate: false,
    label: 'Failed',
  },
};

// ─── Sub-components ────────────────────────────────────────────────────────

function EmptyHashState() {
  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
      <p className="text-sm text-gray-600 dark:text-gray-400">No transaction hash provided</p>
    </div>
  );
}

function LoadingState({ transactionHash }: { transactionHash: string }) {
  return (
    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
      <div className="flex items-center gap-3">
        <Loader className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" aria-hidden="true" />
        <div>
          <p className="font-medium text-blue-900 dark:text-blue-300">Loading transaction status...</p>
          <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">{transactionHash}</p>
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
      <div className="flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" aria-hidden="true" />
        <div>
          <p className="font-medium text-red-900 dark:text-red-300">Error loading transaction</p>
          <p className="text-xs text-red-700 dark:text-red-400 mt-1">{message}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

/**
 * TransactionTracker — displays live Stellar blockchain transaction status.
 *
 * ### Responsibilities (pure presentation)
 * This component owns **no async logic**. It delegates all status fetching,
 * polling, and race-condition handling to `useTxTracker`, which in turn calls
 * `walletService.getTransactionStatus` for the raw API data.
 *
 * ### Features
 * - Smooth PENDING → SUCCESS transition with no backward flicker
 * - Polling indicator badge while confirmation is in-progress
 * - Clickable Stellar Explorer link
 * - Full dark-mode support
 * - Accessible ARIA labels and roles
 */
export function TransactionTracker({
  transactionHash,
  onStatusChange,
}: TransactionTrackerProps) {
  const {
    status,
    message,
    stellarExplorerUrl,
    isLoading,
    isPolling,
    error,
  } = useTxTracker(transactionHash);

  // Notify parent whenever the displayed status changes.
  useEffect(() => {
    if (onStatusChange) {
      onStatusChange(status);
    }
  }, [status, onStatusChange]);

  // ── Guard states ───────────────────────────────────────────────────────────

  if (!transactionHash) {
    return <EmptyHashState />;
  }

  if (isLoading) {
    return <LoadingState transactionHash={transactionHash} />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  // ── Status panel ───────────────────────────────────────────────────────────

  // Fall back to PENDING config while the debounce grace period has not yet
  // resolved (status is null momentarily between load and first debounce tick).
  const config = STATUS_CONFIG[status ?? 'PENDING'];
  const { Icon } = config;

  const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? 'testnet';

  return (
    <div
      className={`p-4 rounded-lg border transition-colors ${config.bg} ${config.border}`}
      role="status"
      aria-live="polite"
      aria-label={`Transaction status: ${config.label}`}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Icon
            className={`w-5 h-5 flex-shrink-0 ${config.iconColor} ${config.animate ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-block px-2 py-1 rounded text-xs font-semibold ${config.badge}`}
            >
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

      {/* ── Transaction Hash ──────────────────────────────────────────────── */}
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
            <ExternalLink className="w-4 h-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          </a>
        </div>
      </div>

      {/* ── Status message ────────────────────────────────────────────────── */}
      {message && (
        <div className="mb-2">
          <p className="text-xs text-gray-700 dark:text-gray-300">{message}</p>
        </div>
      )}

      {/* ── Network info ──────────────────────────────────────────────────── */}
      <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Network:{' '}
          <span className="font-semibold">{network}</span>
        </p>
      </div>
    </div>
  );
}
