'use client';

import { useDelivery } from '@/hooks/useDeliveries';
import { AsyncContent } from '@/components/shared/AsyncContent';
import { EscrowActions } from '@/components/escrow/EscrowActions';
import { CancelShipment } from '@/features/deliveries/components/CancelShipment';

export function DeliveryDetails({ id }: { id: string }) {
  const { data, isLoading, error, refetch } = useDelivery(id);

  return (
    <AsyncContent
      isLoading={isLoading}
      error={error}
      isEmpty={!data}
      loadingLabel="Loading delivery details"
      emptyTitle="Delivery not found"
      emptyDescription="This delivery may have been removed or is no longer available."
      onRetry={() => void refetch()}
    >
      {data ? (
        <div className="space-y-6">
          <dl className="grid gap-4 rounded-md border border-gray-200 bg-white p-6 sm:grid-cols-2">
            <div><dt className="text-sm text-gray-500">Tracking number</dt><dd className="font-medium text-gray-900">{data.trackingNumber}</dd></div>
            <div><dt className="text-sm text-gray-500">Status</dt><dd className="font-medium text-gray-900">{data.status}</dd></div>
            <div><dt className="text-sm text-gray-500">Origin</dt><dd className="font-medium text-gray-900">{data.origin}</dd></div>
            <div><dt className="text-sm text-gray-500">Destination</dt><dd className="font-medium text-gray-900">{data.destination}</dd></div>
          </dl>
          <EscrowActions shipmentId={id} />
          <CancelShipment shipmentId={id} />
        </div>
      ) : null}
    </AsyncContent>
  );
}
