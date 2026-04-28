import { useQuery } from '@tanstack/react-query';
import { faqService, type FaqResponse } from '@/services/faqService';

export const FAQ_QUERY_KEY = ['faq'] as const;

export interface UseFaqReturn {
  categories: FaqResponse;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

/**
 * useFaq — fetches FAQ categories and items from the backend API.
 * Wraps faqService with TanStack Query for caching and loading states.
 */
export function useFaq(): UseFaqReturn {
  const { data, isLoading, isError, error } = useQuery<FaqResponse, Error>({
    queryKey: FAQ_QUERY_KEY,
    queryFn: faqService.getFaqs,
  });

  return {
    categories: data ?? [],
    isLoading,
    isError,
    error: error ?? null,
  };
}