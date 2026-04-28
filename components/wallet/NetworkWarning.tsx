'use client';

import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { useState } from 'react';
import { useNetworkCheck } from '@/hooks/useNetworkCheck';

interface NetworkWarningProps {
  /** Connected wallet address — pass null when no wallet is connected. */
  address: string | null;
}

/**
 * NetworkWarning — displays a red banner immediately when the connected
 * wallet is on a different Stellar network than the one configured in
 * NEXT_PUBLIC_STELLAR_NETWORK.
 *
 * - Banner is hidden when networks match or no wallet is connected.
 * - User can dismiss the banner temporarily (it reappears on next poll).
 * - A retry button triggers an immediate re-check.
 *
 * Layered Architecture:
 *   NetworkWarning (Component) → useNetworkCheck (Hook) → networkService (Service)
 */
export function NetworkWarning({ address }: NetworkWarningProps) {
  const { status, walletNetwork, expectedNetwork, error, recheck } =
    useNetworkCheck(address);

  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed state whenever status changes so the banner
  // reappears if the user switches to the wrong network again.
  const isMismatch = status === 'mismatch';
  const isError = status === 'error';

  // Nothing to show when idle, loading, or matched.
  if (!isMismatch && !isError) return null;
  if (dismissed) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="relative flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm dark:border-red-800 dark:bg-red-900/20"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />

      <div className="flex-1">
        {isMismatch && (
          <>
            <p className="font-semibold text-red-800 dark:text-red-300">
              Wrong network detected
            </p>
            <p className="mt-0.5 text-red-700 dark:text-red-400">
              Your wallet is connected to{' '}
              <strong>{walletNetwork?.network ?? 'an unknown network'}</strong>,
              but this app requires{' '}
              <strong>{expectedNetwork}</strong>. Please switch networks in your
              wallet to continue.
            </p>
          </>
        )}

        {isError && (
          <>
            <p className="font-semibold text-red-800 dark:text-red-300">
              Could not verify network
            </p>
            <p className="mt-0.5 text-red-700 dark:text-red-400">
              {error ?? 'An unexpected error occurred while checking the network.'}
            </p>
          </>
        )}

        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => void recheck()}
            className="inline-flex items-center gap-1.5 rounded border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 transition hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30"
          >
            <RefreshCw className="h-3 w-3" />
            Re-check
          </button>
        </div>
      </div>

      {/* Dismiss button */}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss network warning"
        className="rounded p-0.5 text-red-500 transition hover:bg-red-100 dark:hover:bg-red-900/30"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}