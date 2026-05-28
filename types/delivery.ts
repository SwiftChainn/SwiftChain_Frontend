export type DeliveryStatus = 'PENDING' | 'ACCEPTED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
export type EscrowStatus = 'LOCKED' | 'RELEASED' | 'REFUNDED' | 'NOT_LOCKED';

export interface Delivery {
  id: string;
  trackingNumber: string;
  senderId: string;
  driverId?: string;
  status: DeliveryStatus;
  origin: string;
  destination: string;
  escrowStatus: EscrowStatus;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export interface StatusEvent {
  id: string;
  deliveryId: string;
  status: DeliveryStatus;
  timestamp: string;
  description?: string;
}

export interface StatusTimeline {
  deliveryId: string;
  events: StatusEvent[];
}
