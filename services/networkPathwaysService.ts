import apiClient from '@/lib/httpClient';
import type { NetworkPathwayCard } from '@/types/networkPathways';

export const networkPathwaysService = {
  async getCards(signal?: AbortSignal): Promise<NetworkPathwayCard[]> {
    const { data } = await apiClient.get<NetworkPathwayCard[]>(
      '/api/landing/network-pathways',
      { signal },
    );
    return data;
  },
};
