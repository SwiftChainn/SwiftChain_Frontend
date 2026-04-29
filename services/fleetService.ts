import axios from 'axios';
import type { Driver, FleetResponse } from '@/types/fleet';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

/**
 * fleetService — all fleet-related API communication.
 * Hooks call this; components never call this directly.
 */
export const fleetService = {
  async getFleet(signal?: AbortSignal): Promise<FleetResponse> {
    const { data } = await axios.get<FleetResponse>(
      `${API_BASE_URL}/fleet/drivers`,
      { signal },
    );
    return data;
  },

  async getDriver(id: string, signal?: AbortSignal): Promise<Driver> {
    const { data } = await axios.get<Driver>(
      `${API_BASE_URL}/fleet/drivers/${id}`,
      { signal },
    );
    return data;
  },
};
