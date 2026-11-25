import { renderHook, act, waitFor } from '@testing-library/react';
import { useWalletBalance } from '@/hooks/useWalletBalance';
import { useAuth } from '@/hooks/useAuth';
import { walletService } from '@/services/walletService';
import { authApiService } from '@/services/auth.service';
import { useAuthStore } from '@/store/authStore';

jest.mock('@/services/walletService', () => ({
  walletService: {
    fetchBalance: jest.fn(),
    getCachedBalance: jest.fn(),
    prefetchBalance: jest.fn(),
    checkSufficientBalance: jest.fn(),
    clearCache: jest.fn(),
  },
}));

jest.mock('@/services/auth.service', () => ({
  authApiService: {
    getCurrentUser: jest.fn(),
  },
}));

const mockFetchBalance = walletService.fetchBalance as jest.Mock;
const mockGetCachedBalance = walletService.getCachedBalance as jest.Mock;
const mockPrefetchBalance = walletService.prefetchBalance as jest.Mock;
const mockClearCache = walletService.clearCache as jest.Mock;
const mockGetCurrentUser = authApiService.getCurrentUser as jest.Mock;

const BALANCE = {
  available: 1250.5,
  locked: 100,
  pending: 50,
  total: 1400.5,
  currency: 'USD',
};

const USER = { id: 'u1', email: 'user@example.com', role: 'Customer' as const };

function connectAuth() {
  localStorage.setItem('authToken', 'test-token');
  act(() => {
    useAuthStore.getState().setUser(USER);
  });
}

describe('useWalletBalance — reset on disconnect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    act(() => {
      useAuthStore.getState().clearUser();
    });
    mockFetchBalance.mockResolvedValue(BALANCE);
    mockGetCachedBalance.mockReturnValue(null);
    mockPrefetchBalance.mockResolvedValue(undefined);
    mockGetCurrentUser.mockResolvedValue({
      data: { id: USER.id, email: USER.email, role: 'customer' },
    });
  });

  it('loads the balance while authenticated', async () => {
    connectAuth();
    const { result } = renderHook(() => useWalletBalance());

    await waitFor(() => expect(result.current.balance).toEqual(BALANCE));
    expect(result.current.optimisticBalance).toEqual(BALANCE);
  });

  it('resets balance to null when useAuth disconnect runs', async () => {
    connectAuth();
    const { result } = renderHook(() => useWalletBalance());
    await waitFor(() => expect(result.current.balance).toEqual(BALANCE));

    const { result: auth } = renderHook(() => useAuth());
    await waitFor(() => expect(auth.current.isAuthenticated).toBe(true));

    act(() => {
      auth.current.disconnect();
    });

    expect(auth.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(result.current.balance).toBeNull();
    expect(result.current.optimisticBalance).toBeNull();
    expect(mockClearCache).toHaveBeenCalled();
  });

  it('keeps the balance null after reconnect until refetch', async () => {
    connectAuth();
    const { result } = renderHook(() => useWalletBalance());
    await waitFor(() => expect(result.current.balance).toEqual(BALANCE));

    act(() => {
      useAuthStore.getState().clearUser();
    });
    expect(result.current.balance).toBeNull();

    const fetchCallsAfterDisconnect = mockFetchBalance.mock.calls.length;

    // Reconnect: balance must NOT reappear on its own.
    connectAuth();
    expect(result.current.balance).toBeNull();
    expect(result.current.optimisticBalance).toBeNull();
    expect(mockFetchBalance.mock.calls.length).toBe(fetchCallsAfterDisconnect);

    // Only an explicit refetch brings it back.
    await act(async () => {
      await result.current.refetch();
    });
    expect(result.current.balance).toEqual(BALANCE);
    expect(result.current.optimisticBalance).toEqual(BALANCE);
  });

  it('resetBalance clears the balance and the service cache', async () => {
    connectAuth();
    const { result } = renderHook(() => useWalletBalance());
    await waitFor(() => expect(result.current.balance).toEqual(BALANCE));

    act(() => {
      result.current.resetBalance();
    });

    expect(result.current.balance).toBeNull();
    expect(result.current.optimisticBalance).toBeNull();
    expect(mockClearCache).toHaveBeenCalledTimes(1);
  });
});
