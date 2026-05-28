'use client';

import { useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DeliveryFilterParams, FilterState } from '@/types/filters';

export function useDeliveryFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Extract filter state from URL query params
  const filterState = useMemo<FilterState>(() => {
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const sortBy = (searchParams.get('sortBy') as 'date-asc' | 'date-desc') || undefined;

    const hasActiveFilters = !!(search || status || sortBy);

    return {
      search,
      status,
      sortBy,
      hasActiveFilters,
    };
  }, [searchParams]);

  // Update URL query params
  const updateFilters = useCallback(
    (params: Partial<DeliveryFilterParams>) => {
      const newParams = new URLSearchParams(searchParams);

      // Update or remove each parameter
      if (params.search !== undefined) {
        if (params.search) {
          newParams.set('search', params.search);
        } else {
          newParams.delete('search');
        }
      }

      if (params.status !== undefined) {
        if (params.status) {
          newParams.set('status', params.status);
        } else {
          newParams.delete('status');
        }
      }

      if (params.sortBy !== undefined) {
        if (params.sortBy) {
          newParams.set('sortBy', params.sortBy);
        } else {
          newParams.delete('sortBy');
        }
      }

      // Update router with new query params
      const queryString = newParams.toString();
      const href = queryString ? `?${queryString}` : '';
      router.push(href, { scroll: false });
    },
    [searchParams, router]
  );

  // Clear all filters
  const clearFilters = useCallback(() => {
    router.push('', { scroll: false });
  }, [router]);

  return {
    ...filterState,
    updateFilters,
    clearFilters,
  };
}
