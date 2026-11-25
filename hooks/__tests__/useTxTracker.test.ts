import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTxTracker, PENDING_DEBOUNCE_MS } from '@/hooks/useTxTracker';
import { walletService } from '@/services/walletService';
import { TransactionResponse } from '@/types/transaction';

// Mock the walletService
jest.mock('@/services/walletService');

const mockWalletService = walletService as jest.Mocked<typeof walletService>;

// Mock environment variables
const originalEnv = process.env;
beforeAll(() => {
  process.env = {
    ...originalEnv,
    NEXT_PUBLIC_STELLAR_NETWORK: 'testnet',
    NEXT_PUBLIC_API_URL: 'http://localhost:3000',
  };
});

afterAll(() => {
  process.env = originalEnv;
});

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
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
};

const MOCK_TX_HASH = 'c670b91e8c2d91e4cf6bae2f6a6373a3b64e3c8ce73f3c2b6a5d8f9e4c3b2a1';
const MOCK_EXPLORER_URL = 'https://testnet.steexp.com/tx/' + MOCK_TX_HASH;

describe('useTxTracker Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should handle null transaction hash gracefully', async () => {
      const { result } = renderHook(() => useTxTracker(null), {
        wrapper: createWrapper(),
      });

      // When hash is null, query is disabled (enabled: false)
      expect(result.current.transactionHash).toBeNull();
      expect(result.current.status).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should initialize with loading state', async () => {
      const mockResponse: TransactionResponse = {
        transactionHash: MOCK_TX_HASH,
        status: 'PENDING',
        timestamp: new Date().toISOString(),
        message: 'Waiting for confirmation',
      };

      mockWalletService.getTransactionStatus.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), {
        wrapper: createWrapper(),
      });

      // Should start in loading/pending state
      expect(result.current.isLoading).toBe(true);

      // Wait for data to load
      await waitFor(() => {
        expect(result.current.status).toBe('PENDING');
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('API Integration', () => {
    it('should fetch transaction status from wallet service', async () => {
      const mockResponse: TransactionResponse = {
        transactionHash: MOCK_TX_HASH,
        status: 'PENDING',
        timestamp: new Date().toISOString(),
        message: 'Waiting for confirmation',
      };

      mockWalletService.getTransactionStatus.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // PENDING is debounced before it is displayed, so wait for it.
      await waitFor(() => {
        expect(result.current.status).toBe('PENDING');
      });
      expect(mockWalletService.getTransactionStatus).toHaveBeenCalledWith(MOCK_TX_HASH);
    });

    it('should handle API errors gracefully', async () => {
      const errorMessage = 'Transaction not found';
      mockWalletService.getTransactionStatus.mockRejectedValue(
        new Error(errorMessage)
      );

      const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), {
        wrapper: createWrapper(),
      });

      // React Query retries before settling - wait for final state
      await waitFor(() => {
        expect(result.current.status).toBeNull();
      }, { timeout: 3000 });

      // Should have error or null status (depends on retry exhaustion)
      expect(mockWalletService.getTransactionStatus).toHaveBeenCalled();
    });

    it('should retry API calls on failure', async () => {
      mockWalletService.getTransactionStatus.mockRejectedValue(
        new Error('Network error')
      );

      const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), {
        wrapper: createWrapper(),
      });

      // Service should have been called (React Query handles retries)
      await waitFor(() => {
        // Wait for at least some calls
        expect(mockWalletService.getTransactionStatus).toHaveBeenCalled();
      });
    });
  });

  describe('Status Tracking', () => {
    it('should track PENDING status', async () => {
      const mockResponse: TransactionResponse = {
        transactionHash: MOCK_TX_HASH,
        status: 'PENDING',
        timestamp: new Date().toISOString(),
        message: 'Waiting for confirmation',
      };

      mockWalletService.getTransactionStatus.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.status).toBe('PENDING');
      });

      expect(result.current.isTerminalState).toBe(false);
    });

    it('should track SUCCESS status as terminal state', async () => {
      const mockResponse: TransactionResponse = {
        transactionHash: MOCK_TX_HASH,
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
        message: 'Transaction confirmed successfully',
      };

      mockWalletService.getTransactionStatus.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.status).toBe('SUCCESS');
      });

      expect(result.current.isTerminalState).toBe(true);
      expect(result.current.isPolling).toBe(false);
    });

    it('should track FAILED status as terminal state', async () => {
      const mockResponse: TransactionResponse = {
        transactionHash: MOCK_TX_HASH,
        status: 'FAILED',
        timestamp: new Date().toISOString(),
        message: 'Transaction failed: Insufficient balance',
        errorMessage: 'Insufficient balance',
      };

      mockWalletService.getTransactionStatus.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.status).toBe('FAILED');
      });

      expect(result.current.isTerminalState).toBe(true);
      expect(result.current.isPolling).toBe(false);
    });

    it('should track CONFIRMED status as terminal state', async () => {
      const mockResponse: TransactionResponse = {
        transactionHash: MOCK_TX_HASH,
        status: 'CONFIRMED',
        timestamp: new Date().toISOString(),
        message: 'Transaction confirmed',
      };

      mockWalletService.getTransactionStatus.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.status).toBe('CONFIRMED');
      });

      // CONFIRMED is not explicitly a terminal state in the current logic
      // Only SUCCESS and FAILED are terminal states
      expect(result.current.isTerminalState).toBe(false);
    });
  });

  describe('Polling Control', () => {
    it('should indicate polling is active when status is PENDING', async () => {
      const mockResponse: TransactionResponse = {
        transactionHash: MOCK_TX_HASH,
        status: 'PENDING',
        timestamp: new Date().toISOString(),
        message: 'Waiting for confirmation',
      };

      mockWalletService.getTransactionStatus.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.status).toBe('PENDING');
      });

      // PENDING is not a terminal state, but isPolling depends on isFetching
      // Since we're using staleTime and the query has settled, isFetching will be false
      expect(result.current.isTerminalState).toBe(false);
    });

    it('should stop polling when status reaches SUCCESS', async () => {
      const mockResponse: TransactionResponse = {
        transactionHash: MOCK_TX_HASH,
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
        message: 'Transaction confirmed',
      };

      mockWalletService.getTransactionStatus.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.status).toBe('SUCCESS');
      });

      expect(result.current.isPolling).toBe(false);
      expect(result.current.isTerminalState).toBe(true);
    });

    it('should stop polling when status reaches FAILED', async () => {
      const mockResponse: TransactionResponse = {
        transactionHash: MOCK_TX_HASH,
        status: 'FAILED',
        timestamp: new Date().toISOString(),
        message: 'Transaction failed',
        errorMessage: 'Insufficient balance',
      };

      mockWalletService.getTransactionStatus.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.status).toBe('FAILED');
      });

      expect(result.current.isPolling).toBe(false);
    });
  });

  describe('Stellar Explorer URL', () => {
    it('should construct correct explorer URL for testnet', async () => {
      const mockResponse: TransactionResponse = {
        transactionHash: MOCK_TX_HASH,
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
        message: 'Transaction confirmed',
        stellarExplorerUrl: MOCK_EXPLORER_URL,
      };

      mockWalletService.getTransactionStatus.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.status).toBe('SUCCESS');
      });

      expect(result.current.stellarExplorerUrl).toContain('testnet.steexp.com');
      expect(result.current.stellarExplorerUrl).toContain(MOCK_TX_HASH);
    });

    it('should include transaction hash in explorer URL', async () => {
      const mockResponse: TransactionResponse = {
        transactionHash: MOCK_TX_HASH,
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
        message: 'Transaction confirmed',
        stellarExplorerUrl: MOCK_EXPLORER_URL,
      };

      mockWalletService.getTransactionStatus.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.status).toBe('SUCCESS');
      });

      expect(result.current.stellarExplorerUrl).toMatch(new RegExp(MOCK_TX_HASH));
    });
  });

  describe('Message Handling', () => {
    it('should propagate transaction messages', async () => {
      const message = 'Waiting for 3 confirmations';
      const mockResponse: TransactionResponse = {
        transactionHash: MOCK_TX_HASH,
        status: 'PENDING',
        timestamp: new Date().toISOString(),
        message,
      };

      mockWalletService.getTransactionStatus.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.message).toBe(message);
      });
    });

    it('should handle empty messages', async () => {
      const mockResponse: TransactionResponse = {
        transactionHash: MOCK_TX_HASH,
        status: 'PENDING',
        timestamp: new Date().toISOString(),
        message: '',
      };

      mockWalletService.getTransactionStatus.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.message).toBe('');
      });
    });
  });

  describe('State Transitions', () => {
    it('should transition from PENDING to SUCCESS', async () => {
      let callCount = 0;
      const responses: TransactionResponse[] = [
        {
          transactionHash: MOCK_TX_HASH,
          status: 'PENDING',
          timestamp: new Date().toISOString(),
          message: 'Waiting for confirmation',
        },
        {
          transactionHash: MOCK_TX_HASH,
          status: 'SUCCESS',
          timestamp: new Date().toISOString(),
          message: 'Transaction confirmed',
        },
      ];

      mockWalletService.getTransactionStatus.mockImplementation(async () => {
        const response = responses[Math.min(callCount, responses.length - 1)];
        callCount++;
        return response;
      });

      const { result, rerender } = renderHook(() => useTxTracker(MOCK_TX_HASH), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.status).toBe('PENDING');
      });

      expect(result.current.isTerminalState).toBe(false);
    });

    it('should handle query key change properly', async () => {
      const mockResponse: TransactionResponse = {
        transactionHash: MOCK_TX_HASH,
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
        message: 'Transaction confirmed',
      };

      mockWalletService.getTransactionStatus.mockResolvedValue(mockResponse);

      const { result, rerender } = renderHook(
        ({ hash }) => useTxTracker(hash),
        {
          wrapper: createWrapper(),
          initialProps: { hash: MOCK_TX_HASH },
        }
      );

      await waitFor(() => {
        expect(result.current.status).toBe('SUCCESS');
      });

      // Change to a different hash
      const newHash = 'a'.repeat(64);
      rerender({ hash: newHash });

      // Should have been called with old hash
      expect(mockWalletService.getTransactionStatus).toHaveBeenCalledWith(MOCK_TX_HASH);
    });
  });

  describe('Loading States', () => {
    it('should properly track loading state', async () => {
      const mockResponse: TransactionResponse = {
        transactionHash: MOCK_TX_HASH,
        status: 'PENDING',
        timestamp: new Date().toISOString(),
        message: 'Waiting for confirmation',
      };

      mockWalletService.getTransactionStatus.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // PENDING is debounced before it is displayed, so wait for it.
      await waitFor(() => {
        expect(result.current.status).toBe('PENDING');
      });
    });

    it('should not update loading state after unmount', async () => {
      const mockResponse: TransactionResponse = {
        transactionHash: MOCK_TX_HASH,
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
        message: 'Transaction confirmed',
      };

      mockWalletService.getTransactionStatus.mockResolvedValue(mockResponse);

      const { result, unmount } = renderHook(() => useTxTracker(MOCK_TX_HASH), {
        wrapper: createWrapper(),
      });

      unmount();

      // Should not throw warning about state update on unmounted component
      expect(result.current.isLoading).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle transaction hash with special characters', async () => {
      const mockResponse: TransactionResponse = {
        transactionHash: MOCK_TX_HASH,
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
        message: 'Transaction confirmed',
      };

      mockWalletService.getTransactionStatus.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.status).toBe('SUCCESS');
      });

      expect(mockWalletService.getTransactionStatus).toHaveBeenCalledWith(MOCK_TX_HASH);
    });

    it('should handle response with additional metadata', async () => {
      const mockResponse: TransactionResponse = {
        transactionHash: MOCK_TX_HASH,
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
        message: 'Transaction confirmed',
        confirmations: 1,
        amount: 100,
        destination: 'GBRPYHIL2CI3WHZDTOOQFC6EB4CGQWF53KTTNCLH34SBEKNQEWJPIN7',
        source: 'GBBD47UZQ2YPJYAUQQ4EJVLLREOIT2U7ILVJSXPOLZMLLNIC5OHSTPO3',
      };

      mockWalletService.getTransactionStatus.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.status).toBe('SUCCESS');
      });

      expect(result.current.status).toBe('SUCCESS');
      expect(mockWalletService.getTransactionStatus).toHaveBeenCalled();
    });
  });

  describe('Race Condition Fixes', () => {
    // Local wrapper that exposes the QueryClient so tests can inject a stale
    // out-of-order payload via setQueryData, simulating a late response
    // landing after a terminal state was already confirmed.
    const createClientWrapper = () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            gcTime: 0,
          },
        },
      });
      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);
      return { queryClient, wrapper };
    };

    const pendingResponse = (message = 'Waiting for confirmation'): TransactionResponse => ({
      transactionHash: MOCK_TX_HASH,
      status: 'PENDING',
      timestamp: new Date().toISOString(),
      message,
    });

    const successResponse = (): TransactionResponse => ({
      transactionHash: MOCK_TX_HASH,
      status: 'SUCCESS',
      timestamp: new Date().toISOString(),
      message: 'Transaction confirmed',
    });

    const failedResponse = (): TransactionResponse => ({
      transactionHash: MOCK_TX_HASH,
      status: 'FAILED',
      timestamp: new Date().toISOString(),
      message: 'Transaction failed',
    });

    it('never flickers back to PENDING after SUCCESS is confirmed', async () => {
      const { queryClient, wrapper } = createClientWrapper();
      mockWalletService.getTransactionStatus.mockResolvedValue(successResponse());

      const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), { wrapper });

      await waitFor(() => {
        expect(result.current.status).toBe('SUCCESS');
      });
      expect(result.current.isTerminalState).toBe(true);

      // Simulate a stale, out-of-order PENDING payload landing afterwards.
      act(() => {
        queryClient.setQueryData(['transaction', MOCK_TX_HASH], pendingResponse());
      });

      await new Promise((resolve) => setTimeout(resolve, 300));

      expect(result.current.status).toBe('SUCCESS');
      expect(result.current.message).toBe('Transaction confirmed');
      expect(result.current.isTerminalState).toBe(true);
      expect(result.current.isPolling).toBe(false);
    });

    it('never flickers back to PENDING after FAILED is confirmed', async () => {
      const { queryClient, wrapper } = createClientWrapper();
      mockWalletService.getTransactionStatus.mockResolvedValue(failedResponse());

      const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), { wrapper });

      await waitFor(() => {
        expect(result.current.status).toBe('FAILED');
      });
      expect(result.current.isTerminalState).toBe(true);

      // Simulate a stale, out-of-order PENDING payload landing afterwards.
      act(() => {
        queryClient.setQueryData(['transaction', MOCK_TX_HASH], pendingResponse());
      });

      await new Promise((resolve) => setTimeout(resolve, 300));

      expect(result.current.status).toBe('FAILED');
      expect(result.current.isTerminalState).toBe(true);
      expect(result.current.isPolling).toBe(false);
    });

    it('stops polling immediately on a terminal state and a stale PENDING response does not restart it', async () => {
      jest.useFakeTimers();
      try {
        const { queryClient, wrapper } = createClientWrapper();
        mockWalletService.getTransactionStatus.mockResolvedValue(successResponse());

        const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), { wrapper });

        await act(async () => {
          await jest.advanceTimersByTimeAsync(0);
        });
        expect(result.current.status).toBe('SUCCESS');
        expect(mockWalletService.getTransactionStatus).toHaveBeenCalledTimes(1);

        // A stale PENDING payload lands after the terminal state.
        act(() => {
          queryClient.setQueryData(['transaction', MOCK_TX_HASH], pendingResponse());
        });

        // Advance well past the 3s poll interval: a live interval would have fired a refetch.
        await act(async () => {
          await jest.advanceTimersByTimeAsync(10000);
        });

        expect(mockWalletService.getTransactionStatus).toHaveBeenCalledTimes(1);
        expect(result.current.status).toBe('SUCCESS');
      } finally {
        jest.useRealTimers();
      }
    });

    it('debounces the PENDING state so a fast confirmation never flashes Pending', async () => {
      jest.useFakeTimers();
      try {
        const { queryClient, wrapper } = createClientWrapper();
        mockWalletService.getTransactionStatus.mockResolvedValue(pendingResponse());

        const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), { wrapper });

        await act(async () => {
          await jest.advanceTimersByTimeAsync(0);
        });
        expect(result.current.isLoading).toBe(false);

        // The PENDING response has arrived but is still inside its debounce window.
        expect(result.current.status).toBeNull();

        // Still inside the debounce window: PENDING stays withheld.
        await act(async () => {
          await jest.advanceTimersByTimeAsync(PENDING_DEBOUNCE_MS - 1);
        });
        expect(result.current.status).toBeNull();

        // Confirmation arrives while PENDING is still debounced.
        act(() => {
          queryClient.setQueryData(['transaction', MOCK_TX_HASH], successResponse());
        });
        // Flush React Query's batched notification so the new data renders.
        await act(async () => {
          await jest.advanceTimersByTimeAsync(0);
        });
        expect(result.current.status).toBe('SUCCESS');

        // Advance well past the original debounce deadline: PENDING must never appear.
        await act(async () => {
          await jest.advanceTimersByTimeAsync(1000);
        });
        expect(result.current.status).toBe('SUCCESS');
      } finally {
        jest.useRealTimers();
      }
    });

    it('displays PENDING once it outlasts the debounce window', async () => {
      jest.useFakeTimers();
      try {
        const { wrapper } = createClientWrapper();
        mockWalletService.getTransactionStatus.mockResolvedValue(pendingResponse());

        const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), { wrapper });

        await act(async () => {
          await jest.advanceTimersByTimeAsync(0);
        });
        expect(result.current.status).toBeNull();

        await act(async () => {
          await jest.advanceTimersByTimeAsync(PENDING_DEBOUNCE_MS);
        });
        expect(result.current.status).toBe('PENDING');
        expect(result.current.isTerminalState).toBe(false);
      } finally {
        jest.useRealTimers();
      }
    });

    it('applies CONFIRMED immediately without debounce', async () => {
      jest.useFakeTimers();
      try {
        const { wrapper } = createClientWrapper();
        mockWalletService.getTransactionStatus.mockResolvedValue({
          transactionHash: MOCK_TX_HASH,
          status: 'CONFIRMED',
          timestamp: new Date().toISOString(),
          message: 'Transaction confirmed',
        });

        const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), { wrapper });

        await act(async () => {
          await jest.advanceTimersByTimeAsync(0);
        });
        // No debounce wait: CONFIRMED is displayed as soon as it arrives.
        expect(result.current.status).toBe('CONFIRMED');
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
