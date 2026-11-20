'use client';

import dynamic from 'next/dynamic';
import { useRequireRole } from '@/hooks/useRequireRole';

function AnalyticsPanelLoading({ label }: { label: string }) {
  return (
    <section
      className="min-h-80 animate-pulse rounded-md border border-gray-200 bg-white p-6"
      role="status"
      aria-label={`Loading ${label}`}
    >
      <div className="mb-6 h-6 w-48 rounded bg-gray-200" />
      <div className="h-56 rounded bg-gray-100" />
    </section>
  );
}

const FleetAnalyticsDashboard = dynamic(
  () =>
    import('@/components/dashboard/FleetAnalyticsDashboard').then(
      (module) => module.FleetAnalyticsDashboard
    ),
  { loading: () => <AnalyticsPanelLoading label="fleet analytics" /> }
);

const PerformanceMetricsDashboard = dynamic(
  () =>
    import('@/components/dashboard/PerformanceMetricsDashboard').then(
      (module) => module.PerformanceMetricsDashboard
    ),
  { loading: () => <AnalyticsPanelLoading label="performance metrics" /> }
);

export default function FleetAnalyticsPage() {
  const { isAuthorized } = useRequireRole('Fleet Operator');

  if (!isAuthorized) {
    return (
      <main className="p-6">
        <p className="text-sm text-gray-500" role="status">
          Verifying access…
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-12 p-4 sm:p-6">
      <FleetAnalyticsDashboard />
      <PerformanceMetricsDashboard />
    </main>
  );
}
