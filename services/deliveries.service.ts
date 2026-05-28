import { apiClient } from './api';
import { Delivery, StatusTimeline } from '../types/delivery';

export const deliveriesService = {
  getDeliveries: async (): Promise<Delivery[]> => {
    const { data } = await apiClient.get<Delivery[]>('/deliveries');
    return data;
  },
  
  getDeliveryById: async (id: string): Promise<Delivery> => {
    const { data } = await apiClient.get<Delivery>(`/deliveries/${id}`);
    return data;
  },

  getStatusTimeline: async (deliveryId: string): Promise<StatusTimeline> => {
    const { data } = await apiClient.get<StatusTimeline>(
      `/deliveries/${deliveryId}/timeline`
    );
    return data;
  }
};
