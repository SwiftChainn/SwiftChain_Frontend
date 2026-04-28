import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface EscrowDetails {
  id: string;
  deliveryId: string;
  amount: string;
  currency: string;
  status: 'locked' | 'released' | 'disputed';
  sender: string;
  recipient: string;
  driver: string;
  lockedAt: string;
}

export interface ReleaseEscrowParams {
  escrowId: string;
  deliveryId: string;
  walletAddress: string;
  signature?: string;
}

export interface ReleaseEscrowResponse {
  success: boolean;
  message: string;
  transactionHash?: string;
  releasedAmount?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

/**
 * escrowService — responsible for all escrow-related API communication.
 * The hook calls this; components never call this directly.
 */
export const escrowService = {
  async getEscrowDetails(escrowId: string): Promise<ApiResponse<EscrowDetails>> {
    const { data } = await axios.get<ApiResponse<EscrowDetails>>(
      `${API_BASE_URL}/api/escrow/${escrowId}`
    );
    return data;
  },

  async releaseEscrow(params: ReleaseEscrowParams): Promise<ReleaseEscrowResponse> {
    const { data } = await axios.post<ReleaseEscrowResponse>(
      `${API_BASE_URL}/api/escrow/release`,
      params
    );
    return data;
  },

  async confirmDelivery(deliveryId: string, walletAddress: string): Promise<ApiResponse<void>> {
    const { data } = await axios.post<ApiResponse<void>>(
      `${API_BASE_URL}/api/deliveries/${deliveryId}/confirm`,
      { walletAddress }
    );
    return data;
  },
};