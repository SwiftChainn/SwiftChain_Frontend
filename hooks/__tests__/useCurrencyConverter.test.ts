import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useCurrencyConverter } from '@/hooks/useCurrencyConverter';
import { currencyRateService } from '@/services/currencyRateService';

jest.mock('@/services/currencyRateService', () => ({
  currencyRateService: {
    getXlmRate: jest.fn(),
  },
}));

describe('useCurrencyConverter', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });

    return function Wrapper({ children }: { children: React.ReactNode }) {
      return createElement(
        QueryClientProvider,
        { client: queryClient },
        children
      );
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches rate and computes xlm estimate', async () => {
    (currencyRateService.getXlmRate as jest.Mock).mockResolvedValue({
      fiat: 'USD',
      xlmRate: 0.5,
      updatedAt: '2026-04-25T00:00:00.000Z',
    });

    const { result } = renderHook(() => useCurrencyConverter(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.rate).toBe(0.5);
    });

    act(() => {
      result.current.setFiatAmount('10');
    });

    expect(result.current.xlmEstimate).toBe(20);
  });

  it('refetches when fiat currency changes', async () => {
    (currencyRateService.getXlmRate as jest.Mock).mockResolvedValue({
      fiat: 'USD',
      xlmRate: 1,
      updatedAt: '2026-04-25T00:00:00.000Z',
    });

    const { result } = renderHook(() => useCurrencyConverter(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(currencyRateService.getXlmRate).toHaveBeenCalledWith('USD');
    });

    act(() => {
      result.current.setFiatCode('EUR');
    });

    await waitFor(() => {
      expect(currencyRateService.getXlmRate).toHaveBeenCalledWith('EUR');
    });
  });

  it('handles API errors with graceful fallback state', async () => {
    (currencyRateService.getXlmRate as jest.Mock).mockRejectedValue(
      new Error('Rate API unavailable')
    );

    const { result } = renderHook(() => useCurrencyConverter(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.rate).toBeNull();
    expect(result.current.xlmEstimate).toBeNull();
    expect(currencyRateService.getXlmRate).toHaveBeenCalled();
  });
});
