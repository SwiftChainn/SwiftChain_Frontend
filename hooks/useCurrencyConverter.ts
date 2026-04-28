'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { currencyRateService } from '@/services/currencyRateService';

const REFRESH_INTERVAL_MS = 30_000;

export function useCurrencyConverter() {
  const [fiatCode, setFiatCode] = useState('USD');
  const [fiatAmount, setFiatAmount] = useState('0');

  const rateQuery = useQuery({
    queryKey: ['xlm-rate', fiatCode],
    queryFn: () => currencyRateService.getXlmRate(fiatCode),
    refetchInterval: REFRESH_INTERVAL_MS,
    retry: false,
  });

  const parsedFiatAmount = useMemo(() => {
    const value = Number(fiatAmount);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }, [fiatAmount]);

  const xlmEstimate = useMemo(() => {
    const rate = rateQuery.data?.xlmRate;
    if (typeof rate !== 'number' || rate <= 0) {
      return null;
    }
    return parsedFiatAmount / rate;
  }, [parsedFiatAmount, rateQuery.data?.xlmRate]);

  return {
    fiatCode,
    setFiatCode,
    fiatAmount,
    setFiatAmount,
    rate: rateQuery.data?.xlmRate ?? null,
    lastUpdated: rateQuery.data?.updatedAt ?? null,
    xlmEstimate,
    isLoading: rateQuery.isLoading,
    isError: rateQuery.isError,
    refetch: rateQuery.refetch,
  };
}
