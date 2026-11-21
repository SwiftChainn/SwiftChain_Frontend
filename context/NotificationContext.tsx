'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

export type NotificationPriority = 'high' | 'medium' | 'low';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'delivery' | 'system' | 'alert';
  read: boolean;
  createdAt: string;
  priority?: NotificationPriority;
  count?: number;
}

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  addNotifications: (notifications: Notification[]) => void;
  markAllAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotificationsState] = useState<Notification[]>([]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const setNotifications = useCallback((items: Notification[]) => {
    setNotificationsState(items);
  }, []);

  // Called directly by the WebSocket handler — updates badge immediately
  const addNotifications = useCallback((items: Notification[]) => {
    setNotificationsState((prev) => [...items, ...prev]);
  }, []);

  const addNotification = useCallback(
    (n: Notification) => addNotifications([n]),
    [addNotifications],
  );

  const markAllAsRead = useCallback(() => {
    setNotificationsState((prev) =>
      prev.map((n) => ({ ...n, read: true })),
    );
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        setNotifications,
        addNotification,
        addNotifications,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error(
      'useNotificationContext must be used within NotificationProvider',
    );
  }
  return ctx;
}