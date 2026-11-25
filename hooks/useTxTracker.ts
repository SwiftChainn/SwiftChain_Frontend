'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { walletService } from '@/services/walletService';
import { TransactionResponse, TransactionStatus } from '@/types/transaction';

/**
 * useTxTracker — React Query-based polling hook for blockchain transaction status.
 *
 * Automatically stops polling when the transaction reaches a terminal state
 * (SUCCESS or FAILED). Uses exponential backoff to reduce server load.
 *
 * Race-condition guarantees:
 * - Monotonic status: once a terminal state (SUCCESS or FAILED) has been
 *   confirmed by the backend, a stale/late PENDING response can never move
 *   the displayed status backwards. Statuses only advance
 *   (PENDING -> CONFIRMED -> SUCCESS | FAILED).
 * - Polling stops strictly immediately on a terminal state: the refetch
 *   interval is disabled both from the latest query data and from the
 *   latched terminal flag, so a stale response landing afterwards cannot
 *   restart polling.
 * - The PENDING display state is debounced (PENDING_DEBOUNCE_MS): a
 *   transaction that confirms within that window never flashes a
 *   "Pending" state. Terminal states are always applied immediately.
 *
 * @param transactionHash - The blockchain transaction hash to track
 * @returns Query result with transaction status, error, and loading states
 */

/** Delay before a PENDING status is shown, so fast confirmations never flash "Pending". */
export const PENDING_DEBOUNCE_MS = 200;

/** Progress order of transaction statuses; terminal states share the top rank. */
const STATUS_RANK: Record<TransactionStatus, number> = {
  PENDING: 0,
  CONFIRMED: 1,
  SUCCESS: 2,
  FAILED: 2,
};

function isTerminalStatus(
  status: TransactionStatus | null | undefined
): status is 'SUCCESS' | 'FAILED' {
  return status === 'SUCCESS' || status === 'FAILED';
}

export function useTxTracker(transactionHash: string | null) {
  const POLL_INTERVAL = 3000; // 3 seconds initial poll
  const MAX_POLL_INTERVAL = 30000; // 30 seconds max

  // Highest-ranked response confirmed so far. A terminal state latched here
  // is permanent for this transaction hash and can never be overwritten by
  // a stale, out-of-order PENDING response.
  const latchedResponseRef = useRef<TransactionResponse | null>(null);
  const terminalLatchedRef = useRef(false);
  // Pending debounce timer for the PENDING display state. Managed via a ref
  // (not an effect cleanup) so a duplicate same-rank response arriving
  // inside the window cannot cancel it.
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Displayed response: lags the raw query data only while a PENDING status
  // is inside its debounce window. Null while nothing has been displayed yet.
  const [displayResponse, setDisplayResponse] = useState<TransactionResponse | null>(null);

  const clearPendingTimer = useCallback(() => {
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
  }, []);

  const { data, isLoading, error, isFetching, isPending } = useQuery<TransactionResponse, Error>({
    queryKey: ['transaction', transactionHash],
    queryFn: async () => {
      if (!transactionHash) {
        throw new Error('Transaction hash is required');
      }
      return walletService.getTransactionStatus(transactionHash);
    },
    enabled: !!transactionHash,
    // Polling strategy: check if terminal state reached, then stop polling
    refetchInterval: (query) => {
      // A latched terminal state stops polling even if a stale PENDING
      // payload has since overwritten the query data.
      if (terminalLatchedRef.current) return false;

      if (!query.state.data) return POLL_INTERVAL;

      // Terminal states - stop polling
      if (query.state.data.status === 'SUCCESS' || query.state.data.status === 'FAILED') {
        return false; // Disable polling for terminal states
      }

      // Active polling: increase interval over time (exponential backoff)
      const pollCount = Math.floor((Date.now() - query.state.dataUpdatedAt) / POLL_INTERVAL);
      const interval = Math.min(POLL_INTERVAL * Math.pow(1.5, Math.floor(pollCount / 3)), MAX_POLL_INTERVAL);
      return interval;
    },
    // Stale time and cache duration
    staleTime: 2000, // Consider data stale after 2 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
    retry: (failureCount) => failureCount < 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // A new transaction hash starts a fresh tracking lifecycle.
  useEffect(() => {
    latchedResponseRef.current = null;
    terminalLatchedRef.current = false;
    clearPendingTimer();
    setDisplayResponse(null);
    return () => clearPendingTimer();
  }, [transactionHash, clearPendingTimer]);

  // Latch each fresh response monotonically and drive the displayed status.
  // Terminal states are displayed immediately; PENDING is debounced so a
  // fast confirmation never flashes "Pending" in the UI.
  useEffect(() => {
    if (!data) return;

    const latched = latchedResponseRef.current;
    if (latched) {
      // Ignore stale responses that would move the status backwards (e.g. a
      // late PENDING arriving after SUCCESS was already confirmed).
      if (STATUS_RANK[data.status] < STATUS_RANK[latched.status]) {
        return;
      }
      if (STATUS_RANK[data.status] === STATUS_RANK[latched.status]) {
        // Same-rank duplicate (e.g. repeated PENDING polls): keep the
        // freshest payload latched but do not restart the debounce timer.
        latchedResponseRef.current = data;
        return;
      }
    }

    latchedResponseRef.current = data;

    if (isTerminalStatus(data.status)) {
      terminalLatchedRef.current = true;
      clearPendingTimer();
      setDisplayResponse(data);
      return;
    }

    if (data.status === 'PENDING') {
      if (!pendingTimerRef.current) {
        pendingTimerRef.current = setTimeout(() => {
          pendingTimerRef.current = null;
          // Only display PENDING if nothing more advanced arrived meanwhile.
          if (latchedResponseRef.current?.status === 'PENDING') {
            setDisplayResponse(latchedResponseRef.current);
          }
        }, PENDING_DEBOUNCE_MS);
      }
      return;
    }

    clearPendingTimer();
    setDisplayResponse(data);
  }, [data, clearPendingTimer]);

  const status = displayResponse?.status || null;
  const isTerminalState = isTerminalStatus(status);
  const isPolling = !isTerminalState && isFetching;

  return {
    transactionHash: displayResponse?.transactionHash || null,
    status,
    message: displayResponse?.message || '',
    stellarExplorerUrl: displayResponse?.stellarExplorerUrl || '',
    isLoading: isPending,
    isPolling,
    error: error?.message || null,
    isTerminalState,
  };
}
