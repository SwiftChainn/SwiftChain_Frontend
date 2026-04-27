import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface DisconnectResponse {
  success: boolean;
  message: string;
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
};
