'use client';

import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { useCurrency } from '@/context/CurrencyContext';
import { StatisticsLayout } from './StatisticsLayout';

/** Backend data flows through the dashboard hook and service. */
export function Statistics() {
  const { stats, isLoading, isError, refetch } = useAdminDashboard();
  const { formatCurrency, isLoading: isCurrencyLoading } = useCurrency();
  return <StatisticsLayout stats={stats ?? undefined} isLoading={isLoading}
    isCurrencyLoading={isCurrencyLoading} isError={isError}
    onRefresh={() => { void refetch(); }} formatCurrency={formatCurrency} />;
}
