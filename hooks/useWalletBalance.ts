import { useState, useEffect, useCallback } from 'react';
import { walletService } from '@/services/walletService';

export interface UseWalletBalanceResult {
  /** Current XLM balance fetched from the backend. Null while loading or on error. */
  balance: number | null;
  /** True while the balance request is in-flight. */
  isLoading: boolean;
  /** Error message if the request failed, otherwise null. */
  error: string | null;
  /**
   * Returns true when the balance is definitively known to be insufficient.
   * False when balance is null (still loading / unknown) — never blocks on uncertainty.
   */
  isInsufficient: (requiredAmount: number) => boolean;
  /** Manually re-fetch the balance. */
  refresh: () => void;
}

/**
 * useWalletBalance — fetches the XLM balance for the connected wallet.
 *
 * Follows the Component → Hook → Service pattern:
 *   BalanceCheck (component) → useWalletBalance (hook) → walletService (service)
 *
 * The submit button must only be disabled when the balance is *definitively*
 * lower than required — never when the balance is still loading or unknown.
 */
export function useWalletBalance(address: string | null): UseWalletBalanceResult {
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!address) {
      setBalance(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await walletService.getBalance(address);
      if (response.success) {
        setBalance(response.balance);
      } else {
        setError(response.message ?? 'Failed to fetch wallet balance');
        setBalance(null);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ?? 'An error occurred while fetching your balance'
      );
      setBalance(null);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  const isInsufficient = useCallback(
    (requiredAmount: number): boolean => {
      // Only block when balance is definitively known and too low.
      // When balance is null (loading or error) we do NOT block — uncertainty ≠ insufficient.
      if (balance === null) return false;
      return balance < requiredAmount;
    },
    [balance]
  );

  return {
    balance,
    isLoading,
    error,
    isInsufficient,
    refresh: fetchBalance,
  };
}