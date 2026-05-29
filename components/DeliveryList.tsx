'use client';

import { useDeliveries } from '@/hooks/useDeliveries';
import { useExpandableDelivery } from '@/hooks/useExpandableDelivery';
import { ExpandableDeliveryRow } from '@/features/deliveries/components/ExpandableDeliveryRow';

export function DeliveryList() {
  const { data, isLoading, error } = useDeliveries();
  const { toggleExpanded, isExpanded } = useExpandableDelivery();

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
