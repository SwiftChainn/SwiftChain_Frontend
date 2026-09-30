'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { analyticsService, type FleetPerformanceMetrics, type ROITrendDataPoint } from '@/services/analyticsService';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Calendar,
  Loader2,
  AlertCircle,
  RotateCcw,
  Download,
  TrendingRight,
} from 'lucide-react';

/**
 * Dynamically import recharts to reduce bundle size
 */
const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false });
const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const Legend = dynamic(() => import('recharts').then(mod => mod.Legend), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });

interface RoiDashboardProps {
  className?: string;
}

type DateRange = '7d' | '30d' | '90d' | '1y';

/**
 * RoiDashboard — Return on Investment Visualizations
 * 
 * Purpose:
 *   Comprehensive fleet ROI analytics dashboard with:
 *   - Key performance metrics (revenue, costs, profit, ROI)
 *   - Historical ROI trend visualization
 *   - Top/bottom performing vehicles
 *   - Cost vs revenue breakdown
 *   - Financial projections
 * 
 * Features:
 *   - Multiple date range filters (7d, 30d, 90d, 1y)
 *   - Interactive charts with tooltips
 *   - Real-time data updates
 *   - Export functionality
 *   - Responsive layout
 *   - Dark mode support
 *   - Loading skeletons
 *   - Error handling with retry
 * 
 * Charts:
 *   1. ROI Trend Line Chart — Historical ROI over time
 *   2. Revenue vs Costs Bar Chart — Comparative financial view
 *   3. Vehicle Performance Cards — Top/bottom performers
 * 
 * Usage:
 *   <RoiDashboard />
 */
