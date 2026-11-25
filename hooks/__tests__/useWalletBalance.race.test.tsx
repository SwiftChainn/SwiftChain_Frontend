import { StrictMode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useWalletBalance } from '../useWalletBalance';
import { walletService, type WalletBalance } from '@/services/walletService';

jest.mock('@/services/walletService', () => ({ walletService: {
  getCachedBalance: jest.fn(), fetchBalance: jest.fn(), checkSufficientBalance: jest.fn(),
} }));

const balance = (available: number): WalletBalance => ({ available, locked: 0, pending: 0, total: available, currency: 'USD' });
function deferred<T>() {
  let resolve!: (_value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

beforeEach(() => {
  jest.resetAllMocks();
  (walletService.getCachedBalance as jest.Mock).mockReturnValue(null);
});

it('exposes a cached low balance while the modal-opening fetch is pending', async () => {
  (walletService.getCachedBalance as jest.Mock).mockReturnValue(balance(10));
  (walletService.fetchBalance as jest.Mock).mockReturnValue(new Promise(() => {}));
  const { result } = renderHook(() => useWalletBalance({ requiredAmount: 100 }));
  expect(result.current.optimisticBalance?.available).toBe(10);
  expect(result.current.hasSufficientBalance).toBe(false);
  expect((await result.current.checkBalance(100)).hasSufficientBalance).toBe(false);
  expect(walletService.fetchBalance).toHaveBeenCalledTimes(1);
});

it('keeps a newer refresh result when an older request finishes last', async () => {
  const opening = deferred<WalletBalance>();
  const refresh = deferred<WalletBalance>();
  (walletService.fetchBalance as jest.Mock).mockReturnValueOnce(opening.promise).mockReturnValueOnce(refresh.promise);
  const { result } = renderHook(() => useWalletBalance({ requiredAmount: 100 }));
  act(() => { void result.current.refetch(); });
  await act(async () => { refresh.resolve(balance(200)); });
  await waitFor(() => expect(result.current.balance?.available).toBe(200));
  await act(async () => { opening.resolve(balance(10)); });
  expect(result.current.balance?.available).toBe(200);
  expect(result.current.hasSufficientBalance).toBe(true);
  expect(result.current.isLoading).toBe(false);
});

it('ignores the request from a cleaned-up Strict Mode effect', async () => {
  const previousMount = deferred<WalletBalance>();
  const currentMount = deferred<WalletBalance>();
  (walletService.fetchBalance as jest.Mock).mockReturnValueOnce(previousMount.promise).mockReturnValueOnce(currentMount.promise);
  const { result } = renderHook(() => useWalletBalance(), { wrapper: StrictMode });
  await act(async () => { previousMount.resolve(balance(10)); });
  expect(result.current.balance).toBeNull();
  await act(async () => { currentMount.resolve(balance(200)); });
  expect(result.current.balance?.available).toBe(200);
});

it('does not invent a zero balance when no cached or API balance exists', async () => {
  (walletService.checkSufficientBalance as jest.Mock).mockRejectedValue(new Error('Backend unavailable'));
  const { result } = renderHook(() => useWalletBalance({ fetchOnMount: false }));
  await act(async () => {
    await expect(result.current.checkBalance(100)).rejects.toThrow('Backend unavailable');
  });
  expect(result.current.balance).toBeNull();
  expect(result.current.hasSufficientBalance).toBe(false);
});
