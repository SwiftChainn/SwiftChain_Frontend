import { apiClient } from './api';
import { Delivery } from '../types/delivery';

export interface CreateDeliveryPayload {
  pickupAddress: string;
  destination: string;
  packageSize: 'small' | 'medium' | 'large';
  description: string;
  recipientName: string;
  recipientPhone: string;
  recipientEmail: string;
}

export const deliveriesService = {
  getDeliveries: async (): Promise<Delivery[]> => {
    const { data } = await apiClient.get<Delivery[]>('/deliveries');
    return data;
  },

  getDeliveryById: async (id: string): Promise<Delivery> => {
    const { data } = await apiClient.get<Delivery>(`/deliveries/${id}`);
    return data;
  },

  createDelivery: async (
    payload: CreateDeliveryPayload,
  ): Promise<Delivery> => {
    const { data } = await apiClient.post<Delivery>('/deliveries', payload);
    return data;
  },
};