export function RoiDashboard({ className = '' }: RoiDashboardProps) {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [metrics, setMetrics] = useState<FleetPerformanceMetrics | null>(null);
  const [trendData, setTrendData] = useState<ROITrendDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Calculate date range based on selection
   */
  const getDateRange = useCallback((range: DateRange) => {
    const endDate = new Date();
    const startDate = new Date();

    switch (range) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  }, []);

  /**
   * Fetch fleet metrics and trend data
   */
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { startDate, endDate } = getDateRange(dateRange);

      // Fetch metrics and trend data in parallel
      const [metricsData, trendAnalysis] = await Promise.all([
        analyticsService.getFleetPerformanceMetrics(startDate, endDate),
        analyticsService.getROITrend(startDate, endDate),
      ]);

      setMetrics(metricsData);
      setTrendData(trendAnalysis.dataPoints);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load ROI data';
      setError(message);
      console.error('Error fetching ROI data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, getDateRange]);

  /**
   * Retry data fetch
   */
  const handleRetry = useCallback(() => {
    void fetchData();
  }, [fetchData]);

  /**
   * Export data as CSV
   */
  const handleExport = useCallback(() => {
    if (!metrics || !trendData.length) return;

    const csvContent = [
      ['Date', 'ROI (%)', 'Revenue ($)', 'Costs ($)', 'Profit ($)'].join(','),
      ...trendData.map(point =>
        [point.date, point.roi, point.revenue, point.costs, point.profit].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roi-report-${dateRange}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [metrics, trendData, dateRange]);

  /**
   * Format currency
   */
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  /**
   * Format percentage
   */
  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  // Fetch data on mount and when date range changes
  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  /**
   * Loading state
   */
  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <p className="text-lg font-medium text-slate-700 dark:text-slate-300">
            Loading ROI analytics...
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
            />
          ))}
        </div>
      </div>
    );
  }

  /**
   * Error state
   */
  if (error) {
    return (
      <div className={`rounded-xl border border-red-200 bg-red-50 p-8 dark:border-red-800 dark:bg-red-900/20 ${className}`}>
        <div className="flex items-start gap-4">
          <AlertCircle className="mt-1 h-6 w-6 flex-shrink-0 text-red-600 dark:text-red-400" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-200">
              Failed to load ROI analytics
            </h3>
            <p className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</p>
            <button
              onClick={handleRetry}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              <RotateCcw className="h-4 w-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">ROI Dashboard</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Fleet return on investment analytics and trends
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Range Selector */}
          <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white p-1 dark:border-slate-600 dark:bg-slate-800">
            {(['7d', '30d', '90d', '1y'] as DateRange[]).map(range => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  dateRange === range
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {range === '1y' ? '1 Year' : range.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(metrics.totalFleetRevenue)}
          icon={<DollarSign className="h-5 w-5" />}
          trend={metrics.totalFleetRevenue > 0 ? 'up' : 'neutral'}
          color="green"
        />
        <MetricCard
          title="Total Costs"
          value={formatCurrency(metrics.totalFleetCosts)}
          icon={<DollarSign className="h-5 w-5" />}
          trend={metrics.totalFleetCosts > 0 ? 'down' : 'neutral'}
          color="red"
        />
        <MetricCard
          title="Net Profit"
          value={formatCurrency(metrics.totalFleetProfit)}
          icon={<DollarSign className="h-5 w-5" />}
          trend={metrics.totalFleetProfit > 0 ? 'up' : 'down'}
          color={metrics.totalFleetProfit > 0 ? 'green' : 'red'}
        />
        <MetricCard
          title="Average ROI"
          value={formatPercent(metrics.averageROI)}
          icon={<Percent className="h-5 w-5" />}
          trend={metrics.averageROI > 0 ? 'up' : 'down'}
          color={metrics.averageROI > 0 ? 'green' : 'red'}
        />
      </div>

      {/* ROI Trend Chart */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-6 text-lg font-semibold text-slate-900 dark:text-white">
          ROI Trend Over Time
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
            <XAxis 
              dataKey="date" 
              className="text-xs text-slate-600 dark:text-slate-400"
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            />
            <YAxis className="text-xs text-slate-600 dark:text-slate-400" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
              }}
              formatter={(value: number) => formatPercent(value)}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="roi"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 4 }}
              name="ROI (%)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue vs Costs Chart */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-6 text-lg font-semibold text-slate-900 dark:text-white">
          Revenue vs Costs
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
            <XAxis 
              dataKey="date" 
              className="text-xs text-slate-600 dark:text-slate-400"
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            />
            <YAxis className="text-xs text-slate-600 dark:text-slate-400" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
              }}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Legend />
            <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
            <Bar dataKey="costs" fill="#ef4444" name="Costs" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top/Bottom Performers */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Performers */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
            Top Performing Vehicles
          </h3>
          <div className="space-y-3">
            {metrics.topPerformingVehicles.slice(0, 5).map((vehicle, index) => (
              <VehicleCard key={vehicle.vehicleId} vehicle={vehicle} rank={index + 1} type="top" />
            ))}
          </div>
        </div>

        {/* Bottom Performers */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
            Underperforming Vehicles
          </h3>
          <div className="space-y-3">
            {metrics.underperformingVehicles.slice(0, 5).map((vehicle, index) => (
              <VehicleCard key={vehicle.vehicleId} vehicle={vehicle} rank={index + 1} type="bottom" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Metric Card Component
 */
interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend: 'up' | 'down' | 'neutral';
  color: 'green' | 'red' | 'blue';
}

function MetricCard({ title, value, icon, trend, color }: MetricCardProps) {
  const colorClasses = {
    green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : TrendingRight;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div className={`rounded-lg p-3 ${colorClasses[color]}`}>
          {icon}
        </div>
        <TrendIcon className={`h-5 w-5 ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-slate-400'}`} />
      </div>
      <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-400">{title}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

/**
 * Vehicle Card Component
 */
interface VehicleCardProps {
  vehicle: any;
  rank: number;
  type: 'top' | 'bottom';
}

function VehicleCard({ vehicle, rank, type }: VehicleCardProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);

  return (
    <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
        type === 'top' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      }`}>
        {rank}
      </div>
      <div className="flex-1">
        <p className="font-medium text-slate-900 dark:text-white">{vehicle.vehicleName}</p>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          ROI: {vehicle.roi.toFixed(2)}% • Profit: {formatCurrency(vehicle.netProfit)}
        </p>
      </div>
    </div>
  );
}
