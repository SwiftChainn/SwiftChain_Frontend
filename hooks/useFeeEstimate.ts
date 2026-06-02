'use client';

import { useQuery } from '@tanstack/react-query';
import { feeService } from '@/services/feeService';
import { FeeEstimate } from '@/types/fee';

/**
 * useFeeEstimate — React Query hook for fetching XLM fee estimates.
 * 
 * Automatically fetches estimated fees when amount changes.
 * Caches results and handles loading/error states.
 * 
 * @param amount - Transaction amount to estimate fees for
 * @param currency - Currency code (defaults to 'USD')
 * @returns Query result with fee estimate data and loading states
 */
export function useFeeEstimate(amount: number | null, currency: string = 'USD') {
  const { data, isLoading, error, isFetching } = useQuery<FeeEstimate, Error>({
    queryKey: ['fee-estimate', amount, currency],
    queryFn: async () => {
      if (!amount || amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }
      return feeService.getEstimatedFee(amount, currency);
    },
    enabled: !!amount && amount > 0,
    // Cache fee estimates for 30 seconds (fees don't change frequently)
    staleTime: 30000,
    gcTime: 300000, // Keep in cache for 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  return {
    estimatedFee: data,
    estimatedXLMCost: data?.estimatedXLMCost ?? 0,
    baseFee: data?.baseFee ?? 0,
    networkFee: data?.networkFee ?? 0,
    platformFee: data?.platformFee ?? 0,
    totalAmount: data?.totalAmount ?? 0,
    isLoading,
    isFetching,
    error: error?.message ?? null,
  };
}
