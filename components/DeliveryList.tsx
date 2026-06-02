'use client';

import { useDeliveries } from '@/hooks/useDeliveries';
import { useDeliveryFilters } from '@/features/deliveries/hooks';
import { DeliveryFilters } from '@/features/deliveries/components';

export function DeliveryList() {
  const { search, status, sortBy, hasActiveFilters, updateFilters, clearFilters } = useDeliveryFilters();
  const { data, isLoading, error } = useDeliveries({ search, status, sortBy });
import { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import { useExpandableDelivery } from '@/hooks/useExpandableDelivery';
import { ExpandableDeliveryRow } from '@/features/deliveries/components/ExpandableDeliveryRow';

export function DeliveryList() {
  const { data, isLoading, error } = useDeliveries();
  const { toggleExpanded, isExpanded } = useExpandableDelivery();

  const columns = useMemo<ColumnDef<any, any>[]>(
    () => [
      {
        accessorKey: 'trackingNumber',
        header: 'Tracking ID',
        cell: info => info.getValue(),
      },
      {
        accessorKey: 'createdAt',
        header: 'Date',
        cell: info => {
          const date = new Date(info.getValue() as string);
          return date.toLocaleDateString();
        },
      },
      {
        accessorKey: 'origin',
        header: 'Origin',
        cell: info => info.getValue(),
      },
      {
        accessorKey: 'destination',
        header: 'Destination',
        cell: info => info.getValue(),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: info => (
          <span
            className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
              info.getValue() === 'DELIVERED'
                ? 'bg-success text-white'
                : 'bg-primary-100 text-primary-900'
            }`}
          >
            {info.getValue()}
          </span>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading)
    return (
      <div className="text-primary text-center p-4">Loading deliveries...</div>
    );
  if (error)
    return (
      <div className="text-secondary-dark text-center p-4">
        Error fetching deliveries: {error.message}
      </div>
    );

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4 text-primary-dark dark:text-primary-light">
        Active Deliveries
      </h2>
      {/* Table view for md+ screens */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white dark:bg-gray-900">
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className="border-b border-gray-200 dark:border-gray-700">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Card view for mobile */}
      <div className="block md:hidden">
        {data && data.length > 0 ? (
          <ul className="space-y-4">
            {data.map(del => (
              <li
                key={del.id}
                className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 flex justify-between items-center border border-gray-200 dark:border-gray-700"
              >
                <div>
                  <p className="font-semibold text-lg">{del.trackingNumber}</p>
                  <p className="text-sm text-gray-500">
                    {del.origin} ➔ {del.destination}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      del.status === 'DELIVERED'
                        ? 'bg-success text-white'
                        : 'bg-primary-100 text-primary-900'
                    }`}
                  >
                    {del.status}
                  </span>
                  <p className="text-sm font-medium mt-1">Escrow: {del.escrowStatus}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No deliveries found.</p>
        )}
      </div>
    </div>
  );
}

  const { data, isLoading, error } = useDeliveries();

  if (isLoading) return <div className="text-primary text-center p-4">Loading deliveries...</div>;
  if (error) return <div className="text-secondary-dark text-center p-4">Error fetching deliveries: {error.message}</div>;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'IN_TRANSIT':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'ACCEPTED':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4 text-primary-dark dark:text-primary-light">Active Deliveries</h2>
      
      {/* Filter Controls */}
      <DeliveryFilters
        search={search}
        status={status}
        sortBy={sortBy}
        hasActiveFilters={hasActiveFilters}
        onSearchChange={(newSearch) => updateFilters({ search: newSearch })}
        onStatusChange={(newStatus) => updateFilters({ status: newStatus })}
        onSortChange={(newSort) => updateFilters({ sortBy: newSort })}
        onClearAll={clearFilters}
      />

      {/* Deliveries List */}
      {data && data.length > 0 ? (
        <ul className="space-y-4">
          {data.map((del) => (
            <li
              key={del.id}
              className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 flex flex-col md:flex-row md:justify-between md:items-center border border-gray-200 dark:border-gray-700"
            >
              <div className="flex-1 mb-4 md:mb-0">
                <p className="font-semibold text-lg text-primary-dark dark:text-primary-light">{del.trackingNumber}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{del.origin} ➔ {del.destination}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Created: {formatDate(del.createdAt)}
                </p>
              </div>
              <div className="flex flex-col md:items-end gap-3">
                <div className="flex gap-2 items-center">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(del.status)}`}>
                    {del.status}
                  </span>
                  {del.amount && (
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      {del.amount}
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Escrow: {del.escrowStatus}
                </p>
              </div>
            </li>
    <div className="w-full max-w-6xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6 text-primary-dark dark:text-primary-light">Active Deliveries</h2>
      {data && data.length > 0 ? (
        <div className="space-y-4">
          {data.map((delivery) => (
            <ExpandableDeliveryRow
              key={delivery.id}
              delivery={delivery}
              isExpanded={isExpanded(delivery.id)}
              onToggle={toggleExpanded}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            {hasActiveFilters ? 'No deliveries match your filters.' : 'No deliveries found.'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 text-primary hover:text-primary-dark dark:text-primary-light font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
        <p className="text-gray-500 dark:text-gray-400">No deliveries found.</p>
      )}
    </div>
  );
}
