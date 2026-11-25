'use client';

import { useEffect, useRef } from 'react';
import type { SocketConnectionStatus } from '@/lib/websocket';
import { useToast } from '@/hooks/useToast';

export function useWebSocketReconnectToast(status: SocketConnectionStatus): void {
  const { info, success } = useToast();
  const previousStatus = useRef(status);

  useEffect(() => {
    if (status === 'reconnecting' && previousStatus.current !== 'reconnecting') {
      info('Connection lost. Reconnecting…');
    } else if (status === 'connected' && previousStatus.current === 'reconnecting') {
      success('Connection restored');
    }

    previousStatus.current = status;
  }, [status, info, success]);
}
