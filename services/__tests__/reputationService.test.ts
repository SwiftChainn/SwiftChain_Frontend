import api from '@/lib/api';
import { reputationService } from '../reputationService';
import { readSorobanReputation } from '../sorobanReputationService';

jest.mock('@/lib/api', () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock('../sorobanReputationService', () => ({ readSorobanReputation: jest.fn() }));

beforeEach(() => { jest.resetAllMocks(); });

it('uses backend wallet ownership metadata and displays the RPC score instead of an API score', async () => {
  (api.get as jest.Mock).mockResolvedValue({ data: { success: true, data: {
    driverId: 'driver/a', walletAddress: 'synthetic-testnet-wallet', onChainScore: 9999,
  } } });
  (readSorobanReputation as jest.Mock).mockResolvedValue({ score: 80, network: 'testnet', ledgerSequence: 123 });
  const signal = new AbortController().signal;
  const value = await reputationService.getDriverReputation('driver/a', signal);
  expect(api.get).toHaveBeenCalledWith('/fleet/drivers/driver%2Fa/reputation', { signal });
  expect(readSorobanReputation).toHaveBeenCalledWith('synthetic-testnet-wallet', signal);
  expect(value).toMatchObject({ driverId: 'driver/a', onChainScore: 80, network: 'testnet', ledgerSequence: 123 });
});

it.each([
  { driverId: 'another-driver', walletAddress: 'synthetic-testnet-wallet' },
  { driverId: 'driver-a', onChainScore: 80 },
])('rejects missing or mismatched backend wallet metadata', async body => {
  (api.get as jest.Mock).mockResolvedValue({ data: body });
  await expect(reputationService.getDriverReputation('driver-a')).rejects.toThrow('matching driver wallet');
  expect(readSorobanReputation).not.toHaveBeenCalled();
});

it('does not render a cached API score when the node read fails', async () => {
  (api.get as jest.Mock).mockResolvedValue({ data: { driverId: 'driver-a', walletAddress: 'synthetic-testnet-wallet', onChainScore: 80 } });
  (readSorobanReputation as jest.Mock).mockRejectedValue(new Error('Node unavailable'));
  await expect(reputationService.getDriverReputation('driver-a')).rejects.toThrow('Node unavailable');
});
