import { apiClient } from './api';

/**
 * Fleet ROI Metrics Interface
 */
export interface FleetROIMetrics {
  vehicleId: string;
  vehicleName: string;
  totalRevenue: number;
  totalCosts: number;
  netProfit: number;
  roi: number; // Return on Investment percentage
  utilizationRate: number; // Percentage of time vehicle is actively used
  deliveriesCompleted: number;
  averageDeliveryValue: number;
  maintenanceCosts: number;
  fuelCosts: number;
  operationalCosts: number;
  period: {
    startDate: string;
    endDate: string;
  };
}

/**
 * Aggregated Fleet Performance Metrics
 */
export interface FleetPerformanceMetrics {
  totalFleetRevenue: number;
  totalFleetCosts: number;
  totalFleetProfit: number;
  averageROI: number;
  totalDeliveries: number;
  averageUtilizationRate: number;
  topPerformingVehicles: FleetROIMetrics[];
  underperformingVehicles: FleetROIMetrics[];
  period: {
    startDate: string;
    endDate: string;
  };
}

/**
 * ROI Trend Data Point
 */
export interface ROITrendDataPoint {
  date: string;
  roi: number;
  revenue: number;
  costs: number;
  profit: number;
}

/**
 * ROI Trend Analysis
 */
export interface ROITrendAnalysis {
  vehicleId?: string;
  fleetwide: boolean;
  dataPoints: ROITrendDataPoint[];
  trend: 'increasing' | 'decreasing' | 'stable';
  projectedROI: number;
  period: {
    startDate: string;
    endDate: string;
  };
}

/**
 * Cost Breakdown by Category
 */
export interface CostBreakdown {
  fuel: number;
  maintenance: number;
  insurance: number;
  depreciation: number;
  operations: number;
  other: number;
  total: number;
}

/**
 * Revenue Breakdown by Source
 */
export interface RevenueBreakdown {
  deliveries: number;
  premiumServices: number;
  insurance: number;
  other: number;
  total: number;
}

/**
 * Financial Summary
 */
export interface FinancialSummary {
  revenue: RevenueBreakdown;
  costs: CostBreakdown;
  profit: number;
  roi: number;
  period: {
    startDate: string;
    endDate: string;
  };
}

/**
 * API Response Wrapper
 */
interface APIResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * AnalyticsService — Fleet ROI and Metrics API Integration
 * 
 * Purpose:
 *   Provides comprehensive analytics for fleet management, including:
 *   - Individual vehicle ROI calculations
 *   - Fleet-wide performance aggregations
 *   - Historical trend analysis and projections
 *   - Cost and revenue breakdowns
 * 
 * Architecture:
 *   - Singleton pattern for consistent caching
 *   - Built-in cache invalidation strategies
 *   - Optimistic data fetching with fallback
 *   - Type-safe API responses
 * 
 * Usage:
 *   import { analyticsService } from '@/services/analyticsService';
 *   
 *   const metrics = await analyticsService.getFleetPerformanceMetrics(
 *     '2024-01-01',
 *     '2024-12-31'
 *   );
 */
class AnalyticsService {
  private static instance: AnalyticsService;
  
  // Cache configuration
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private cache: Map<string, { data: any; timestamp: number }> = new Map();

  private constructor() {}

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  /**
   * Get ROI metrics for a specific vehicle
   * 
   * @param vehicleId - Unique vehicle identifier
   * @param startDate - Start of analysis period (ISO 8601)
   * @param endDate - End of analysis period (ISO 8601)
   * @returns Vehicle-specific ROI metrics
   */
  async getVehicleROIMetrics(
    vehicleId: string,
    startDate: string,
    endDate: string
  ): Promise<FleetROIMetrics> {
    const cacheKey = `vehicle-roi-${vehicleId}-${startDate}-${endDate}`;
    const cached = this.getFromCache<FleetROIMetrics>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await apiClient.get<APIResponse<FleetROIMetrics>>(
        `/analytics/fleet/vehicle/${vehicleId}/roi`,
        {
          params: { startDate, endDate },
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch vehicle ROI metrics');
      }

      const metrics = response.data.data;
      this.setCache(cacheKey, metrics);
      
      return metrics;
    } catch (error) {
      console.error(`Error fetching ROI metrics for vehicle ${vehicleId}:`, error);
      throw error;
    }
  }

  /**
   * Get aggregated performance metrics for entire fleet
   * 
   * @param startDate - Start of analysis period (ISO 8601)
   * @param endDate - End of analysis period (ISO 8601)
   * @returns Fleet-wide performance metrics
   */
  async getFleetPerformanceMetrics(
    startDate: string,
    endDate: string
  ): Promise<FleetPerformanceMetrics> {
    const cacheKey = `fleet-performance-${startDate}-${endDate}`;
    const cached = this.getFromCache<FleetPerformanceMetrics>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await apiClient.get<APIResponse<FleetPerformanceMetrics>>(
        '/analytics/fleet/performance',
        {
          params: { startDate, endDate },
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch fleet performance metrics');
      }

      const metrics = response.data.data;
      this.setCache(cacheKey, metrics);
      
      return metrics;
    } catch (error) {
      console.error('Error fetching fleet performance metrics:', error);
      throw error;
    }
  }

