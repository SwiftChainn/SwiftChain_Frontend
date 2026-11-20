import apiClient from '@/lib/httpClient';
import type {
  AnalyticsPeriod,
  AnalyticsResponse,
  FleetAnalytics,
  PerformanceMetrics,
} from '@/types/analytics';

export const analyticsService = {
  async getFleetAnalytics(
    period: AnalyticsPeriod = '30d',
    signal?: AbortSignal
  ): Promise<AnalyticsResponse> {
    const { data } = await apiClient.get<AnalyticsResponse>('/fleet/analytics', {
      params: { period },
      signal,
    });
    return data;
  },
};

export function emptyFleetAnalytics(period: AnalyticsPeriod): FleetAnalytics {
  return {
    period,
    utilizationRate: 0,
    onTimeRate: 0,
    totalMiles: 0,
    fuelEfficiency: 0,
    costPerMile: 0,
    activeVehicles: 0,
    totalVehicles: 0,
    utilizationTrend: [],
    deliveryTrend: [],
    statusBreakdown: [],
    recentEvents: [],
  };
}

export function emptyPerformanceMetrics(): PerformanceMetrics {
  return {
    averageDeliveryTime: 0,
    deliverySuccessRate: 0,
    customerSatisfaction: 0,
    operatingCost: 0,
    activeDeliveries: 0,
    completedDeliveries: 0,
    performanceTrend: [],
    costTrend: [],
  };
}
