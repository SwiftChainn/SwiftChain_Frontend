import { calculateDistanceKm } from '@/services/geofenceService';
import type { Coordinate, RouteData } from '@/types/tracking';

const DEFAULT_AVERAGE_SPEED_KMH = 40;

/**
 * Calculates remaining ETA in minutes for a delivery route based on physical
 * progress between origin, currentLocation, and destination, or falls back to
 * `routeData.estimatedTime` / distance-based calculation.
 */
export function calculateRemainingEtaMinutes(
  routeData: RouteData,
  currentLocation?: Coordinate | null,
): number | null {
  if (routeData.status === 'delivered') {
    return 0;
  }

  const baseEta =
    typeof routeData.estimatedTime === 'number'
      ? routeData.estimatedTime
      : typeof routeData.distance === 'number'
        ? Math.round((routeData.distance / DEFAULT_AVERAGE_SPEED_KMH) * 60)
        : null;

  if (
    currentLocation &&
    routeData.status === 'in_transit' &&
    routeData.origin &&
    routeData.destination
  ) {
    const totalDirectKm = calculateDistanceKm(
      routeData.origin,
      routeData.destination,
    );
    const remainingDirectKm = calculateDistanceKm(
      currentLocation,
      routeData.destination,
    );

    if (totalDirectKm > 0 && baseEta !== null) {
      const ratio = Math.min(1, Math.max(0, remainingDirectKm / totalDirectKm));
      return Math.max(1, Math.round(baseEta * ratio));
    }

    if (remainingDirectKm >= 0) {
      return Math.max(
        0,
        Math.round((remainingDirectKm / DEFAULT_AVERAGE_SPEED_KMH) * 60),
      );
    }
  }

  return baseEta;
}

/**
 * Computes the ISO 8601 estimated delivery timestamp from a route timestamp
 * and ETA in minutes.
 */
export function calculateEstimatedDeliveryDate(
  timestamp: string | undefined,
  etaMinutes: number | null | undefined,
): string | null {
  if (!timestamp || typeof etaMinutes !== 'number' || !Number.isFinite(etaMinutes)) {
    return null;
  }
  const baseMs = Date.parse(timestamp);
  if (Number.isNaN(baseMs)) {
    return null;
  }
  return new Date(baseMs + etaMinutes * 60 * 1000).toISOString();
}