  /**
   * Get ROI trend analysis over time
   * 
   * @param startDate - Start of analysis period (ISO 8601)
   * @param endDate - End of analysis period (ISO 8601)
   * @param vehicleId - Optional vehicle ID for vehicle-specific trends
   * @returns Historical ROI trend with projections
   */
  async getROITrend(
    startDate: string,
    endDate: string,
    vehicleId?: string
  ): Promise<ROITrendAnalysis> {
    const cacheKey = `roi-trend-${vehicleId || 'fleet'}-${startDate}-${endDate}`;
    const cached = this.getFromCache<ROITrendAnalysis>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const endpoint = vehicleId 
        ? `/analytics/fleet/vehicle/${vehicleId}/roi-trend`
        : '/analytics/fleet/roi-trend';

      const response = await apiClient.get<APIResponse<ROITrendAnalysis>>(
        endpoint,
        {
          params: { startDate, endDate },
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch ROI trend');
      }

      const trend = response.data.data;
      this.setCache(cacheKey, trend);
      
      return trend;
    } catch (error) {
      console.error('Error fetching ROI trend:', error);
      throw error;
    }
  }

  /**
   * Get detailed financial summary with cost and revenue breakdowns
   * 
   * @param startDate - Start of analysis period (ISO 8601)
   * @param endDate - End of analysis period (ISO 8601)
   * @param vehicleId - Optional vehicle ID for vehicle-specific summary
   * @returns Comprehensive financial summary
   */
  async getFinancialSummary(
    startDate: string,
    endDate: string,
    vehicleId?: string
  ): Promise<FinancialSummary> {
    const cacheKey = `financial-summary-${vehicleId || 'fleet'}-${startDate}-${endDate}`;
    const cached = this.getFromCache<FinancialSummary>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const endpoint = vehicleId 
        ? `/analytics/fleet/vehicle/${vehicleId}/financial-summary`
        : '/analytics/fleet/financial-summary';

      const response = await apiClient.get<APIResponse<FinancialSummary>>(
        endpoint,
        {
          params: { startDate, endDate },
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch financial summary');
      }

      const summary = response.data.data;
      this.setCache(cacheKey, summary);
      
      return summary;
    } catch (error) {
      console.error('Error fetching financial summary:', error);
      throw error;
    }
  }

  /**
   * Get cost breakdown by category
   * 
   * @param startDate - Start of analysis period (ISO 8601)
   * @param endDate - End of analysis period (ISO 8601)
   * @param vehicleId - Optional vehicle ID for vehicle-specific costs
   * @returns Detailed cost breakdown
   */
  async getCostBreakdown(
    startDate: string,
    endDate: string,
    vehicleId?: string
  ): Promise<CostBreakdown> {
    const cacheKey = `cost-breakdown-${vehicleId || 'fleet'}-${startDate}-${endDate}`;
    const cached = this.getFromCache<CostBreakdown>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const endpoint = vehicleId 
        ? `/analytics/fleet/vehicle/${vehicleId}/costs`
        : '/analytics/fleet/costs';

      const response = await apiClient.get<APIResponse<CostBreakdown>>(
        endpoint,
        {
          params: { startDate, endDate },
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch cost breakdown');
      }

      const breakdown = response.data.data;
      this.setCache(cacheKey, breakdown);
      
      return breakdown;
    } catch (error) {
      console.error('Error fetching cost breakdown:', error);
      throw error;
    }
  }

  /**
   * Get revenue breakdown by source
   * 
   * @param startDate - Start of analysis period (ISO 8601)
   * @param endDate - End of analysis period (ISO 8601)
   * @param vehicleId - Optional vehicle ID for vehicle-specific revenue
   * @returns Detailed revenue breakdown
   */
  async getRevenueBreakdown(
    startDate: string,
    endDate: string,
    vehicleId?: string
  ): Promise<RevenueBreakdown> {
    const cacheKey = `revenue-breakdown-${vehicleId || 'fleet'}-${startDate}-${endDate}`;
    const cached = this.getFromCache<RevenueBreakdown>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const endpoint = vehicleId 
        ? `/analytics/fleet/vehicle/${vehicleId}/revenue`
        : '/analytics/fleet/revenue';

      const response = await apiClient.get<APIResponse<RevenueBreakdown>>(
        endpoint,
        {
          params: { startDate, endDate },
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch revenue breakdown');
      }

      const breakdown = response.data.data;
      this.setCache(cacheKey, breakdown);
      
      return breakdown;
    } catch (error) {
      console.error('Error fetching revenue breakdown:', error);
      throw error;
    }
  }

  /**
   * Compare multiple vehicles by ROI
   * 
   * @param vehicleIds - Array of vehicle IDs to compare
   * @param startDate - Start of analysis period (ISO 8601)
   * @param endDate - End of analysis period (ISO 8601)
   * @returns Array of ROI metrics for comparison
   */
  async compareVehicles(
    vehicleIds: string[],
    startDate: string,
    endDate: string
  ): Promise<FleetROIMetrics[]> {
    try {
      const promises = vehicleIds.map(id => 
        this.getVehicleROIMetrics(id, startDate, endDate)
      );
      
      return await Promise.all(promises);
    } catch (error) {
      console.error('Error comparing vehicles:', error);
      throw error;
    }
  }

  /**
   * Invalidate cache for specific key or all cache
   * 
   * @param key - Optional specific cache key to invalidate
   */
  invalidateCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get data from cache if valid
   */
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }

    const isExpired = Date.now() - cached.timestamp > this.CACHE_DURATION;
    
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  /**
   * Set data in cache
   */
  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear expired cache entries
   */
  cleanCache(): void {
    const now = Date.now();
    
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_DURATION) {
        this.cache.delete(key);
      }
    }
  }
}

export const analyticsService = AnalyticsService.getInstance();
