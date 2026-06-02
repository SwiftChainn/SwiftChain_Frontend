import { apiClient } from './api';
import { HandoffQRData, QRHandoffToken } from '../types/shipment';

export const shipmentHandoffService = {
  /**
   * Generate a QR code token for package handoff
   * Returns secure, time-sensitive token and QR data
   */
  generateHandoffQR: async (deliveryId: string): Promise<HandoffQRData> => {
    const { data } = await apiClient.post<HandoffQRData>(
      `/shipments/${deliveryId}/handoff-qr`,
      {}
    );
    return data;
  },

  /**
   * Verify a handoff QR code token
   * Called when recipient scans and confirms receipt
   */
  verifyHandoffQR: async (deliveryId: string, token: string): Promise<QRHandoffToken> => {
    const { data } = await apiClient.post<QRHandoffToken>(
      `/shipments/${deliveryId}/verify-handoff`,
      { token }
    );
    return data;
  },

  /**
   * Get the current handoff QR for a delivery
   * Allows driver to retrieve previously generated QR
   */
  getHandoffQR: async (deliveryId: string): Promise<HandoffQRData> => {
    const { data } = await apiClient.get<HandoffQRData>(
      `/shipments/${deliveryId}/handoff-qr`
    );
    return data;
  },
};
