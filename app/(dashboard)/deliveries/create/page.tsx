import { CurrencyConverter } from '@/features/deliveries/components/CurrencyConverter';

export default function CreateDeliveryPage() {
  return (
    <div>
      <h1 data-tour="create-delivery-title">Create New Delivery</h1>
      <CurrencyConverter />
    </div>
  );
}
