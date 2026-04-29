import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface DisconnectResponse {
  success: boolean;
  message: string;
}

export interface BalanceResponse {
  success: boolean;
  balance: number;   // XLM balance as a number
  message?: string;
}

/**
 * walletService — responsible for all wallet-related API communication.
 * The hook calls this; components never call this directly.
 */
export const walletService = {
  async disconnect(): Promise<DisconnectResponse> {
    const { data } = await axios.post<DisconnectResponse>(
      `${API_BASE_URL}/api/wallet/disconnect`
    );
    return data;
  },

  /**
   * Fetch the XLM balance for the given wallet address from the backend.
   * The backend is the single source of truth — no Stellar SDK calls in the browser.
   */
  async getBalance(address: string): Promise<BalanceResponse> {
    const { data } = await axios.get<BalanceResponse>(
      `${API_BASE_URL}/api/wallet/balance`,
      { params: { address } }
    );
    return data;
  },
};