'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  globalSearchService,
  SEARCH_CATEGORIES,
  SEARCH_CATEGORY_LABELS,
  type SearchCategory,
  type SearchResult,
} from '@/services/globalSearchService';

/** Delay after the last keystroke before the unified search API is called. */
export const GLOBAL_SEARCH_DEBOUNCE_MS = 300;

export interface SearchResultGroup {
  category: SearchCategory;
  label: string;
  results: SearchResult[];
}

export interface UseGlobalSearchResult {
  query: string;
  setQuery: (_query: string) => void;
  /** Non-empty categories, always in Deliveries / Drivers / Transactions order. */
  groups: SearchResultGroup[];
  results: SearchResult[];
  totalResults: number;
  isLoading: boolean;
  /** True while keystrokes are still settling and no API call has been made yet. */
  isDebouncing: boolean;
  error: string | null;
  /** True once a search has run for a non-empty query and returned nothing. */
  isEmpty: boolean;
  clear: () => void;
}

interface SearchSnapshot {
  query: string;
  results: SearchResult[];
  error: string | null;
}

const EMPTY_SNAPSHOT: SearchSnapshot = { query: '', results: [], error: null };

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (error instanceof Error && error.name === 'AbortError') return true;
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'ERR_CANCELED'
  ) {
    return true;
  }
  return false;
}

/**
 * useGlobalSearch — debounces the query, then searches across deliveries,
 * drivers and transactions.
 *
 * Rapid keystrokes reset the timer so the API is only called once the user
 * pauses. In-flight requests are aborted as soon as a newer debounced query
 * is ready, so a slow response can never overwrite a newer one.
 */
export function useGlobalSearch(): UseGlobalSearchResult {
  const [query, setQueryState] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [snapshot, setSnapshot] = useState<SearchSnapshot>(EMPTY_SNAPSHOT);

  const setQuery = useCallback((next: string) => {
    setQueryState(next);
    if (next.trim() === '') {
      setDebouncedQuery('');
      setSnapshot(EMPTY_SNAPSHOT);
    }
  }, []);

  const trimmedQuery = query.trim();

  useEffect(() => {
    if (!trimmedQuery) {
      return;
    }

    const timer = window.setTimeout(() => {
      setDebouncedQuery(trimmedQuery);
    }, GLOBAL_SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [trimmedQuery]);

  useEffect(() => {
    if (!debouncedQuery) {
      return;
    }

    const controller = new AbortController();

    globalSearchService
      .search(debouncedQuery, controller.signal)
      .then((results) => {
        if (controller.signal.aborted) return;
        setSnapshot({ query: debouncedQuery, results, error: null });
      })
      .catch((searchError: unknown) => {
        if (controller.signal.aborted || isAbortError(searchError)) return;
        setSnapshot({
          query: debouncedQuery,
          results: [],
          error:
            searchError instanceof Error
              ? searchError.message
              : 'Unable to complete the search',
        });
      });

    return () => controller.abort();
  }, [debouncedQuery]);

  const isDebouncing = trimmedQuery !== '' && trimmedQuery !== debouncedQuery;
  const isSettled = trimmedQuery !== '' && snapshot.query === trimmedQuery;
  const results = useMemo(
    () => (isSettled ? snapshot.results : []),
    [isSettled, snapshot.results],
  );
  const error = isSettled ? snapshot.error : null;

  const groups = useMemo<SearchResultGroup[]>(
    () =>
      SEARCH_CATEGORIES.map((category) => ({
        category,
        label: SEARCH_CATEGORY_LABELS[category],
        results: results.filter((result) => result.category === category),
      })).filter((group) => group.results.length > 0),
    [results],
  );

  const clear = useCallback(() => {
    setQueryState('');
    setDebouncedQuery('');
    setSnapshot(EMPTY_SNAPSHOT);
  }, []);

  return {
    query,
    setQuery,
    groups,
    results,
    totalResults: results.length,
    isLoading: trimmedQuery !== '' && !isSettled,
    isDebouncing,
    error,
    isEmpty: isSettled && error === null && results.length === 0,
    clear,
  };
}
