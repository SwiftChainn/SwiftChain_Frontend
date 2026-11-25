/**
 * useLocalizedFiatPreview — Hook layer for live NGN/USD equivalents of an XLM amount.
 *
 * Fetches (and caches) the current NGN and USD rates per XLM, then computes
 * the localized fiat equivalents for the given amount on every render so the
 * display updates instantly as the caller's XLM amount changes.
 *
 * Architecture: Component -> useLocalizedFiatPreview (Hook) ->
 *              localizedFxService -> currencyRateService -> Backend
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import {
  localizedFxService,
  formatLocalizedAmount,
  SUPPORTED_FIAT_CODES,
  type SupportedFiatCode,
} from '@/services/localizedFxService';

const REFETCH_INTERVAL_MS = 60_000; // matches the service cache TTL

export interface LocalizedFiatEquivalent {
  fiatCode: SupportedFiatCode;
  /** Formatted currency string, e.g. "₦25,000.00". Empty string when unavailable. */
  formatted: string;
  isLoading: boolean;
  isError: boolean;
}

export interface UseLocalizedFiatPreviewResult {
  equivalents: LocalizedFiatEquivalent[];
  /** NGN rate per XLM, for the "Rate: 1 XLM = …" line. null when unavailable. */
  ngnRate: number | null;
  /** ISO 8601 timestamp of the freshest rate. null when unavailable. */
  rateUpdatedAt: string | null;
  isLoading: boolean;
  /** True when either currency's rate fetch failed. */
  isError: boolean;
}

/**
 * @param xlmAmount - The XLM amount to convert. Non-positive values resolve
 *                    to unavailable equivalents rather than fetching.
 */
export function useLocalizedFiatPreview(xlmAmount: number): UseLocalizedFiatPreviewResult {
  const isValidAmount = Number.isFinite(xlmAmount) && xlmAmount > 0;

  const ngnQuery = useQuery({
    queryKey: ['localized-fx-rate', 'NGN'],
    queryFn: () => localizedFxService.getRate('NGN'),
    enabled: isValidAmount,
    refetchInterval: REFETCH_INTERVAL_MS,
    staleTime: REFETCH_INTERVAL_MS,
    retry: false,
  });

  const usdQuery = useQuery({
    queryKey: ['localized-fx-rate', 'USD'],
    queryFn: () => localizedFxService.getRate('USD'),
    enabled: isValidAmount,
    refetchInterval: REFETCH_INTERVAL_MS,
    staleTime: REFETCH_INTERVAL_MS,
    retry: false,
  });

  const queriesByFiat = { NGN: ngnQuery, USD: usdQuery } as const;

  const equivalents: LocalizedFiatEquivalent[] = SUPPORTED_FIAT_CODES.map((fiatCode) => {
    const query = queriesByFiat[fiatCode];
    const rate = query.data?.ratePerXlm;
    const amount =
      isValidAmount && typeof rate === 'number' && rate > 0 ? xlmAmount * rate : null;

    return {
      fiatCode,
      formatted: amount !== null ? formatLocalizedAmount(amount, fiatCode) : '',
      isLoading: query.isLoading,
      isError: query.isError,
    };
  });

  // Freshest timestamp across both currencies, for the "Updated …" line.
  const rateUpdatedAt =
    [ngnQuery.data?.updatedAt, usdQuery.data?.updatedAt]
      .filter((value): value is string => typeof value === 'string')
      .sort()
      .at(-1) ?? null;

  return {
    equivalents,
    ngnRate: ngnQuery.data?.ratePerXlm ?? null,
    rateUpdatedAt,
    isLoading: ngnQuery.isLoading || usdQuery.isLoading,
    isError: ngnQuery.isError || usdQuery.isError,
  };
}
