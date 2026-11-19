'use client';

import dynamic from 'next/dynamic';

export { calculateEstimatedDeliveryDate, calculateRemainingEtaMinutes } from './trackingEta';

export interface TrackingMapProps {
  deliveryId: string | null;
  className?: string;
  height?: string;
  showControls?: boolean;
  onMapError?: (_error: string) => void;
}

// Leaflet reads browser globals when its module loads.
export const TrackingMap = dynamic(() => import('./TrackingMapClient'), {
  ssr: false,
});

export default TrackingMap;
