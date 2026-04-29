import { apiClient } from './api';
import { Delivery } from '../types/delivery';

export const deliveriesService = {
  getDeliveries: async (): Promise<Delivery[]> => {
    const { data } = await apiClient.get<Delivery[]>('/deliveries');
    return data;
  },
  
  getDeliveryById: async (id: string): Promise<Delivery> => {
    const { data } = await apiClient.get<Delivery>(`/deliveries/${id}`);
    return data;
  }
};
