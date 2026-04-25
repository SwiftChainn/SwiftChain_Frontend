import axios from 'axios';
import { fleetService } from '@/services/fleetService';
import type { FleetResponse } from '@/types/fleet';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? '';

describe('fleetService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GETs /fleet/drivers and returns the response payload', async () => {
    const fleet: FleetResponse = {
      drivers: [],
      summary: {
        totalDrivers: 0,
        activeDrivers: 0,
        onDelivery: 0,
        idle: 0,
        offline: 0,
      },
    };
    mockedAxios.get.mockResolvedValueOnce({ data: fleet });

    const result = await fleetService.getFleet();

    expect(mockedAxios.get).toHaveBeenCalledWith(
      `${apiBase}/fleet/drivers`,
      expect.any(Object),
    );
    expect(result).toEqual(fleet);
  });

  it('GETs /fleet/drivers/:id for a single driver', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        id: 'd1',
        name: 'Alice',
        phone: '+1',
        vehicleType: 'Van',
        vehiclePlate: 'AB-1',
        status: 'active',
        rating: 5,
        activeDeliveries: 0,
        completedDeliveries: 0,
        location: { lat: 0, lng: 0, updatedAt: '2026-04-25T00:00:00Z' },
      },
    });

    const driver = await fleetService.getDriver('d1');

    expect(mockedAxios.get).toHaveBeenCalledWith(
      `${apiBase}/fleet/drivers/d1`,
      expect.any(Object),
    );
    expect(driver.id).toBe('d1');
  });

  it('forwards an AbortSignal so callers can cancel requests', async () => {
    const controller = new AbortController();
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        drivers: [],
        summary: {
          totalDrivers: 0,
          activeDrivers: 0,
          onDelivery: 0,
          idle: 0,
          offline: 0,
        },
      },
    });

    await fleetService.getFleet(controller.signal);

    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: controller.signal }),
    );
  });
});
