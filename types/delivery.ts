export interface Delivery {
  id: string;
  trackingNumber: string;
  senderId: string;
  driverId?: string;
  status: 'PENDING' | 'ACCEPTED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  origin: string;
  destination: string;
  escrowStatus: 'LOCKED' | 'RELEASED' | 'REFUNDED' | 'NOT_LOCKED';
  amount: number;
  createdAt: string;
  updatedAt: string;
}
