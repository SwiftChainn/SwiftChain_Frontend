import api from '@/lib/api';
import { walletService, type WalletBalance } from '../walletService';

jest.mock('@/lib/api', () => ({ __esModule: true, default: { get: jest.fn() } }));
const balance = (available: number): WalletBalance => ({ available, locked: 0, pending: 0, total: available, currency: 'USD' });
function deferred<T>() {
  let resolve!: (_value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('authToken', 'synthetic-user-a');
  walletService.clearCache();
  jest.resetAllMocks();
});

it('coalesces parallel balance reads into one backend request', async () => {
  const response = deferred<{ data: { data: WalletBalance } }>();
  (api.get as jest.Mock).mockReturnValue(response.promise);
  const first = walletService.fetchBalance();
  const second = walletService.fetchBalance();
  expect(api.get).toHaveBeenCalledTimes(1);
  response.resolve({ data: { data: balance(50) } });
  expect(await first).toEqual(balance(50));
  expect(await second).toEqual(balance(50));
});

it('does not let an old request overwrite the cache after a forced refresh', async () => {
  const old = deferred<{ data: { data: WalletBalance } }>();
  const fresh = deferred<{ data: { data: WalletBalance } }>();
  (api.get as jest.Mock).mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
  const opening = walletService.fetchBalance();
  const refresh = walletService.fetchBalance(true);
  fresh.resolve({ data: { data: balance(200) } });
  await refresh;
  old.resolve({ data: { data: balance(10) } });
  await opening;
  expect(walletService.getCachedBalance()?.available).toBe(200);
});

it('rejects an in-flight response belonging to a previous account', async () => {
  const response = deferred<{ data: { data: WalletBalance } }>();
  (api.get as jest.Mock).mockReturnValue(response.promise);
  const request = walletService.fetchBalance();
  localStorage.setItem('authToken', 'synthetic-user-b');
  response.resolve({ data: { data: balance(50) } });
  await expect(request).rejects.toThrow('Wallet account changed');
  expect(walletService.getCachedBalance()).toBeNull();
});

it('rejects malformed API data instead of fabricating a balance', async () => {
  (api.get as jest.Mock).mockResolvedValue({ data: { data: { available: '50' } } });
  await expect(walletService.fetchBalance()).rejects.toThrow('invalid wallet balance');
  expect(walletService.getCachedBalance()).toBeNull();
});
