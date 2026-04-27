import { useEffect } from 'react';
import { socketService } from '@/lib/websocket';
import { useWebSocketContext } from '@/lib/WebSocketProvider';
import { toast } from 'sonner';

export interface StatusUpdatePayload {
  trackingId: string;
  status: string;
  timestamp: number;
}

/**
 * useLiveUpdates — Subscribes to real-time status updates for a specific delivery.
 * 
 * Following Strict Layered Architecture: 
 * Component -> Hook (this) -> Service (socketService).
 */
export function useLiveUpdates(trackingId: string) {
  const { isConnected } = useWebSocketContext();

  useEffect(() => {
    const socket = socketService.socket;
    if (!socket || !isConnected) return;

    const handleStatusUpdate = (payload: StatusUpdatePayload) => {
      // Filter incoming events by the specific trackingId
      if (payload.trackingId === trackingId) {
        toast.info(`Shipment Status: ${payload.status}`);
      }
    };

    socket.on('STATUS_UPDATE', handleStatusUpdate);

    return () => {
      socket.off('STATUS_UPDATE', handleStatusUpdate);
    };
  }, [trackingId, isConnected, socketService]);
}