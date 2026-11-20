import apiClient from '@/lib/httpClient';
import type { MobileHeroContent } from '@/types/mobileHero';

export const mobileHeroService = {
  async getContent(signal?: AbortSignal): Promise<MobileHeroContent> {
    const { data } = await apiClient.get<MobileHeroContent>(
      '/api/mobile/hero-content',
      { signal },
    );
    return data;
  },
};
