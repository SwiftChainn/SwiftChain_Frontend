import { apiClient } from './api';
import { Delivery } from '../types/delivery';
import { DeliveryFilterParams } from '../types/filters';

export const deliveriesService = {
  getDeliveries: async (filters?: DeliveryFilterParams): Promise<Delivery[]> => {
    const params = new URLSearchParams();

    if (filters?.search) {
      params.append('search', filters.search);
    }

    if (filters?.status) {
      params.append('status', filters.status);
    }

    if (filters?.sortBy) {
      params.append('sortBy', filters.sortBy);
    }

    const queryString = params.toString();
    const url = queryString ? `/deliveries?${queryString}` : '/deliveries';

    const { data } = await apiClient.get<Delivery[]>(url);
    return data;
  },
  
  getDeliveryById: async (id: string): Promise<Delivery> => {
    const { data } = await apiClient.get<Delivery>(`/deliveries/${id}`);
    return data;
  }
};
