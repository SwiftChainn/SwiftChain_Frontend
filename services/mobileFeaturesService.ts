import apiClient from '@/lib/httpClient';
import type { MobileFeatureCard } from '@/types/mobileFeatures';

export const mobileFeaturesService = {
  async getFeatures(signal?: AbortSignal): Promise<MobileFeatureCard[]> {
    const { data } = await apiClient.get<MobileFeatureCard[]>(
      '/api/mobile/features',
      { signal },
    );
    return data;
  },
};
