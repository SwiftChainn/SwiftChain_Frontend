import axios from 'axios';
import { notificationService } from '@/services/notificationService';
import type { Notification } from '@/context/NotificationContext';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'Delivery Update',
    message: 'Your package is out for delivery.',
    type: 'delivery',
    read: false,
    createdAt: '2026-04-28T10:00:00Z',
  },
  {
    id: '2',
    title: 'System Alert',
    message: 'Scheduled maintenance tonight.',
    type: 'system',
    read: true,
    createdAt: '2026-04-27T09:00:00Z',
  },
];

describe('notificationService', () => {
  afterEach(() => jest.clearAllMocks());

  it('should call GET /api/notifications and return data', async () => {
    mockedAxios.get = jest.fn().mockResolvedValue({ data: mockNotifications });
    const result = await notificationService.getNotifications();
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining('/api/notifications'),
    );
    expect(result).toEqual(mockNotifications);
  });

  it('should return an array of notification objects', async () => {
    mockedAxios.get = jest.fn().mockResolvedValue({ data: mockNotifications });
    const result = await notificationService.getNotifications();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty('id');
    expect(result[0]).toHaveProperty('read');
  });

  it('should throw when GET /api/notifications fails', async () => {
    mockedAxios.get = jest.fn().mockRejectedValue(new Error('Network Error'));
    await expect(notificationService.getNotifications()).rejects.toThrow(
      'Network Error',
    );
  });

  it('should call POST /api/notifications/read-all', async () => {
    mockedAxios.post = jest.fn().mockResolvedValue({ data: {} });
    await notificationService.markAllAsRead();
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/api/notifications/read-all'),
    );
  });

  it('should throw when POST /api/notifications/read-all fails', async () => {
    mockedAxios.post = jest.fn().mockRejectedValue(new Error('Server Error'));
    await expect(notificationService.markAllAsRead()).rejects.toThrow(
      'Server Error',
    );
  });
});