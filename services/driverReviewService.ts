import apiClient from '@/lib/httpClient';
import type {
  DriverReputationScore,
  DriverReviewsPage,
  DriverReviewsQuery,
} from '@/types/driverReview';

export const driverReviewService = {
  async getDriverReviews(
    driverId: string,
    query: DriverReviewsQuery,
    signal?: AbortSignal,
  ): Promise<DriverReviewsPage> {
    const { data } = await apiClient.get<DriverReviewsPage>(
      `/api/fleet/drivers/${driverId}/reviews`,
      {
        params: {
          page: query.page,
          pageSize: query.pageSize,
          sort: query.sort,
          dateRange: query.dateRange,
          verifiedOnly: query.verifiedOnly,
          ...(query.minRating ? { minRating: query.minRating } : {}),
        },
        signal,
      },
    );
    return data;
  },

  async getDriverReputation(
    driverId: string,
    signal?: AbortSignal,
  ): Promise<DriverReputationScore> {
    const { data } = await apiClient.get<DriverReputationScore>(
      `/api/fleet/drivers/${driverId}/reputation`,
      { signal },
    );
    return data;
  },
};
