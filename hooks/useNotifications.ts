'use client';

import { useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { notificationService } from '@/services/notificationService';
import { useNotificationContext } from '@/context/NotificationContext';
import type { Notification } from '@/context/NotificationContext';

export const NOTIFICATIONS_QUERY_KEY = ['notifications'] as const;

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? '';

/**
 * useNotifications — orchestrates the notification system.
 *
 * 1. Fetches historical notifications from the backend API via TanStack Query
 * 2. Connects to WebSocket and listens for `notification:new` events
 * 3. On WebSocket event: calls addNotification() → badge updates immediately
 * 4. markAllAsRead: calls service then updates context state
 */
export function useNotifications() {
  const {
    notifications,
    unreadCount,
    setNotifications,
    addNotification,
    markAllAsRead: markAllAsReadInContext,
  } = useNotificationContext();


  // Step 1: Fetch initial notifications from API
  const { data, isLoading, isError } = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: notificationService.getNotifications,
  });

  // Sync fetched server state with global Context
  useEffect(() => {
    if (data) {
      setNotifications(data);
    }
  }, [data, setNotifications]);

  // Step 2: Connect to WebSocket and listen for new notification events
  useEffect(() => {
    if (!SOCKET_URL) return;

    const socket = io(SOCKET_URL, { transports: ['websocket'] });

    // Step 3: Badge updates immediately on WebSocket event
    socket.on('notification:new', (notification: Notification) => {
      addNotification(notification);
    });

    return () => {
      socket.off('notification:new');
      socket.disconnect();
    };
  }, [addNotification]);

  // Step 4: Mark all as read — calls API then updates context
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
    } finally {
      // Update context unconditionally — optimistic UI
      markAllAsReadInContext();
    }
  }, [markAllAsReadInContext]);

  return {
    notifications,
    unreadCount,
    isLoading,
    isError,
    markAllAsRead,
  };
}