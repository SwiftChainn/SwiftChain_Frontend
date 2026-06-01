'use client';

import { useDeliveries } from '@/hooks/useDeliveries';
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

  return (
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
        <p className="text-gray-500 dark:text-gray-400">No deliveries found.</p>
      )}
    </div>
  );
}
