export interface DriverInfo {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  rating?: number;
}

export interface Delivery {
  id: string;
  trackingNumber: string;
  senderId: string;
  driverId?: string;
  driver?: DriverInfo;
  status: 'PENDING' | 'ACCEPTED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  origin: string;
  destination: string;
  escrowStatus: 'LOCKED' | 'RELEASED' | 'REFUNDED' | 'NOT_LOCKED';
  amount: number;
  currency?: string;
  packageDescription?: string;
  weight?: number;
  estimatedDeliveryTime?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}
