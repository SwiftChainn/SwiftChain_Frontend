'use client';

import { useState, useCallback, useRef } from 'react';
import { escrowActionsService } from '@/services/escrowActionsService';
import type { EscrowActionState } from '@/services/escrowActionsService';

export interface UseOptimisticEscrowReturn {
  /** Current escrow state (optimistically updated or last confirmed). */
  escrow: EscrowActionState | null;
  /** Whether an escrow action request is currently in flight. */
  isLoading: boolean;
  /** Whether the UI is showing an optimistic (unconfirmed) update. */
  isOptimistic: boolean;
  /** Error message from the most recent action, if any. */
  error: string | null;
  /** Optimistically lock the escrow for the given shipment. */
  lockEscrow: (shipmentId: string) => Promise<void>;
  /** Optimistically release the escrow for the given shipment. */
  releaseEscrow: (shipmentId: string) => Promise<void>;
  /** Roll back the UI to the last confirmed escrow state. */
  rollback: () => void;
  /** Reset all state. */
  reset: () => void;
}

/**
 * Hook that optimistically updates escrow lock/release state in the UI and
 * rolls back if the backend rejects the transaction.
 *
 * Follows the Component -> Hook -> Service layered architecture:
 * Component calls this hook; this hook calls escrowActionsService;
 * escrowActionsService calls the backend API.
 *
 * Exposes isOptimistic and rollback to consumers.
 */
export function useOptimisticEscrow(): UseOptimisticEscrowReturn {
  const [escrow, setEscrow] = useState<EscrowActionState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOptimistic, setIsOptimistic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previousEscrow = useRef<EscrowActionState | null>(null);

  const applyOptimisticUpdate = useCallback(
    (status: EscrowActionState['status'], shipmentId: string) => {
      setEscrow((prev) =>
        prev
          ? {
              ...prev,
              status,
              updatedAt: new Date().toISOString(),
            }
          : {
              id: 'optimistic-escrow',
              shipmentId,
              status,
              updatedAt: new Date().toISOString(),
            }
      );
    },
    []
  );

  const lockEscrow = useCallback(
    async (shipmentId: string) => {
      previousEscrow.current = escrow;
      setIsOptimistic(true);
      setIsLoading(true);
      setError(null);

      // Optimistically update UI before backend confirms
      applyOptimisticUpdate('Locked', shipmentId);

      try {
        const result = await escrowActionsService.lockEscrow(shipmentId);
        setEscrow(result);
        setIsOptimistic(false);
      } catch (err) {
        // Roll back UI state on backend error
        setEscrow(previousEscrow.current);
        setIsOptimistic(false);
        setError(
          err instanceof Error ? err.message : 'Failed to lock escrow'
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [escrow, applyOptimisticUpdate]
  );

  const releaseEscrow = useCallback(
    async (shipmentId: string) => {
      previousEscrow.current = escrow;
      setIsOptimistic(true);
      setIsLoading(true);
      setError(null);

      // Optimistically update UI before backend confirms
      applyOptimisticUpdate('Released', shipmentId);

      try {
        const result = await escrowActionsService.releaseEscrow(shipmentId);
        setEscrow(result);
        setIsOptimistic(false);
      } catch (err) {
        // Roll back UI state on backend error
        setEscrow(previousEscrow.current);
        setIsOptimistic(false);
        setError(
          err instanceof Error ? err.message : 'Failed to release escrow'
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [escrow, applyOptimisticUpdate]
  );

  const rollback = useCallback(() => {
    setEscrow(previousEscrow.current);
    setIsOptimistic(false);
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setEscrow(null);
    setIsLoading(false);
    setIsOptimistic(false);
    setError(null);
    previousEscrow.current = null;
  }, []);

  return {
    escrow,
    isLoading,
    isOptimistic,
    error,
    lockEscrow,
    releaseEscrow,
    rollback,
    reset,
  };
}

export default useOptimisticEscrow;
