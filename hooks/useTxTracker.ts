'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { walletService } from '@/services/walletService';
import { TransactionResponse, TransactionStatus } from '@/types/transaction';

// ─── Constants ─────────────────────────────────────────────────────────────

/** Initial polling cadence in milliseconds. */
const POLL_INTERVAL = 3_000;

/** Upper bound on polling cadence after exponential back-off. */
const MAX_POLL_INTERVAL = 30_000;

/**
 * Grace period before the "Pending" badge is shown to the user (milliseconds).
 *
 * On fast networks the first API response often returns a terminal state
 * (SUCCESS / FAILED) before this timer fires, so the "Pending" badge is
 * **never rendered** and the user jumps straight from *loading* to the
 * terminal state — eliminating the backward flicker.
 */
const PENDING_DEBOUNCE_MS = 300;

// ─── Pure helpers ───────────────────────────────────────────────────────────

/**
 * Returns `true` for states that permanently end the polling loop.
 * Only SUCCESS and FAILED are terminal; CONFIRMED is an intermediate
 * state that still allows further status updates.
 */
function isTerminal(status: TransactionStatus | null | undefined): boolean {
  return status === 'SUCCESS' || status === 'FAILED';
}

/**
 * Calculates the next poll delay using exponential back-off.
 * The interval grows from POLL_INTERVAL up to MAX_POLL_INTERVAL.
 */
