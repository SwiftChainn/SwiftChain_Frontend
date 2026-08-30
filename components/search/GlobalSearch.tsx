'use client';

import { Search, X } from 'lucide-react';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';
import type { SearchResult } from '@/services/globalSearchService';

interface GlobalSearchProps {
  /** Called with the selected result — typically routes to `result.href`. */
  onSelect?: (result: SearchResult) => void;
}

/**
 * GlobalSearch — site-wide search across deliveries, drivers and transactions.
 *
 * The input updates immediately; the hook debounces the query so the API is
 * only called after the user pauses typing.
 */
export function GlobalSearch({ onSelect }: GlobalSearchProps) {
  const {
    query,
    setQuery,
    groups,
    totalResults,
    isLoading,
    isDebouncing,
    error,
    isEmpty,
    clear,
  } = useGlobalSearch();

  return (
    <div role="search" data-testid="global-search" className="relative w-full max-w-2xl">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search deliveries, drivers, transactions..."
          aria-label="Global search"
          aria-busy={isLoading}
          autoComplete="off"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-10 text-sm outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:focus:border-sky-400"
        />
        {query ? (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {query.trim() ? (
        <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-[28px] border border-slate-200/70 bg-white shadow-2xl shadow-slate-900/10 ring-1 ring-slate-900/5 dark:border-slate-700 dark:bg-slate-900">
          {isDebouncing || isLoading ? (
            <div className="p-5 text-sm text-slate-500" role="status">
              Searching...
            </div>
          ) : null}

          {!isLoading && error ? (
            <div className="p-5 text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </div>
          ) : null}

          {!isLoading && !error && isEmpty ? (
            <div className="p-5 text-sm text-slate-500">
              No results found for &quot;{query.trim()}&quot;.
            </div>
          ) : null}

          {!isLoading && !error && totalResults > 0 ? (
            <div className="max-h-[60vh] overflow-y-auto p-2">
              <p className="sr-only" aria-live="polite">
                {totalResults} result{totalResults === 1 ? '' : 's'} found
              </p>
              {groups.map((group) => (
                <section
                  key={group.category}
                  aria-labelledby={`search-group-${group.category}`}
                  className="px-2 py-3"
                >
                  <h3
                    id={`search-group-${group.category}`}
                    className="px-4 pb-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500"
                  >
                    {group.label}
                  </h3>
                  <ul>
                    {group.results.map((result) => (
                      <li key={`${result.category}-${result.id}`}>
                        <button
                          type="button"
                          onClick={() => onSelect?.(result)}
                          className="flex w-full flex-col items-start rounded-xl px-4 py-3 text-left text-sm text-slate-900 transition hover:bg-sky-50 dark:text-slate-100 dark:hover:bg-slate-800"
                        >
                          <span>{result.title}</span>
                          {result.subtitle ? (
                            <span className="text-xs text-slate-500">{result.subtitle}</span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default GlobalSearch;
