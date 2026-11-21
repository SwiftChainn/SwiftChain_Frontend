import { renderHook, act } from '@testing-library/react';
import { useNotificationContext } from '@/context/NotificationContext';
import type { Notification } from '@/context/NotificationContext';

// Ensure SOCKET_URL is set so the socket useEffect in useNotifications runs
// (the hook returns early when SOCKET_URL is falsy)
process.env.NEXT_PUBLIC_SOCKET_URL = 'ws://localhost:4000';

// ---------------------------------------------------------------------------
// next/navigation
// ---------------------------------------------------------------------------
jest.mock('next/navigation', () => ({ usePathname: jest.fn(() => '/dashboard') }));

// ---------------------------------------------------------------------------
// socket.io-client
// ---------------------------------------------------------------------------
const mockSocket = {
  on: jest.fn(),
  off: jest.fn(),
  disconnect: jest.fn(),
};

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket),
}));

// ---------------------------------------------------------------------------
// notificationService
// ---------------------------------------------------------------------------
jest.mock('@/services/notificationService', () => ({
  notificationService: {
    getNotifications: jest.fn().mockResolvedValue([]),
    markAllAsRead: jest.fn().mockResolvedValue(undefined),
  },
}));

// ---------------------------------------------------------------------------
// TanStack Query
// ---------------------------------------------------------------------------
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(() => ({ isLoading: false, isError: false, data: [] })),
}));

// ---------------------------------------------------------------------------
// notificationProcessor — controlled so pipeline tests can inject outcomes
// ---------------------------------------------------------------------------
jest.mock('@/lib/notificationProcessor', () => ({
  deduplicate: jest.fn(),
  groupBatch: jest.fn(),
  shouldToast: jest.fn(() => false),
}));

// ---------------------------------------------------------------------------
// notificationPipeline — capture constructor callbacks for direct invocation
// ---------------------------------------------------------------------------

/** Holds the last onImmediate callback registered by the hook. */
let capturedOnImmediate: ((n: Notification) => void) | null = null;

jest.mock('@/lib/notificationPipeline', () => ({
  NotificationPipeline: jest.fn().mockImplementation(
    (cb: { onImmediate: (n: Notification) => void; onBatch: (b: Notification[]) => void }) => {
      capturedOnImmediate = cb.onImmediate;
      return {
        ingest: jest.fn(),
        flushPending: jest.fn(),
        destroy: jest.fn(),
      };
    },
  ),
}));

// ---------------------------------------------------------------------------
// NotificationContext mock
// ---------------------------------------------------------------------------
const mockContext = {
  notifications: [] as Notification[],
  unreadCount: 0,
  setNotifications: jest.fn(),
  addNotification: jest.fn(),
  addNotifications: jest.fn(),
  markAllAsRead: jest.fn(),
};

jest.mock('@/context/NotificationContext', () => ({
  useNotificationContext: jest.fn(() => mockContext),
}));

// ---------------------------------------------------------------------------
// Imports that must come after all jest.mock() calls
// ---------------------------------------------------------------------------
import { useNotifications } from '@/hooks/useNotifications';
import { notificationService } from '@/services/notificationService';
import { deduplicate, groupBatch } from '@/lib/notificationProcessor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'n1',
    title: 'Package delivered',
    message: 'Your package has arrived',
    type: 'delivery',
    read: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('useNotifications', () => {
  afterEach(() => {
    jest.clearAllMocks();
    capturedOnImmediate = null;
  });

  // -------------------------------------------------------------------------
  // Existing tests (preserved)
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // New tests — pipeline → addNotifications
  // -------------------------------------------------------------------------

  it('calls addNotifications with the grouped result when a notification:new event arrives', () => {
    // Arrange: set up processor mocks to let the notification through
    const incoming = makeNotification();
    const grouped = [{ ...incoming, count: 1, priority: 'medium' as const }];

    (deduplicate as jest.Mock).mockReturnValue({ unique: [incoming], suppressed: [] });
    (groupBatch as jest.Mock).mockReturnValue(grouped);

    // Render the hook so the pipeline is constructed and onImmediate is captured
    renderHook(() => useNotifications());

    expect(capturedOnImmediate).not.toBeNull();

    // Act: simulate the WebSocket event arriving via the pipeline's onImmediate path
    act(() => {
      capturedOnImmediate!(incoming);
    });

    // Assert: addNotifications was called with the grouped result
    expect(mockContext.addNotifications).toHaveBeenCalledTimes(1);
    expect(mockContext.addNotifications).toHaveBeenCalledWith(grouped);
  });

  it('does NOT call addNotifications when the incoming notification is a duplicate of an existing unread within 5 min', () => {
    // Arrange: existing unread notification identical to the incoming one
    const existing = makeNotification({ id: 'existing-1', read: false });
    (useNotificationContext as jest.Mock).mockReturnValue({
      ...mockContext,
      notifications: [existing],
    });

    // Processor reports all suppressed (dedup hit)
    const incoming = makeNotification({ id: 'incoming-1' });
    (deduplicate as jest.Mock).mockReturnValue({ unique: [], suppressed: [incoming] });
    (groupBatch as jest.Mock).mockReturnValue([]);

    renderHook(() => useNotifications());

    expect(capturedOnImmediate).not.toBeNull();

    act(() => {
      capturedOnImmediate!(incoming);
    });

    // unique.length === 0 → processNotifications returns early → no addNotifications call
    expect(mockContext.addNotifications).not.toHaveBeenCalled();
  });
});