function nextDelay(pollCount: number): number {
  return Math.min(
    POLL_INTERVAL * Math.pow(1.5, Math.floor(pollCount / 3)),
    MAX_POLL_INTERVAL
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────

/**
 * useTxTracker — Race-condition-safe polling hook for Stellar transaction status.
 *
 * ### Architecture (Component → Hook → Service)
 * - **TransactionTracker** (component): pure presentation layer.
 * - **useTxTracker** (this hook): all async, timing, and state orchestration.
 * - **walletService.getTransactionStatus** (service): raw backend API call.
 *
 * ### The race condition this solves
 * React Query's built-in `refetchInterval` schedules the *next* poll before
 * the fresh response is committed to React state. On a fast network:
 *
 * ```
 * t=0     initial fetch → status: null (loading)
 * t=50ms  API returns SUCCESS
 * t=51ms  RQ schedules next poll for t=3051ms   ← interval already booked
 * t=52ms  React renders with SUCCESS ← correct
 * t=3051  extra fetch fires → isFetching=true → stale PENDING badge visible
 * t=3100  second SUCCESS response → badge corrects itself
 * ```
 *
 * ### Solution
 * We drive polling with a **recursive `setTimeout`** stored in a ref. After
 * each refetch, the callback checks the React Query cache *synchronously*
 * before scheduling the next tick. When a terminal state is present the loop
 * simply stops — no extra fetch is scheduled.
 *
 * ### Debounced PENDING display
 * `displayStatus` is only updated to `"PENDING"` after `PENDING_DEBOUNCE_MS`
 * of continuous observation. If a terminal state arrives before the debounce
 * fires, the timeout is cancelled and the user jumps directly from *loading*
 * to the terminal badge — no flicker.
 */
export function useTxTracker(transactionHash: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ['transaction', transactionHash] as const;

  // ── React Query — data layer only, polling is manual ──────────────────────
  const { data, isPending, error } = useQuery<TransactionResponse, Error>({
    queryKey,
    queryFn: async () => {
      if (!transactionHash) throw new Error('Transaction hash is required');
      return walletService.getTransactionStatus(transactionHash);
    },
    enabled: !!transactionHash,
    // Disable built-in polling; we own the timer via a ref.
    refetchInterval: false,
    staleTime: 2_000,
    gcTime: 300_000,
    // Note: retry and retryDelay are intentionally left to the QueryClient
    // defaultOptions so that tests can override them via the QueryClient
    // constructor without per-query config winning.
  });

  // ── Polling state refs ────────────────────────────────────────────────────
  /**
   * Holds the active setTimeout handle.
   * Written by schedulePoll, cleared by the status-watching effect and on unmount.
   */
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Back-off counter — how many polls have fired for the current hash. */
  const pollCountRef = useRef(0);
  /**
   * Flag that controls whether the polling loop continues.
   *
   * Setting it to `false` prevents `schedulePoll` from booking another tick,
   * even before the active timer fires and even before React has flushed the
   * new state. This is the key to the synchronous cancellation guarantee.
   */
  const shouldPollRef = useRef(false);

  // ── Debounced display status ───────────────────────────────────────────────
  const [displayStatus, setDisplayStatus] = useState<TransactionStatus | null>(null);
  const pendingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Stable refetch trigger ────────────────────────────────────────────────
  const triggerRefetch = useCallback((): void => {
    queryClient.invalidateQueries({ queryKey });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, transactionHash]);

  // ── Recursive polling loop ─────────────────────────────────────────────────
  const schedulePoll = useCallback((): void => {
    // Guard 1: explicit cancellation flag.
    if (!shouldPollRef.current) return;

    // Guard 2: check the cache synchronously so we stop even if the React
    // state update hasn't been flushed to the component yet.
    const cached = queryClient.getQueryData<TransactionResponse>(queryKey);
    if (isTerminal(cached?.status)) {
      shouldPollRef.current = false;
      return;
    }

    const delay = nextDelay(pollCountRef.current);

    timerRef.current = setTimeout(() => {
      // Re-check both guards inside the callback (state might have changed
      // while the timer was waiting).
      if (!shouldPollRef.current) return;

      const current = queryClient.getQueryData<TransactionResponse>(queryKey);
      if (isTerminal(current?.status)) {
        shouldPollRef.current = false;
        return;
      }

      pollCountRef.current += 1;
      triggerRefetch();

      // Schedule the *next* tick *after* firing the refetch.
      schedulePoll();
    }, delay);
  }, [queryClient, queryKey, triggerRefetch]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Start / restart polling when the hash changes ─────────────────────────
  useEffect(() => {
    // Tear down everything from the previous hash.
    shouldPollRef.current = false;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pollCountRef.current = 0;

    if (!transactionHash) return;

    // Don't start polling if the cache already has a terminal result.
    const cached = queryClient.getQueryData<TransactionResponse>(queryKey);
    if (isTerminal(cached?.status)) return;

    shouldPollRef.current = true;
    schedulePoll();

    return () => {
      shouldPollRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionHash]);

  // ── React to fresh status: stop timer + debounce PENDING ──────────────────
  useEffect(() => {
    const status = data?.status ?? null;

    if (isTerminal(status)) {
      // ① Immediately cancel the loop — no more requests.
      shouldPollRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      // ② Cancel any in-flight PENDING debounce.
      if (pendingDebounceRef.current) {
        clearTimeout(pendingDebounceRef.current);
        pendingDebounceRef.current = null;
      }
      // ③ Surface the terminal status to the UI immediately.
      setDisplayStatus(status);
      return;
    }

    if (status === 'CONFIRMED') {
      // CONFIRMED is intermediate: render immediately, keep polling.
      if (pendingDebounceRef.current) {
        clearTimeout(pendingDebounceRef.current);
        pendingDebounceRef.current = null;
      }
      setDisplayStatus('CONFIRMED');
      return;
    }

    if (status === 'PENDING') {
      // Only reveal PENDING after the debounce window to absorb micro-flickers.
      if (!pendingDebounceRef.current) {
        pendingDebounceRef.current = setTimeout(() => {
          pendingDebounceRef.current = null;
          setDisplayStatus('PENDING');
        }, PENDING_DEBOUNCE_MS);
      }
      return;
    }

    // null / undefined → initial load; leave displayStatus unchanged.
  }, [data?.status]);

  // ── Unmount cleanup ────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      shouldPollRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (pendingDebounceRef.current) {
        clearTimeout(pendingDebounceRef.current);
        pendingDebounceRef.current = null;
      }
    };
  }, []);

  // ── Derived values ─────────────────────────────────────────────────────────
  const isTerminalState = isTerminal(data?.status);
  const isPolling = shouldPollRef.current && !isTerminalState;

  return {
    /** The raw transaction hash from the latest API response (or null). */
    transactionHash: data?.transactionHash ?? null,
    /**
     * Debounced display status — safe to pass directly to the UI.
     * PENDING is held back for PENDING_DEBOUNCE_MS; terminal states
     * are surfaced immediately.
     */
    status: displayStatus,
    /** Human-readable status message from the backend. */
    message: data?.message ?? '',
    /** Full Stellar explorer URL for this transaction. */
    stellarExplorerUrl: data?.stellarExplorerUrl ?? '',
    /** True only during the very first fetch when no cached data exists. */
    isLoading: isPending && !!transactionHash,
    /** True while the polling loop is active (non-terminal state). */
    isPolling,
    /** Non-null when the last query ended in an error. */
    error: error?.message ?? null,
    /** True once SUCCESS or FAILED is confirmed; the polling loop has stopped. */
    isTerminalState,
  };
}
