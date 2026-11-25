'use client';

import {
  Users,
  Package,
  DollarSign,
  Truck,
  ShieldCheck,
  Lock,
  RefreshCw,
  AlertCircle,
  type LucideIcon,
} from 'lucide-react';
import type { AdminStats } from '@/services/adminService';


/**
 * Presentation config for each statistic card. `key` maps to a field on the
 * AdminStats payload returned by the backend — no mock values are defined here,
 * only labels and icons. Ordering here drives the on-screen order.
 */
const STAT_CARDS: ReadonlyArray<{
  key: keyof AdminStats;
  label: string;
  icon: LucideIcon;
  monetary?: boolean;
}> = [
  { key: 'totalUsers', label: 'Total Users', icon: Users },
  { key: 'activeDeliveries', label: 'Active Deliveries', icon: Package },
  { key: 'totalRevenue', label: 'Total Revenue', icon: DollarSign, monetary: true },
  { key: 'activeDrivers', label: 'Active Drivers', icon: Truck },
  { key: 'pendingKyc', label: 'Pending KYC', icon: ShieldCheck },
  { key: 'escrowLocked', label: 'Escrow Locked', icon: Lock, monetary: true },
];

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  isLoading: boolean;
}

/**
 * StatCard — renders a single statistic. The loading skeleton and the final
 * value are rendered through this SAME element, so their box dimensions are
 * guaranteed identical and the grid cannot reflow when data lands.
 *
 * Loading and loaded data use the same reserved boxes:
 *   1. The card and grid row reserve a fixed height of 8.5rem.
 *   2. The value slot reserves the exact skeleton dimensions
 *      (a full-width, 2rem-high slot for both skeleton and loaded value).
 */
function StatCard({ label, value, icon: Icon, isLoading }: StatCardProps) {
  return (
    <div className="flex h-[8.5rem] min-h-[8.5rem] w-full min-w-0 flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <div className="rounded-lg bg-blue-50 p-2 dark:bg-blue-900/30">
          <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
      </div>

      {/* Value slot — hardcoded min dimensions matching the skeleton bar so the
          number and the loader occupy the exact same box (zero shift on swap). */}
      <div className="flex h-8 min-h-8 w-full min-w-0 items-center">
        {isLoading ? (
          <div className="h-8 w-full animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" />
        ) : (
          <p title={value} className="w-full truncate text-2xl font-bold leading-8 tabular-nums text-slate-900 dark:text-white">
            {value}
          </p>
        )}
      </div>
    </div>
  );
}

interface StatisticsLayoutProps {
  stats?: AdminStats;
  isLoading: boolean;
  isCurrencyLoading?: boolean;
  isError?: boolean;
  onRefresh?: () => void;
  formatCurrency: (value: number) => string;
}

export function StatisticsLayout({ stats, isLoading, isCurrencyLoading = false, isError = false, onRefresh, formatCurrency }: StatisticsLayoutProps) {
  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Statistics</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Platform-wide metrics and activity summary
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {isError && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Failed to load statistics. Please refresh or try again later.
        </div>
      )}

      <div
        role="group"
        aria-label="Platform statistics"
        aria-busy={isLoading || isCurrencyLoading}
        className="grid min-h-[56rem] w-full min-w-0 auto-rows-[8.5rem] gap-4 sm:min-h-[27.5rem] sm:grid-cols-2 lg:min-h-[18rem] lg:grid-cols-3"
      >
        {STAT_CARDS.map(({ key, label, icon, monetary }) => (
          <StatCard
            key={key}
            label={label}
            value={
              monetary
                ? formatCurrency(stats?.[key] ?? 0)
                : (stats?.[key] ?? 0).toLocaleString()
            }
            icon={icon}
            isLoading={isLoading || (Boolean(monetary) && isCurrencyLoading)}
          />
        ))}
      </div>
    </section>
  );
}

export function StatisticsSkeleton() {
  return <StatisticsLayout isLoading formatCurrency={String} />;
}
