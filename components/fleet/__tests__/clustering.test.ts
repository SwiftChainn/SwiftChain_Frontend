import { clusterDrivers } from '@/components/fleet/clustering';
import type { Driver } from '@/types/fleet';

function driver(id: string, lat: number, lng: number): Driver {
  return {
    id,
    name: `Driver ${id}`,
    phone: '+1',
    vehicleType: 'Van',
    vehiclePlate: id,
    status: 'active',
    rating: 5,
    activeDeliveries: 0,
    completedDeliveries: 0,
    location: { lat, lng, updatedAt: '2026-04-25T00:00:00Z' },
  };
}

describe('clusterDrivers', () => {
  it('returns an empty array for no drivers', () => {
    expect(clusterDrivers([])).toEqual([]);
  });

  it('groups nearby drivers into a single cluster', () => {
    // All three points sit inside the cell starting at lat=6.5 (6.5/0.05=130),
    // lng=3.4 (3.4/0.05=68). Picking values from the cell interior avoids
    // floor() boundary surprises.
    const drivers = [
      driver('a', 6.51, 3.41),
      driver('b', 6.52, 3.42),
      driver('c', 6.53, 3.43),
    ];
    const clusters = clusterDrivers(drivers, 0.05);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].drivers).toHaveLength(3);
  });

  it('separates drivers in different cells', () => {
    const drivers = [
      driver('a', 6.5, 3.4),
      driver('b', 9.0, 7.4),
    ];
    const clusters = clusterDrivers(drivers, 0.05);
    expect(clusters).toHaveLength(2);
    for (const c of clusters) {
      expect(c.drivers).toHaveLength(1);
    }
  });

  it('places cluster centroid at the mean of grouped driver positions', () => {
    const drivers = [
      driver('a', 6.51, 3.41),
      driver('b', 6.53, 3.43),
    ];
    const [cluster] = clusterDrivers(drivers, 0.05);
    expect(cluster.lat).toBeCloseTo(6.52, 3);
    expect(cluster.lng).toBeCloseTo(3.42, 3);
  });
});
