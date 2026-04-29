import { useQuery } from '@tanstack/react-query';
import { deliveriesService } from '../services/deliveries.service';
import { Delivery } from '../types/delivery';

export function useDeliveries() {
  return useQuery<Delivery[], Error>({
    queryKey: ['deliveries'],
    queryFn: deliveriesService.getDeliveries,
  });
}

export function useDelivery(id: string) {
  return useQuery<Delivery, Error>({
    queryKey: ['delivery', id],
    queryFn: () => deliveriesService.getDeliveryById(id),
    enabled: !!id,
  });
}
