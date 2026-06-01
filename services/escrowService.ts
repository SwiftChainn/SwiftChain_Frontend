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

export interface LockEscrowParams {
  deliveryId: string;
  amount: number;
  currency: string;
  walletAddress: string;
}

export interface LockEscrowResponse {
  success: boolean;
  message: string;
  escrowId?: string;
  transactionHash?: string;
  lockedAmount?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

export interface DisputeEvidenceFile {
  file: File;
  description?: string;
}

export interface OpenDisputeParams {
  deliveryId: string;
  transactionId: string;
  reason: 'damaged_items' | 'non_delivery' | 'incorrect_items' | 'other';
  description: string;
  evidenceFiles?: File[];
  walletAddress: string;
}

export interface OpenDisputeResponse {
  success: boolean;
  message: string;
  disputeId?: string;
  transactionHash?: string;
}

/**
 * escrowService — responsible for all escrow-related API communication.
 * The hook calls this; components never call this directly.
 */
export const escrowService = {
  async lockEscrow(params: LockEscrowParams): Promise<LockEscrowResponse> {
    const { data } = await axios.post<LockEscrowResponse>(
      `${API_BASE_URL}/api/escrow/lock`,
      params
    );
    return data;
  },

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

  async openDispute(params: OpenDisputeParams): Promise<OpenDisputeResponse> {
    const formData = new FormData();
    formData.append('deliveryId', params.deliveryId);
    formData.append('transactionId', params.transactionId);
    formData.append('reason', params.reason);
    formData.append('description', params.description);
    formData.append('walletAddress', params.walletAddress);

    if (params.evidenceFiles && params.evidenceFiles.length > 0) {
      params.evidenceFiles.forEach((file, index) => {
        formData.append(`evidenceFiles`, file);
      });
    }

    const { data } = await axios.post<OpenDisputeResponse>(
      `${API_BASE_URL}/api/escrow/dispute`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return data;
  },
};