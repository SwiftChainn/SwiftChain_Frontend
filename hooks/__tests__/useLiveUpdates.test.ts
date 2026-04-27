import { renderHook } from '@testing-library/react';
import { useLiveUpdates } from '../useLiveUpdates';
import { socketService } from '@/lib/websocket';
import { useWebSocketContext } from '@/lib/WebSocketProvider';
import { toast } from 'sonner';

// Mock the service layer and external dependencies
jest.mock('@/lib/websocket', () => ({
  socketService: {
    socket: {
      on: jest.fn(),
      off: jest.fn(),
    },
  },
}));

jest.mock('@/lib/WebSocketProvider', () => ({
  useWebSocketContext: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: {
    info: jest.fn(),
  },
}));

describe('useLiveUpdates Hook', () => {
  const mockTrackingId = 'SHIP-12345';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not attach listener if isConnected is false', () => {
    (useWebSocketContext as jest.Mock).mockReturnValue({ isConnected: false });

    renderHook(() => useLiveUpdates(mockTrackingId));

    expect(socketService.socket?.on).not.toHaveBeenCalled();
  });

  it('should attach STATUS_UPDATE listener when connected', () => {
    (useWebSocketContext as jest.Mock).mockReturnValue({ isConnected: true });

    renderHook(() => useLiveUpdates(mockTrackingId));

    expect(socketService.socket?.on).toHaveBeenCalledWith(
      'STATUS_UPDATE',
      expect.any(Function)
    );
  });

  it('should trigger toast.info when a matching trackingId update is received', () => {
    (useWebSocketContext as jest.Mock).mockReturnValue({ isConnected: true });
    let updateHandler: (payload: any) => void = () => {};

    // Capture the callback passed to socket.on
    (socketService.socket?.on as jest.Mock).mockImplementation((event, cb) => {
      if (event === 'STATUS_UPDATE') updateHandler = cb;
    });

    renderHook(() => useLiveUpdates(mockTrackingId));

    // Simulate receiving a matching event
    updateHandler({ trackingId: mockTrackingId, status: 'IN_TRANSIT', timestamp: Date.now() });

    expect(toast.info).toHaveBeenCalledWith('Shipment Status: IN_TRANSIT');
  });

  it('should ignore updates for different trackingIds', () => {
    (useWebSocketContext as jest.Mock).mockReturnValue({ isConnected: true });
    let updateHandler: (payload: any) => void = () => {};

    (socketService.socket?.on as jest.Mock).mockImplementation((event, cb) => {
      if (event === 'STATUS_UPDATE') updateHandler = cb;
    });

    renderHook(() => useLiveUpdates(mockTrackingId));

    // Simulate receiving a non-matching event
    updateHandler({ trackingId: 'OTHER-ID', status: 'DELIVERED', timestamp: Date.now() });

    expect(toast.info).not.toHaveBeenCalled();
  });

  it('should remove the listener on unmount', () => {
    (useWebSocketContext as jest.Mock).mockReturnValue({ isConnected: true });
    const { unmount } = renderHook(() => useLiveUpdates(mockTrackingId));
    unmount();
    expect(socketService.socket?.off).toHaveBeenCalledWith('STATUS_UPDATE', expect.any(Function));
  });
});