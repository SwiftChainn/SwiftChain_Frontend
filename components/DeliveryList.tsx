'use client';

import { useDeliveries } from '@/hooks/useDeliveries';
import { useDeliveryFilters } from '@/features/deliveries/hooks/useDeliveryFilters';
import { DeliveryFilters } from '@/features/deliveries/components/DeliveryFilters';

export function DeliveryList() {
  const { search, status, sortBy } = useDeliveryFilters();
  const { data, isLoading, error } = useDeliveries({
    search,
    status,
    sortBy,
  });

  if (isLoading) return <div className="text-primary text-center p-4">Loading deliveries...</div>;
  if (error) return <div className="text-secondary-dark text-center p-4">Error fetching deliveries: {error.message}</div>;

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6 text-primary-dark dark:text-primary-light">Deliveries</h2>
      
      {/* Filters Component */}
      <DeliveryFilters />

      {/* Deliveries List */}
      {data && data.length > 0 ? (
        <ul className="space-y-4">
          {data.map((del) => (
            <li key={del.id} className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 flex justify-between items-center border border-gray-200 dark:border-gray-700 hover:shadow-md transition">
              <div>
                <p className="font-semibold text-lg text-gray-900 dark:text-gray-100">{del.trackingNumber}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{del.origin} ➔ {del.destination}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {new Date(del.createdAt).toLocaleDateString()} at {new Date(del.createdAt).toLocaleTimeString()}
                </p>
              </div>
              <div className="text-right">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  del.status === 'DELIVERED' ? 'bg-success text-white' : 
                  del.status === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-200' :
                  del.status === 'CANCELLED' ? 'bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-200' :
                  'bg-primary-100 text-primary-900 dark:bg-primary-900 dark:text-primary-200'
                }`}>
                  {del.status}
                </span>
                <p className="text-sm font-medium mt-2 text-gray-700 dark:text-gray-300">Escrow: {del.escrowStatus}</p>
                <p className="text-sm font-semibold mt-1 text-primary-600 dark:text-primary-400">${del.amount}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400 text-lg">No deliveries found.</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Try adjusting your filters or creating a new delivery.</p>
        </div>
      )}
    </div>
  );
}
