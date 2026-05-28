import { deliveriesService } from '../deliveries.service';
import { apiClient } from '../api';

// Mock axios
jest.mock('../api', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

describe('deliveriesService', () => {
  const mockDeliveries = [
    {
      id: '1',
      trackingNumber: 'TRK001',
      status: 'DELIVERED',
      origin: 'Nairobi',
      destination: 'Mombasa',
      amount: 100,
      escrowStatus: 'RELEASED',
      senderId: 'sender1',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch all deliveries without filters', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({ data: mockDeliveries });

    const result = await deliveriesService.getDeliveries();

    expect(apiClient.get).toHaveBeenCalledWith('/deliveries');
    expect(result).toEqual(mockDeliveries);
  });

  it('should fetch deliveries with search filter', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({ data: mockDeliveries });

    await deliveriesService.getDeliveries({ search: 'TRK001' });

    expect(apiClient.get).toHaveBeenCalledWith('/deliveries?search=TRK001');
  });

  it('should fetch deliveries with status filter', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({ data: mockDeliveries });

    await deliveriesService.getDeliveries({ status: 'DELIVERED' });

    expect(apiClient.get).toHaveBeenCalledWith('/deliveries?status=DELIVERED');
  });

  it('should fetch deliveries with sortBy filter', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({ data: mockDeliveries });

    await deliveriesService.getDeliveries({ sortBy: 'date-desc' });

    expect(apiClient.get).toHaveBeenCalledWith('/deliveries?sortBy=date-desc');
  });

  it('should fetch deliveries with multiple filters', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({ data: mockDeliveries });

    await deliveriesService.getDeliveries({
      search: 'TRK001',
      status: 'DELIVERED',
      sortBy: 'date-asc',
    });

    const callUrl = (apiClient.get as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain('search=TRK001');
    expect(callUrl).toContain('status=DELIVERED');
    expect(callUrl).toContain('sortBy=date-asc');
  });

  it('should fetch delivery by ID', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({ data: mockDeliveries[0] });

    const result = await deliveriesService.getDeliveryById('1');

    expect(apiClient.get).toHaveBeenCalledWith('/deliveries/1');
    expect(result).toEqual(mockDeliveries[0]);
  });

  it('should handle API errors', async () => {
    const error = new Error('Network error');
    (apiClient.get as jest.Mock).mockRejectedValue(error);

    await expect(deliveriesService.getDeliveries()).rejects.toThrow('Network error');
  });
});
