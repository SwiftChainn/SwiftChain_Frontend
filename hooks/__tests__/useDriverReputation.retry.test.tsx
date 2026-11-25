import { act, renderHook, waitFor } from '@testing-library/react';
import { useDriverReputation } from '../useDriverReputation';
import { reputationService } from '@/services/reputationService';
jest.mock('@/services/reputationService', () => ({ reputationService: { getDriverReputation: jest.fn() } }));
const fetchReputation = jest.mocked(reputationService.getDriverReputation);
beforeEach(() => jest.clearAllMocks());
it('settles an error and retries the same driver rather than staying loading', async () => {
  fetchReputation.mockRejectedValueOnce(new Error('Deployment unavailable'));
  const { result } = renderHook(() => useDriverReputation('driver-a'));
  await waitFor(() => expect(result.current.error).toBe('Deployment unavailable'));
  expect(result.current.isLoading).toBe(false);
  fetchReputation.mockResolvedValueOnce({ driverId: 'driver-a', walletAddress: 'test-wallet', onChainScore: 0, network: 'testnet', verifiedAt: '2026-11-25' });
  act(() => result.current.refetch());
  expect(result.current.isLoading).toBe(true);
  await waitFor(() => expect(result.current.onChainScore).toBe(0));
  expect(result.current.error).toBeNull();
});
