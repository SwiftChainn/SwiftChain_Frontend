import axios from 'axios';
import type { Notification } from '@/context/NotificationContext';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export type { Notification };

export const notificationService = {
  async getNotifications(): Promise<Notification[]> {
    const { data } = await axios.get<Notification[]>(
      `${API_BASE_URL}/api/notifications`,
    );
    return data;
  },

  async markAllAsRead(): Promise<void> {
    await axios.post(`${API_BASE_URL}/api/notifications/read-all`);
  },
};