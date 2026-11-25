import api from '@/lib/api';
import { readSorobanReputation } from './sorobanReputationService';

export interface DriverReputationData {
  driverId: string;
  onChainScore: number;
  walletAddress: string;
  network: 'testnet' | 'mainnet';
  ledgerSequence?: number;
  verifiedAt: string;
}

/**
 * reputationService — fetches a driver's tokenized on-chain reputation.
 *
 * The backend owns the driver-to-wallet mapping. The on-chain score is read
 * from the configured Soroban node; an API-supplied score is never presented
 * as a verified ledger value.
 *
 * Hooks call this; components never call this directly.
 */
export const reputationService = {
  async getDriverReputation(
    driverId: string,
    signal?: AbortSignal,
  ): Promise<DriverReputationData> {
    const { data: response } = await api.get<unknown>(
      `/fleet/drivers/${encodeURIComponent(driverId)}/reputation`,
      { signal },
    );
    signal?.throwIfAborted();
    if (response && typeof response === 'object' && 'success' in response && response.success !== true) {
      throw new Error('The backend reputation request was not successful');
    }
    const body = response && typeof response === 'object' && 'data' in response
      ? response.data : response;
    if (!body || typeof body !== 'object' || !('walletAddress' in body) ||
      typeof body.walletAddress !== 'string' || !body.walletAddress.trim() ||
      ('driverId' in body && body.driverId !== driverId)) {
      throw new Error('The backend did not provide a matching driver wallet');
    }
    const walletAddress = body.walletAddress.trim();
    const verified = await readSorobanReputation(walletAddress, signal);
    return {
      driverId, walletAddress, onChainScore: verified.score,
      network: verified.network, ledgerSequence: verified.ledgerSequence,
      verifiedAt: new Date().toISOString(),
    };
  },
};
