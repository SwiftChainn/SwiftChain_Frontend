import { useState, useCallback, useEffect, useRef } from 'react';
import { networkService } from '@/services/networkService';

// Minimal local type for the network info returned by the backend.
// Keep this small to avoid coupling to a non-exported service type.
type NetworkInfo = {
  network: string;
  chainId?: number | null;
};

/** How often to re-check the network while a wallet is connected (ms). */
const POLL_INTERVAL_MS = 10_000;

export type NetworkStatus =
  | 'idle' // no wallet connected
  | 'loading' // first fetch in progress
  | 'match' // wallet network matches .env config
  | 'mismatch' // wallet is on the wrong network
  | 'error'; // fetch failed

/**
 * Identity of the last network resolution actually applied to state.
 * `chainId` is the target chain ID resolved for the expected environment
 * (Stellar has no canonical numeric chain ID in this repo, so the chain
 * ID reported by the backend for the expected network is the target).
 * Kept in a ref so the hook can short-circuit before dispatching any
 * state update when a poll returns the identical identity. A failed
 * check is recorded as an `error` marker (empty network, plus the error
 * message) so the hook still knows a resolution happened — the loading
 * setter below must not fire again on later polls — while a later
 * success still applies because its status differs from the marker.
 */
type AppliedNetwork = {
  network: string; // lower-cased network name ('' for the error marker)
  chainId: number | null;
  status: NetworkStatus;
  message?: string | null; // error message when status === 'error'
};

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
 *
 * Re-render loop guard (#1034): a poll that resolves to the same network
 * identity dispatches NO state updates at all — the hook returns early as
 * soon as the incoming chain ID strictly equals the target chain ID
 * already applied for the expected network. The previous code dispatched
 * a state setter on every poll (`setError(null)` at the top of the check,
 * plus the loading setter below), and a same-value setter dispatch can
 * still cost the banner a render the first time it fires after the state
 * settles — so the loading setter is only dispatched before the first
 * resolution for the current address, and the error is only cleared in
 * the same tick as a successful resolution.
 */
export function useNetworkCheck(address: string | null) {
  const expectedNetwork = process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? 'testnet';

  const [walletNetwork, setWalletNetwork] = useState<NetworkInfo | null>(null);
  const [status, setStatus] = useState<NetworkStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastAppliedRef = useRef<AppliedNetwork | null>(null);

  const check = useCallback(async () => {
    if (!address) {
      lastAppliedRef.current = null;
      // Guarded no-ops: never dispatch when already idle / cleared.
      setStatus((prev) => (prev === 'idle' ? prev : 'idle'));
      setWalletNetwork((prev) => (prev === null ? prev : null));
      return;
    }

    // Only show the loading spinner on the very first check for this
    // address. The setter is only dispatched while no resolution has
    // been applied yet (`lastAppliedRef` is null): dispatching it on
    // every poll — even with a functional update that returns the same
    // value — still costs the banner one extra render on the first poll
    // after the state settles.
    if (lastAppliedRef.current === null) {
      setStatus((prev) => (prev === 'idle' ? 'loading' : prev));
    }

    // Applies a failed check. Returns early — dispatching nothing —
    // when the identical failure is already applied, for the same
    // reason as the loading setter above: a same-value setter dispatch
    // can still cost the banner a render on the first poll after the
    // error state settles.
    const applyFailure = (message: string) => {
      const lastApplied = lastAppliedRef.current;
      if (
        lastApplied?.status === 'error' &&
        lastApplied.message === message
      ) {
        return;
      }
      lastAppliedRef.current = {
        network: '',
        chainId: null,
        status: 'error',
        message,
      };
      setError((prev) => (prev === message ? prev : message));
      setStatus((prev) => (prev === 'error' ? prev : 'error'));
    };

    try {
      const response = await networkService.getWalletNetwork(address);
      if (response.success && response.data) {
        const incoming: NetworkInfo = response.data;

        // Determine match based on configured expected network (case-insensitive).
        const incomingNetwork = (incoming.network ?? '').toLowerCase();
        const incomingChainId = incoming.chainId ?? null;
        const match = incomingNetwork === expectedNetwork.toLowerCase();
        const newStatus: NetworkStatus = match ? 'match' : 'mismatch';

        // Short-circuit: if the current chain ID strictly equals the
        // target chain ID already resolved for the expected environment
        // (same network, same chain ID, same derived status), the state
        // already reflects this resolution — dispatch nothing. This is
        // what keeps the banner at its baseline render count while the
        // wallet is idle, instead of relying on React's same-value
        // bail-out for every setter on every poll.
        const lastApplied = lastAppliedRef.current;
        if (
          lastApplied &&
          lastApplied.network === incomingNetwork &&
          lastApplied.chainId === incomingChainId &&
          lastApplied.status === newStatus
        ) {
          return;
        }
        lastAppliedRef.current = {
          network: incomingNetwork,
          chainId: incomingChainId,
          status: newStatus,
        };

        // Only update state when something actually changed. Use functional
        // updates to avoid reading stale values from the closure and to
        // prevent setting new object identities when the logical data is
        // identical.
        setWalletNetwork((prev) => {
          if (
            prev &&
            prev.network?.toLowerCase() === incomingNetwork &&
            (prev.chainId ?? null) === incomingChainId
          ) {
            return prev;
          }
          return incoming;
        });

        setStatus((prev) => (prev === newStatus ? prev : newStatus));

        // Clear a stale error only when one is set, in the same tick as
        // the status update — never unconditionally at the top of the
        // poll, which re-created the error on the next line and rendered
        // once per poll on the failure path.
        setError((prev) => (prev === null ? prev : null));
      } else {
        applyFailure(response.message || 'Failed to check network');
      }
    } catch (err: any) {
      applyFailure(
        err.response?.data?.message ||
          'An error occurred while checking network'
      );
    }
  }, [address, expectedNetwork]);

  // Run immediately when address changes, then poll every POLL_INTERVAL_MS.
  //
  // Dependency audit (#1034): the effect intentionally depends only on
  // `address` and `check`. `check` is a useCallback over `address` and
  // `expectedNetwork` — both stable strings — so its identity only changes
  // when the address (or the configured network) changes, and the effect
  // (plus the interval) is only re-created then. There is no chain-ID
  // listener or other changing value in the array, so no render loop can
  // originate here.
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // A new effect run means a new address (or a new expected network):
    // the previous resolution is stale for this wallet.
    lastAppliedRef.current = null;

    if (!address) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus((prev) => (prev === 'idle' ? prev : 'idle'));

      setWalletNetwork((prev) => (prev === null ? prev : null));
      return;
    }

    void check();
    intervalRef.current = setInterval(() => void check(), POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
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
