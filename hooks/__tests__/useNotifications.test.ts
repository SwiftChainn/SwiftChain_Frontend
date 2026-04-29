import { renderHook, act } from '@testing-library/react';
import { useNotificationContext } from '@/context/NotificationContext';
import type { Notification } from '@/context/NotificationContext';

// Mock socket.io-client
const mockSocket = {
  on: jest.fn(),
  off: jest.fn(),
  disconnect: jest.fn(),
};

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket),
}));

// Mock notificationService
jest.mock('@/services/notificationService', () => ({
  notificationService: {
    getNotifications: jest.fn().mockResolvedValue([]),
    markAllAsRead: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock TanStack Query
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(() => ({ isLoading: false, isError: false, data: [] })),
}));

// Mock useNotificationContext
const mockContext = {
  notifications: [] as Notification[],
  unreadCount: 0,
  setNotifications: jest.fn(),
  addNotification: jest.fn(),
  markAllAsRead: jest.fn(),
};

jest.mock('@/context/NotificationContext', () => ({
  useNotificationContext: jest.fn(() => mockContext),
}));

import { useNotifications } from '@/hooks/useNotifications';
import { notificationService } from '@/services/notificationService';

describe('useNotifications', () => {
  afterEach(() => jest.clearAllMocks());

  it('should expose notifications and unreadCount from context', () => {
    const mockNotifications: Notification[] = [
      {
        id: '1',
        title: 'Test',
        message: 'Test message',
        type: 'system',
        read: false,
        createdAt: new Date().toISOString(),
      },
    ];
    (useNotificationContext as jest.Mock).mockReturnValue({
      ...mockContext,
      notifications: mockNotifications,
      unreadCount: 1,
    });

    const { result } = renderHook(() => useNotifications());
    expect(result.current.unreadCount).toBe(1);
    expect(result.current.notifications).toHaveLength(1);
  });

  it('should call markAllAsRead on service and context', async () => {
    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.markAllAsRead();
    });
    expect(notificationService.markAllAsRead).toHaveBeenCalledTimes(1);
    expect(mockContext.markAllAsRead).toHaveBeenCalledTimes(1);
  });

  it('should still mark all as read in context even if service call fails', async () => {
    (
      notificationService.markAllAsRead as jest.Mock
    ).mockRejectedValueOnce(new Error('API error'));
    
    const { result } = renderHook(() => useNotifications());
    
    await act(async () => {
      try {
        await result.current.markAllAsRead();
      } catch (error) {
        // We catch the error here so it doesn't crash the Jest test runner.
        // We can also assert that the error is the one we expect.
        expect((error as Error).message).toBe('API error');
      }
    });
    
    // finally block guarantees context update
    expect(mockContext.markAllAsRead).toHaveBeenCalledTimes(1);
  });

  it('should expose isLoading and isError states', () => {
    const { result } = renderHook(() => useNotifications());
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
  });
});