import axios from '@/lib/httpClient';
import { FeeEstimate, FeeEstimationResult } from '@/types/fee';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

/**
 * feeService — responsible for all fee estimation API communication.
 * The hook calls this; components never call this directly.
 * 
 * Backend is the single source of truth for fee calculations.
 */
export const feeService = {
  /**
   * Fetch estimated XLM fee for a transaction.
   * The backend calculates fees based on current network conditions and transaction size.
   * 
   * @param amount - The transaction amount in the base currency
   * @param currency - Currency code (e.g., 'USD', 'EUR')
   * @returns Fee estimate with breakdown of base, network, and platform fees
   */
  async getEstimatedFee(amount: number, currency: string = 'USD'): Promise<FeeEstimate> {
    const { data } = await axios.get<FeeEstimationResult>(
      `${API_BASE_URL}/api/wallet/fees/estimate`,
      {
        params: {
          amount,
          currency,
        },
      }
    );

    if (!data.success || !('data' in data)) {
      const message = 'error' in data ? data.error : undefined;
      throw new Error(message || 'Failed to estimate fees');
    }

    return data.data;
  },
};
