import { DeliveryDetails } from '@/components/deliveries/DeliveryDetails';

export default async function DeliveryDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="p-6">
      <h1
        data-tour="delivery-details-title"
        className="text-2xl font-semibold"
      >
        Delivery Details: {id}
      </h1>

      <div className="mt-6">
        <DeliveryDetails id={id} />
      </div>
    </div>
  );
}
