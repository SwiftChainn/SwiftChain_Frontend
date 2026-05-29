import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { escrowService, LockEscrowParams, LockEscrowResponse } from '@/services/escrowService';

interface UseEscrowLockReturn {
  isLoading: boolean;
  error: string | null;
  escrowId: string | null;
  transactionHash: string | null;
  lockEscrow: (params: LockEscrowParams) => Promise<void>;
  reset: () => void;
}

/**
 * useEscrowLock — manages the escrow fund locking flow.
 *
 * Handles:
 *   1. API request to lock funds in escrow
 *   2. Loading state management
 *   3. Error handling with toast notifications
 *   4. Success state with transaction hash
 *
 * Components use this hook to lock escrow payments for deliveries.
 * The hook calls escrowService; the component never calls the service directly.
 */
export function useEscrowLock(): UseEscrowLockReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [escrowId, setEscrowId] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  const lockEscrow = useCallback(async (params: LockEscrowParams): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response: LockEscrowResponse = await escrowService.lockEscrow(params);

      if (!response.success) {
        const errorMessage = response.message ?? 'Failed to lock escrow. Please try again.';
        setError(errorMessage);
        toast.error(errorMessage);
        return;
      }

      setEscrowId(response.escrowId ?? null);
      setTransactionHash(response.transactionHash ?? null);

      toast.success(
        response.transactionHash
          ? `Escrow locked! Tx: ${response.transactionHash.slice(0, 12)}…`
          : 'Escrow payment locked successfully!'
      );
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while locking escrow. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setEscrowId(null);
    setTransactionHash(null);
  }, []);

  return {
    isLoading,
    error,
    escrowId,
    transactionHash,
    lockEscrow,
    reset,
  };
}
