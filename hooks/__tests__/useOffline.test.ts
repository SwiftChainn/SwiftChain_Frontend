import { renderHook, act } from '@testing-library/react';
import useOffline from '@/hooks/useOffline';
import { networkService } from '@/services/networkService';

jest.mock('@/services/networkService', () => ({
  networkService: {
    getIsOnline: jest.fn(),
    subscribe: jest.fn(),
  },
}));

describe('useOffline', () => {
  let subscribeCallback: (isOnline: boolean) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    (networkService.subscribe as jest.Mock).mockImplementation((cb) => {
      subscribeCallback = cb;
      return jest.fn(); // Unsubscribe mock
    });
  });

  it('should initialize with the current network status', () => {
    (networkService.getIsOnline as jest.Mock).mockReturnValue(true);
    const { result } = renderHook(() => useOffline());
    expect(result.current.isOnline).toBe(true);
    expect(networkService.getIsOnline).toHaveBeenCalled();
  });

  it('should update status when networkService notifies change', () => {
    (networkService.getIsOnline as jest.Mock).mockReturnValue(true);
    const { result } = renderHook(() => useOffline());
    
    expect(result.current.isOnline).toBe(true);

    act(() => {
      subscribeCallback(false);
    });

    expect(result.current.isOnline).toBe(false);

    act(() => {
      subscribeCallback(true);
    });

    expect(result.current.isOnline).toBe(true);
  });

  it('should cleanup subscription on unmount', () => {
    const unsubscribeMock = jest.fn();
    (networkService.subscribe as jest.Mock).mockReturnValue(unsubscribeMock);
    
    const { unmount } = renderHook(() => useOffline());
    unmount();
    
    expect(unsubscribeMock).toHaveBeenCalled();
  });
});
