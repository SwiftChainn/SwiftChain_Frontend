import { useState, useCallback, useEffect, useRef } from 'react';
import { networkService, NetworkInfo } from '@/services/networkService';

/** How often to re-check the network while a wallet is connected (ms). */
const POLL_INTERVAL_MS = 10_000;

export type NetworkStatus =
  | 'idle'      // no wallet connected
  | 'loading'   // first fetch in progress
  | 'match'     // wallet network matches .env config
  | 'mismatch'  // wallet is on the wrong network
  | 'error';    // fetch failed

/**
 * useNetworkCheck — polls the backend to detect whether the connected wallet
 * is on the expected Stellar network (from NEXT_PUBLIC_STELLAR_NETWORK).
 *
 * Returns:
 *  - `status`          — idle | loading | match | mismatch | error
 *  - `walletNetwork`   — the network the wallet reported (or null)
 *  - `expectedNetwork` — the value of NEXT_PUBLIC_STELLAR_NETWORK
 *  - `error`           — error message string when status === 'error'
 *  - `recheck`         — manually trigger a re-check immediately
 */
export function useNetworkCheck(address: string | null) {
  const expectedNetwork =
    process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? 'testnet';

  const [walletNetwork, setWalletNetwork] = useState<NetworkInfo | null>(null);
  const [status, setStatus] = useState<NetworkStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const check = useCallback(async () => {
    if (!address) {
      setStatus('idle');
      setWalletNetwork(null);
      return;
    }

    // Only show the loading spinner on the very first check.
    setStatus((prev) => (prev === 'idle' ? 'loading' : prev));
    setError(null);

    try {
      const response = await networkService.getWalletNetwork(address);
      if (response.success && response.data) {
        setWalletNetwork(response.data);
        const match =
          response.data.network.toLowerCase() ===
          expectedNetwork.toLowerCase();
        setStatus(match ? 'match' : 'mismatch');
      } else {
        setError(response.message || 'Failed to check network');
        setStatus('error');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'An error occurred while checking network'
      );
      setStatus('error');
    }
  }, [address, expectedNetwork]);

  // Run immediately when address changes, then poll every POLL_INTERVAL_MS.
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (!address) {
      setStatus('idle');
      setWalletNetwork(null);
      return;
    }

    void check();
    intervalRef.current = setInterval(() => void check(), POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [address, check]);

  return {
    status,
    walletNetwork,
    expectedNetwork,
    error,
    recheck: check,
  };
}