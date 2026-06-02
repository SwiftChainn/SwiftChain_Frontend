export interface QRHandoffToken {
  id: string;
  deliveryId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  verifiedAt?: string;
}

export interface HandoffQRData {
  qrData: string;
  expiresAt: string;
  deliveryId: string;
  token: string;
}

export interface Shipment {
  id: string;
  deliveryId: string;
  status: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'HANDED_OFF';
  recipientName?: string;
  recipientPhone?: string;
  recipientEmail?: string;
  handoffVerifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}
