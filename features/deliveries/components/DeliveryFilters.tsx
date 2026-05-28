'use client';

import { useState, useCallback } from 'react';
import { useDeliveryFilters } from '../hooks/useDeliveryFilters';
import { Search, X } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const SORT_OPTIONS = [
  { value: '', label: 'No Sort' },
  { value: 'date-desc', label: 'Newest First' },
  { value: 'date-asc', label: 'Oldest First' },
];

export function DeliveryFilters() {
  const { search, status, sortBy, hasActiveFilters, updateFilters, clearFilters } = useDeliveryFilters();
  const [localSearch, setLocalSearch] = useState(search || '');

  // Handle search input changes
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setLocalSearch(value);
      // Debounce the API call by only updating on blur or submit
    },
    []
  );

  // Apply search on blur or Enter key
  const handleSearchSubmit = useCallback(() => {
    updateFilters({ search: localSearch });
  }, [localSearch, updateFilters]);

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleSearchSubmit();
      }
    },
    [handleSearchSubmit]
  );

  // Clear search input
  const handleClearSearch = useCallback(() => {
    setLocalSearch('');
    updateFilters({ search: '' });
  }, [updateFilters]);

  // Handle status filter change
  const handleStatusChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateFilters({ status: e.target.value });
    },
    [updateFilters]
  );

  // Handle sort change
  const handleSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateFilters({ sortBy: e.target.value as 'date-asc' | 'date-desc' });
    },
    [updateFilters]
  );

  return (
    <div className="w-full bg-white dark:bg-gray-800 shadow-sm rounded-lg p-4 mb-6 border border-gray-200 dark:border-gray-700">
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Search by Tracking ID..."
              value={localSearch}
              onChange={handleSearchChange}
              onBlur={handleSearchSubmit}
              onKeyDown={handleSearchKeyDown}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
            />
            {localSearch && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                aria-label="Clear search"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Status Filter */}
          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              id="status-filter"
              value={status || ''}
              onChange={handleStatusChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Options */}
          <div>
            <label htmlFor="sort-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sort by
            </label>
            <select
              id="sort-filter"
              value={sortBy || ''}
              onChange={handleSortChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filters Display & Clear Button */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">Active filters:</span>
              {search && <span className="ml-2 inline-block bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs">Search: {search}</span>}
              {status && <span className="ml-2 inline-block bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs">Status: {status}</span>}
              {sortBy && <span className="ml-2 inline-block bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs">Sort: {sortBy === 'date-desc' ? 'Newest' : 'Oldest'}</span>}
            </div>
            <button
              onClick={clearFilters}
              className="text-sm px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition font-medium"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
