'use client';

import { useWallet } from '@/hooks/useWallet';
import { NetworkWarning } from './NetworkWarning';

/**
 * WalletConnect — primary UI entry point for Freighter wallet management.
 *
 * Layered Architecture:
 *   WalletConnect (Component) → useWallet (Hook) → walletService / freighterService (Services)
 *
 * Three connection states:
 *   1. Freighter not installed  — shows an install prompt
 *   2. Not connected            — shows "Connect Wallet" button
 *   3. Connected                — shows truncated public key + disconnect button
 */
export function WalletConnect() {
  const {
    address,
    isConnected,
    isFreighterInstalled,
    isConnecting,
    connectError,
    connect,
    disconnect,
  } = useWallet();

  if (isConnected && address) {
    return (
      <div className="flex flex-col gap-3 w-full max-w-sm">
        <NetworkWarning address={address} />

        <div className="flex items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-900/20">
          <div className="flex items-center gap-2 min-w-0">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-green-500" aria-hidden="true" />
            <span className="text-xs font-medium text-green-700 dark:text-green-400 truncate" title={address}>
              {address.slice(0, 6)}…{address.slice(-6)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => void disconnect()}
            className="shrink-0 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-red-600 active:scale-95"
          >
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  if (!isFreighterInstalled) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 dark:border-amber-800 dark:bg-amber-900/20 w-full max-w-sm">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          Freighter not detected
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Install the Freighter browser extension to connect your Stellar wallet.
        </p>
        <a
          href="https://www.freighter.app"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block self-start rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-700 active:scale-95"
        >
          Install Freighter
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full max-w-sm">
      {connectError && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
        >
          {connectError}
        </p>
      )}

      <button
        type="button"
        disabled={isConnecting}
        onClick={() => void connect()}
        className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isConnecting ? (
          <>
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
              aria-hidden="true"
            />
            Connecting…
          </>
        ) : (
          'Connect Freighter Wallet'
        )}
      </button>
    </div>
  );
}
