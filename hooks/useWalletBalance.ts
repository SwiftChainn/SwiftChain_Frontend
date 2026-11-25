import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { walletService, type WalletBalance, type BalanceCheckResult } from '../services/walletService';

interface UseWalletBalanceOptions {
  requiredAmount?: number;
  autoFetch?: boolean;
  fetchOnMount?: boolean;
}

export function useWalletBalance({
  requiredAmount = 0,
  autoFetch = false,
  fetchOnMount = true,
}: UseWalletBalanceOptions = {}) {
  const [balance, setBalance] = useState<WalletBalance | null>(() => walletService.getCachedBalance());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mounted = useRef(true);
  const generation = useRef(0);

  const fetchBalance = useCallback(async (forceRefresh = false): Promise<void> => {
    const request = ++generation.current;
    setIsLoading(true);
    setError(null);
    try {
      const next = await walletService.fetchBalance(forceRefresh);
      if (mounted.current && generation.current === request) setBalance(next);
    } catch (cause) {
      if (mounted.current && generation.current === request) {
        setError(cause instanceof Error ? cause : new Error('Failed to fetch balance'));
        const cached = walletService.getCachedBalance();
        setBalance(cached);
      }
    } finally {
      if (mounted.current && generation.current === request) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    if (fetchOnMount || (autoFetch && requiredAmount > 0)) {
      // Start with the modal mount, independently of its animation lifecycle.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchBalance();
    }
    return () => {
      mounted.current = false;
      generation.current += 1;
    };
  }, [autoFetch, fetchOnMount, requiredAmount, fetchBalance]);

  const checkBalance = useCallback(async (amount: number): Promise<BalanceCheckResult> => {
    if (balance) {
      return { hasSufficientBalance: balance.available >= amount, balance, requiredAmount: amount };
    }
    const request = ++generation.current;
    try {
      const result = await walletService.checkSufficientBalance(amount);
      if (mounted.current && generation.current === request) setBalance(result.balance);
      return result;
    } finally {
      if (mounted.current && generation.current === request) setIsLoading(false);
    }
  }, [balance]);

  const hasSufficientBalance = useMemo(
    () => balance !== null && balance.available >= requiredAmount,
    [balance, requiredAmount],
  );
  const refetch = useCallback(() => fetchBalance(true), [fetchBalance]);

  return { balance, optimisticBalance: balance, isLoading, error, hasSufficientBalance, checkBalance, refetch };
}
