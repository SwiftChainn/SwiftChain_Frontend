export default function DeliveryDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div>
      <h1 data-tour="delivery-details-title">Delivery Details: {params.id}</h1>
      {/* Delivery status and tracking placeholder */}
    </div>
  );
}
