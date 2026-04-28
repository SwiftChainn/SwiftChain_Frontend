import axios from 'axios';
import { commandPaletteService, type DeliverySummary } from '../commandPaletteService';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('commandPaletteService', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('fetches deliveries from the backend API endpoint', async () => {
    const mockResponse: DeliverySummary[] = [
      { id: '1', title: 'Parcel One', status: 'In transit' },
    ];

    mockedAxios.get.mockResolvedValue({ data: mockResponse });

    const result = await commandPaletteService.fetchDeliveries();

    expect(mockedAxios.get).toHaveBeenCalledWith('/api/deliveries');
    expect(result).toEqual(mockResponse);
  });

  it('returns deliveries when API response wraps items', async () => {
    const wrappedResponse = { items: [{ id: '2', title: 'Parcel Two', status: 'Delivered' }] };

    mockedAxios.get.mockResolvedValue({ data: wrappedResponse });

    const result = await commandPaletteService.fetchDeliveries();

    expect(result).toEqual(wrappedResponse.items);
  });
});
