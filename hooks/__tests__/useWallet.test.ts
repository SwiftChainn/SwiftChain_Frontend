import { renderHook, act } from '@testing-library/react';
import { useWallet } from '@/hooks/useWallet';
import { useWalletStore, WALLET_STORAGE_KEY } from '@/store/walletStore';
import { walletService } from '@/services/walletService';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/services/walletService', () => ({
  walletService: {
    disconnect: jest
      .fn()
      .mockResolvedValue({ success: true, message: 'Disconnected' }),
  },
}));

describe('useWallet', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    act(() => {
      useWalletStore.getState().setWallet('0xABC123def456', 1);
    });
    localStorage.setItem(
      WALLET_STORAGE_KEY,
      JSON.stringify({ address: '0xABC123def456' })
    );
  });

  afterEach(() => {
    act(() => {
      useWalletStore.getState().clearWalletState();
    });
    localStorage.clear();
  });

  it('should expose connected wallet address and isConnected from store', () => {
    const { result } = renderHook(() => useWallet());
    expect(result.current.isConnected).toBe(true);
    expect(result.current.address).toBe('0xABC123def456');
  });

  it('should call walletService.disconnect once on disconnect', async () => {
    const { result } = renderHook(() => useWallet());
    await act(async () => {
      await result.current.disconnect();
    });
    expect(walletService.disconnect).toHaveBeenCalledTimes(1);
  });

  it('should strip public key — clear address and isConnected from Zustand', async () => {
    const { result } = renderHook(() => useWallet());
    await act(async () => {
      await result.current.disconnect();
    });
    expect(result.current.address).toBeNull();
    expect(result.current.isConnected).toBe(false);
  });

  it('should remove wallet cache from localStorage on disconnect', async () => {
    const { result } = renderHook(() => useWallet());
    await act(async () => {
      await result.current.disconnect();
    });
    expect(localStorage.getItem(WALLET_STORAGE_KEY)).toBeNull();
  });

  it('should redirect to /login after disconnect', async () => {
    const { result } = renderHook(() => useWallet());
    await act(async () => {
      await result.current.disconnect();
    });
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('should still clear state and redirect even if API call fails', async () => {
    (walletService.disconnect as jest.Mock).mockRejectedValueOnce(
      new Error('Network error')
    );
    const { result } = renderHook(() => useWallet());
    await act(async () => {
      await result.current.disconnect();
    });
    expect(result.current.address).toBeNull();
    expect(result.current.isConnected).toBe(false);
    expect(localStorage.getItem(WALLET_STORAGE_KEY)).toBeNull();
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});
