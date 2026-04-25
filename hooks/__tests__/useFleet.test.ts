import { renderHook, act, waitFor } from '@testing-library/react';
import axios from 'axios';
import { useFleet } from '@/hooks/useFleet';
import { fleetService } from '@/services/fleetService';
import type { FleetResponse } from '@/types/fleet';

jest.mock('@/services/fleetService', () => ({
  fleetService: {
    getFleet: jest.fn(),
  },
}));

const mockFleet: FleetResponse = {
  drivers: [
    {
      id: 'd1',
      name: 'Alice',
      phone: '+15555550001',
      vehicleType: 'Van',
      vehiclePlate: 'AB-123',
      status: 'active',
      rating: 4.8,
      activeDeliveries: 1,
      completedDeliveries: 42,
      location: { lat: 6.5, lng: 3.4, updatedAt: '2026-04-25T10:00:00Z' },
    },
    {
      id: 'd2',
      name: 'Bob',
      phone: '+15555550002',
      vehicleType: 'Bike',
      vehiclePlate: 'XY-987',
      status: 'idle',
      rating: 4.5,
      activeDeliveries: 0,
      completedDeliveries: 18,
      location: { lat: 9.0, lng: 7.4, updatedAt: '2026-04-25T10:00:00Z' },
    },
  ],
  summary: {
    totalDrivers: 2,
    activeDrivers: 1,
    onDelivery: 0,
    idle: 1,
    offline: 0,
  },
};

describe('useFleet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads drivers and summary from the service', async () => {
    (fleetService.getFleet as jest.Mock).mockResolvedValueOnce(mockFleet);

    const { result } = renderHook(() => useFleet());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fleetService.getFleet).toHaveBeenCalledTimes(1);
    expect(result.current.drivers).toHaveLength(2);
    expect(result.current.summary?.totalDrivers).toBe(2);
    expect(result.current.error).toBeNull();
  });

  it('exposes a friendly error message when the API fails', async () => {
    (fleetService.getFleet as jest.Mock).mockRejectedValueOnce(
      new Error('Network down'),
    );

    const { result } = renderHook(() => useFleet());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Network down');
    expect(result.current.drivers).toEqual([]);
  });

  it('ignores cancelled requests and does not surface them as errors', async () => {
    const cancelError = new axios.Cancel('aborted');
    (fleetService.getFleet as jest.Mock).mockRejectedValueOnce(cancelError);

    const { result } = renderHook(() => useFleet());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
  });

  it('refetch triggers a fresh service call', async () => {
    (fleetService.getFleet as jest.Mock)
      .mockResolvedValueOnce(mockFleet)
      .mockResolvedValueOnce({
        ...mockFleet,
        summary: { ...mockFleet.summary, activeDrivers: 5 },
      });

    const { result } = renderHook(() => useFleet());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() =>
      expect(fleetService.getFleet).toHaveBeenCalledTimes(2),
    );
    await waitFor(() =>
      expect(result.current.summary?.activeDrivers).toBe(5),
    );
  });
});
