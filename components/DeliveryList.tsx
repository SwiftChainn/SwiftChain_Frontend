'use client';

import { useDeliveries } from '@/hooks/useDeliveries';

export function DeliveryList() {
  const { data, isLoading, error } = useDeliveries();

  if (isLoading) return <div className="text-primary text-center p-4">Loading deliveries...</div>;
  if (error) return <div className="text-secondary-dark text-center p-4">Error fetching deliveries: {error.message}</div>;

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4 text-primary-dark dark:text-primary-light">Active Deliveries</h2>
      {data && data.length > 0 ? (
        <ul className="space-y-4">
          {data.map((del) => (
            <li key={del.id} className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 flex justify-between items-center border border-gray-200 dark:border-gray-700">
              <div>
                <p className="font-semibold text-lg">{del.trackingNumber}</p>
                <p className="text-sm text-gray-500">{del.origin} ➔ {del.destination}</p>
              </div>
              <div className="text-right">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  del.status === 'DELIVERED' ? 'bg-success text-white' : 'bg-primary-100 text-primary-900'
                }`}>
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
  );
}
