'use client';

import { useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { notificationService } from '@/services/notificationService';
import { useNotificationContext } from '@/context/NotificationContext';
import type { Notification } from '@/context/NotificationContext';
import { NotificationPipeline } from '@/lib/notificationPipeline';
import { deduplicate, groupBatch, shouldToast } from '@/lib/notificationProcessor';
import { toastService } from '@/lib/toast';

export const NOTIFICATIONS_QUERY_KEY = ['notifications'] as const;

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? '';

/**
 * fireToast — best-effort toast emission for a single notification.
 *
 * `alert` notifications surface as an error toast (critical); every other
 * type surfaces as an info toast. This is best-effort UI: a failure here must
 * never prevent the notification from being recorded in the center, so the
 * emission is wrapped in a try/catch that swallows any error.
 */
function fireToast(n: Notification): void {
  try {
    if (n.type === 'alert') {
      toastService.error(n.title, n.message);
    } else {
      toastService.info(n.title, n.message);
    }
  } catch {
    /* toast is best-effort UI; never break notification recording */
  }
}

/**
 * useNotifications — orchestrates the notification system.
 *
 * 1. Fetches historical notifications from the backend API via TanStack Query
 *    and syncs them into the global Context.
 * 2. Connects to WebSocket; every `notification:new` event is fed through a
 *    NotificationPipeline that rate-limits bursts and flushes accumulated
 *    batches after a 2-second quiet period.
 * 3. processNotifications: deduplicate against existing unread entries →
 *    group survivors (alerts stay separate) → record in Context (badge
 *    increments per entry) → emit a toast when the route allows. Refs hold
 *    the latest route/notifications so the asynchronous batch flush reads the
 *    current values instead of stale closures.
 * 4. markAllAsRead: calls the service then updates context state (unchanged).
 */
export function useNotifications() {
  const {
    notifications,
    unreadCount,
    setNotifications,
    addNotifications,
    markAllAsRead: markAllAsReadInContext,
  } = useNotificationContext();

  // Current route, kept in a ref so a debounced batch flush reads the page the
  // user is actually on when the batch is displayed (not the one captured at
  // ingestion time).
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  // Latest notifications, kept in a ref so dedup runs against the current
  // center state rather than the snapshot a stale closure captured.
  const notificationsRef = useRef(notifications);
  notificationsRef.current = notifications;

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

  /**
   * processNotifications — the per-event / per-batch transformation.
   * Dedup against existing unread entries → group survivors → record in the
   * center (badge increments per entry) → emit a toast when the route allows.
   */
  const processNotifications = useCallback(
    (incoming: Notification[]) => {
      if (incoming.length === 0) return;
      const now = Date.now();
      const { unique } = deduplicate(incoming, notificationsRef.current, now);
      if (unique.length === 0) return; // all duplicates suppressed
      const grouped = groupBatch(unique); // sets priority + count; alerts separate
      addNotifications(grouped); // record in center, badge increments
      const route = pathnameRef.current ?? '';
      for (const entry of grouped) {
        if (shouldToast(entry.type, route)) fireToast(entry);
      }
    },
    [addNotifications],
  );

  // Step 2: Connect to WebSocket and route events through the pipeline
  useEffect(() => {
    if (!SOCKET_URL) return;

    const pipeline = new NotificationPipeline({
      onImmediate: (n) => processNotifications([n]),
      onBatch: (batch) => processNotifications(batch),
    });

    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socket.on('notification:new', (n: Notification) => pipeline.ingest(n));

    return () => {
      socket.off('notification:new');
      socket.disconnect();
      pipeline.destroy();
    };
  }, [processNotifications]);

  // Step 3: Mark all as read — calls API then updates context
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
