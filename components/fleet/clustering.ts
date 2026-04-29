import type { Driver } from '@/types/fleet';

export interface MapCluster {
  id: string;
  lat: number;
  lng: number;
  drivers: Driver[];
}

/**
 * Grid-based clustering for fleet map pins.
 *
 * Why: avoids adding an extra dependency (react-leaflet-cluster). For a fleet
 * dashboard the driver count is bounded (~hundreds), so an O(N) bucketing
 * pass at a coarse resolution is sufficient and predictable. Each cluster's
 * representative position is the centroid of its drivers.
 */
export function clusterDrivers(
  drivers: Driver[],
  cellSize = 0.05,
): MapCluster[] {
  const buckets: Record<string, Driver[]> = {};

  for (const d of drivers) {
    const key = `${Math.floor(d.location.lat / cellSize)}:${Math.floor(d.location.lng / cellSize)}`;
    const bucket = buckets[key];
    if (bucket) {
      bucket.push(d);
    } else {
      buckets[key] = [d];
    }
  }

  const clusters: MapCluster[] = [];
  for (const key of Object.keys(buckets)) {
    const group = buckets[key];
    const lat =
      group.reduce((s: number, d: Driver) => s + d.location.lat, 0) /
      group.length;
    const lng =
      group.reduce((s: number, d: Driver) => s + d.location.lng, 0) /
      group.length;
    clusters.push({ id: key, lat, lng, drivers: group });
  }
  return clusters;
}
