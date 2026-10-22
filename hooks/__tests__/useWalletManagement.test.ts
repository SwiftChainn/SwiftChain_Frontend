import { renderHook, act, waitFor } from '@testing-library/react';
import { useWalletManagement } from '@/hooks/useWalletManagement';
import { walletService } from '@/services/walletService';
import { useWalletStore } from '@/store/walletStore';
import type { ConnectedWallet } from '@/types/wallet.types';

jest.mock('@/services/walletService', () => ({
  walletService: {
    getConnectedWallets: jest.fn(),
    disconnectWallet: jest.fn(),
  },
}));

const WALLETS: ConnectedWallet[] = [
  {
    id: 'w1',
    address: 'GABC123DEF456STELLAR',
    provider: 'freighter',
    network: 'testnet',
    isPrimary: true,
    connectedAt: '2026-01-15T10:30:00Z',
  },
  {
    id: 'w2',
    address: 'GDEF789GHI012STELLAR',
    provider: 'ledger',
    network: 'public',
    isPrimary: false,
    connectedAt: '2026-02-20T08:00:00Z',
  },
];

describe('useWalletManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    act(() => {
      useWalletStore.getState().clearWalletState();
    });
    localStorage.clear();
  });

  it('loads connected wallets from the service', async () => {
    (walletService.getConnectedWallets as jest.Mock).mockResolvedValueOnce(WALLETS);

    const { result } = renderHook(() => useWalletManagement());

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(walletService.getConnectedWallets).toHaveBeenCalledTimes(1);
    expect(result.current.wallets).toEqual(WALLETS);
    expect(result.current.error).toBeNull();
  });

  it('surfaces the service error message when loading fails', async () => {
    (walletService.getConnectedWallets as jest.Mock).mockRejectedValueOnce(
      new Error('Backend unavailable')
    );

    const { result } = renderHook(() => useWalletManagement());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Backend unavailable');
    expect(result.current.wallets).toEqual([]);
  });

  it('exposes the active wallet matching the wallet context address', async () => {
    act(() => {
      useWalletStore.getState().setWallet('GABC123DEF456STELLAR', 0);
    });
    (walletService.getConnectedWallets as jest.Mock).mockResolvedValueOnce(WALLETS);

    const { result } = renderHook(() => useWalletManagement());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.activeWallet?.id).toBe('w1');
    expect(result.current.activeAddress).toBe('GABC123DEF456STELLAR');
    expect(result.current.isConnected).toBe(true);
  });

  it('clears a stale wallet session that is no longer linked on the backend', async () => {
    act(() => {
      useWalletStore.getState().setWallet('GSTALESTALE0000000000', 0);
    });
    (walletService.getConnectedWallets as jest.Mock).mockResolvedValueOnce(WALLETS);

    const { result } = renderHook(() => useWalletManagement());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await waitFor(() => expect(result.current.activeAddress).toBeNull());
    expect(result.current.isConnected).toBe(false);
  });

  it('setActiveWallet syncs the selected wallet into the wallet context', async () => {
    (walletService.getConnectedWallets as jest.Mock).mockResolvedValueOnce(WALLETS);

    const { result } = renderHook(() => useWalletManagement());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setActiveWallet(WALLETS[1]);
    });

    expect(result.current.activeAddress).toBe('GDEF789GHI012STELLAR');
    expect(result.current.activeWallet?.id).toBe('w2');
  });

  it('disconnectWallet removes the wallet and clears the context when it was active', async () => {
    act(() => {
      useWalletStore.getState().setWallet('GABC123DEF456STELLAR', 0);
    });
    (walletService.getConnectedWallets as jest.Mock).mockResolvedValueOnce(WALLETS);
    (walletService.disconnectWallet as jest.Mock).mockResolvedValueOnce({
      success: true,
      message: 'Disconnected',
    });

    const { result } = renderHook(() => useWalletManagement());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let ok = false;
    await act(async () => {
      ok = await result.current.disconnectWallet(WALLETS[0]);
    });

    expect(ok).toBe(true);
    expect(walletService.disconnectWallet).toHaveBeenCalledWith('w1');
    expect(result.current.wallets.map((wallet) => wallet.id)).toEqual(['w2']);
    expect(result.current.activeAddress).toBeNull();
  });

  it('keeps other wallets and the active context when disconnecting a non-active wallet', async () => {
    act(() => {
      useWalletStore.getState().setWallet('GABC123DEF456STELLAR', 0);
    });
    (walletService.getConnectedWallets as jest.Mock).mockResolvedValueOnce(WALLETS);
    (walletService.disconnectWallet as jest.Mock).mockResolvedValueOnce({
      success: true,
      message: 'Disconnected',
    });

    const { result } = renderHook(() => useWalletManagement());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.disconnectWallet(WALLETS[1]);
    });

    expect(result.current.activeAddress).toBe('GABC123DEF456STELLAR');
    expect(result.current.wallets.map((wallet) => wallet.id)).toEqual(['w1']);
  });

  it('reports an error and keeps the wallet when disconnect fails', async () => {
    (walletService.getConnectedWallets as jest.Mock).mockResolvedValueOnce(WALLETS);
    (walletService.disconnectWallet as jest.Mock).mockRejectedValueOnce(
      new Error('Could not unlink wallet')
    );

    const { result } = renderHook(() => useWalletManagement());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let ok = true;
    await act(async () => {
      ok = await result.current.disconnectWallet(WALLETS[0]);
    });

    expect(ok).toBe(false);
    expect(result.current.error).toBe('Could not unlink wallet');
    expect(result.current.wallets).toHaveLength(2);
  });

  it('refetch requests a fresh list from the service', async () => {
    (walletService.getConnectedWallets as jest.Mock).mockResolvedValue(WALLETS);

    const { result } = renderHook(() => useWalletManagement());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => expect(walletService.getConnectedWallets).toHaveBeenCalledTimes(2));
  });
});
