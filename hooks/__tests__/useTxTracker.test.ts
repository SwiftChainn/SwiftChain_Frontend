import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTxTracker } from '@/hooks/useTxTracker';
import { walletService } from '@/services/walletService';
import { TransactionResponse } from '@/types/transaction';

// ─── Mock service layer ───────────────────────────────────────────────────────

jest.mock('@/services/walletService', () => ({
  walletService: {
    getTransactionStatus: jest.fn(),
  },
}));

const mockGetStatus = walletService.getTransactionStatus as jest.MockedFunction<
  typeof walletService.getTransactionStatus
>;

// ─── Environment ──────────────────────────────────────────────────────────────

const originalEnv = process.env;
beforeAll(() => {
  process.env = {
    ...originalEnv,
    NEXT_PUBLIC_STELLAR_NETWORK: 'testnet',
    NEXT_PUBLIC_API_URL: 'http://localhost:3001',
  };
});
afterAll(() => {
  process.env = originalEnv;
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_TX_HASH = 'c670b91e8c2d91e4cf6bae2f6a6373a3b64e3c8ce73f3c2b6a5d8f9e4c3b2a1';
const MOCK_EXPLORER_URL = `https://testnet.steexp.com/tx/${MOCK_TX_HASH}`;

function makeResponse(
  status: TransactionResponse['status'],
  overrides: Partial<TransactionResponse> = {}
): TransactionResponse {
  return {
    transactionHash: MOCK_TX_HASH,
    status,
    timestamp: new Date().toISOString(),
    message: `Status: ${status}`,
    stellarExplorerUrl: MOCK_EXPLORER_URL,
    ...overrides,
  };
}

// ─── Test wrapper ─────────────────────────────────────────────────────────────

function createWrapper() {
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
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useTxTracker', () => {
  // Use real timers for async tests; only use fake timers where needed.
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Initialization ──────────────────────────────────────────────────────────

  describe('Initialization', () => {
    it('returns null status and no loading when transactionHash is null', () => {
      const { result } = renderHook(() => useTxTracker(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.status).toBeNull();
      expect(result.current.transactionHash).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockGetStatus).not.toHaveBeenCalled();
    });

    it('starts in the loading state when a hash is provided', async () => {
      mockGetStatus.mockResolvedValue(makeResponse('PENDING'));

      const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });
  });

  // ── Service integration ─────────────────────────────────────────────────────

  describe('Service integration', () => {
    it('calls walletService.getTransactionStatus with the correct hash', async () => {
      mockGetStatus.mockResolvedValue(makeResponse('PENDING'));

      const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(mockGetStatus).toHaveBeenCalledWith(MOCK_TX_HASH);
    });

    it('propagates the stellarExplorerUrl from the service', async () => {
      mockGetStatus.mockResolvedValue(makeResponse('SUCCESS'));

      const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isTerminalState).toBe(true));

      expect(result.current.stellarExplorerUrl).toBe(MOCK_EXPLORER_URL);
    });

    it('propagates the message from the service', async () => {
      mockGetStatus.mockResolvedValue(
        makeResponse('PENDING', { message: 'Waiting for 3 confirmations' })
      );

      const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.message).toBe('Waiting for 3 confirmations');
    });

    it('captures the error message when the service throws', async () => {
      mockGetStatus.mockRejectedValue(new Error('Network error'));

      // noRetryClient disables retries so the query settles immediately.
      // This works because the hook no longer sets per-query retry options;
      // the QueryClient defaultOptions are respected.
      const noRetryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0 },
        },
      });
      const noRetryWrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: noRetryClient }, children);

      const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), {
        wrapper: noRetryWrapper,
      });

      await waitFor(
        () => expect(result.current.error).toBe('Network error'),
        { timeout: 3000 }
      );
    });
  });

  // ── Status tracking ─────────────────────────────────────────────────────────

  describe('Status tracking', () => {
    it('marks SUCCESS as a terminal state', async () => {
      mockGetStatus.mockResolvedValue(makeResponse('SUCCESS'));

      const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isTerminalState).toBe(true));

      expect(result.current.status).toBe('SUCCESS');
      expect(result.current.isPolling).toBe(false);
    });

    it('marks FAILED as a terminal state', async () => {
      mockGetStatus.mockResolvedValue(
        makeResponse('FAILED', { errorMessage: 'Insufficient balance' })
      );

      const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isTerminalState).toBe(true));

      expect(result.current.status).toBe('FAILED');
      expect(result.current.isPolling).toBe(false);
    });

    it('does not mark PENDING as a terminal state', async () => {
      mockGetStatus.mockResolvedValue(makeResponse('PENDING'));

      const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isTerminalState).toBe(false);
    });

    it('does not mark CONFIRMED as a terminal state', async () => {
      mockGetStatus.mockResolvedValue(makeResponse('CONFIRMED'));

      const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.status).toBe('CONFIRMED'));

      expect(result.current.isTerminalState).toBe(false);
    });
  });

  // ── Race condition fix ──────────────────────────────────────────────────────

  describe('Race condition fix — polling stops strictly on terminal state', () => {
    it('never shows PENDING when the first response is SUCCESS', async () => {
      // The PENDING debounce is 300ms. If SUCCESS arrives before the debounce
      // fires, the debounce is cancelled and status jumps directly to SUCCESS.
      jest.useFakeTimers();

      mockGetStatus.mockResolvedValue(makeResponse('SUCCESS'));

      const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), {
        wrapper: createWrapper(),
      });

      // Let promises resolve, then advance timers past the debounce window.
      await act(async () => {
        await Promise.resolve();
      });
      await waitFor(() => expect(result.current.isTerminalState).toBe(true));

      // Advance past the debounce window to ensure the debounce cannot fire.
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current.status).toBe('SUCCESS');
      expect(result.current.status).not.toBe('PENDING');

      jest.useRealTimers();
    });

    it('never shows PENDING when the first response is FAILED', async () => {
      jest.useFakeTimers();

      mockGetStatus.mockResolvedValue(makeResponse('FAILED'));

      const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await Promise.resolve();
      });
      await waitFor(() => expect(result.current.isTerminalState).toBe(true));

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current.status).toBe('FAILED');
      expect(result.current.status).not.toBe('PENDING');

      jest.useRealTimers();
    });

    it('stops polling after SUCCESS — no extra service calls after terminal', async () => {
      // Use real timers: poll fires after 3000ms. We advance only to the
      // point just before the poll interval so we can count calls accurately.
      let callCount = 0;
      mockGetStatus.mockImplementation(async () => {
        callCount++;
        return makeResponse('SUCCESS');
      });

      const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), {
        wrapper: createWrapper(),
      });

      // Wait for the initial fetch (call count = 1, terminal = true).
      await waitFor(() => expect(result.current.isTerminalState).toBe(true));

      const countAfterTerminal = callCount;

      // The poll timer is set for 3000ms.  Wait more than that to confirm
      // no second call fires.
      await new Promise((r) => setTimeout(r, 3200));

      expect(callCount).toBe(countAfterTerminal);
      expect(result.current.isPolling).toBe(false);
    });

    it('never transitions backward from SUCCESS to PENDING', async () => {
      mockGetStatus.mockResolvedValue(makeResponse('SUCCESS'));

      const observedStatuses: Array<typeof result.current.status> = [];
      const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isTerminalState).toBe(true));
      observedStatuses.push(result.current.status);

      // Wait another 500ms — if PENDING debounce were to fire, it would show here.
      await new Promise((r) => setTimeout(r, 500));
      observedStatuses.push(result.current.status);

      expect(observedStatuses).not.toContain('PENDING');
      expect(result.current.status).toBe('SUCCESS');
    });
  });

  // ── Debounced PENDING display ───────────────────────────────────────────────

  describe('Debounced PENDING display', () => {
    it('does not immediately show PENDING — waits for the debounce window', async () => {
      jest.useFakeTimers();

      mockGetStatus.mockResolvedValue(makeResponse('PENDING'));

      const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), {
        wrapper: createWrapper(),
      });

      // Data loads but debounce has not fired yet.
      await act(async () => {
        await Promise.resolve();
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Right after data loads but before the 300ms debounce: null.
      expect(result.current.status).toBeNull();

      // Advance past the debounce.
      act(() => {
        jest.advanceTimersByTime(350);
      });

      expect(result.current.status).toBe('PENDING');

      jest.useRealTimers();
    });

    it('shows PENDING only after 300ms of continuous observation', async () => {
      jest.useFakeTimers();

      mockGetStatus.mockResolvedValue(makeResponse('PENDING'));

      const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await Promise.resolve();
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Just before debounce fires.
      act(() => {
        jest.advanceTimersByTime(299);
      });
      expect(result.current.status).toBeNull();

      // Past the debounce.
      act(() => {
        jest.advanceTimersByTime(2);
      });
      expect(result.current.status).toBe('PENDING');

      jest.useRealTimers();
    });

    it('cancels the PENDING debounce when SUCCESS arrives before 300ms', async () => {
      // Scenario: first response is PENDING (debounce starts), second is SUCCESS
      // (within 300ms). The debounce must be cancelled and status must be SUCCESS.
      jest.useFakeTimers();

      let callCount = 0;
      mockGetStatus.mockImplementation(async () => {
        callCount++;
        return callCount === 1 ? makeResponse('PENDING') : makeResponse('SUCCESS');
      });

      const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), {
        wrapper: createWrapper(),
      });

      // Initial fetch → PENDING.
      await act(async () => {
        await Promise.resolve();
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Advance 100ms (<300ms debounce) — PENDING debounce is running but not fired.
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Simulate the poll firing at 3000ms by advancing 3000ms.
      // The hook calls invalidateQueries, which triggers a re-fetch returning SUCCESS.
      await act(async () => {
        jest.advanceTimersByTime(3000);
        await Promise.resolve();
      });

      await waitFor(() => expect(result.current.isTerminalState).toBe(true));

      // Advance past 300ms to confirm the debounce never fired to overwrite SUCCESS.
      act(() => {
        jest.advanceTimersByTime(400);
      });

      expect(result.current.status).toBe('SUCCESS');

      jest.useRealTimers();
    });
  });

  // ── Polling control ─────────────────────────────────────────────────────────

  describe('Polling control', () => {
    it('isPolling is false when transaction hash is null', () => {
      const { result } = renderHook(() => useTxTracker(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.isPolling).toBe(false);
    });

    it('isPolling is false after a terminal state is confirmed', async () => {
      mockGetStatus.mockResolvedValue(makeResponse('SUCCESS'));

      const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isTerminalState).toBe(true));

      expect(result.current.isPolling).toBe(false);
    });

    it('resets polling when the transaction hash changes', async () => {
      const HASH_A = MOCK_TX_HASH;
      const HASH_B = 'b'.repeat(64);

      mockGetStatus.mockImplementation(async (hash) => {
        if (hash === HASH_A) return makeResponse('SUCCESS', { transactionHash: HASH_A });
        return makeResponse('PENDING', { transactionHash: HASH_B });
      });

      const { result, rerender } = renderHook(
        ({ hash }: { hash: string }) => useTxTracker(hash),
        { wrapper: createWrapper(), initialProps: { hash: HASH_A } }
      );

      await waitFor(() => expect(result.current.isTerminalState).toBe(true));

      // Switch to a new hash — polling should restart.
      rerender({ hash: HASH_B });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isTerminalState).toBe(false);
      expect(mockGetStatus).toHaveBeenCalledWith(HASH_B);
    });
  });

  // ── Loading states ──────────────────────────────────────────────────────────

  describe('Loading states', () => {
    it('isLoading transitions from true to false after the first fetch', async () => {
      mockGetStatus.mockResolvedValue(makeResponse('PENDING'));

      const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });

    it('does not throw after unmount', async () => {
      mockGetStatus.mockResolvedValue(makeResponse('SUCCESS'));

      const { result, unmount } = renderHook(() => useTxTracker(MOCK_TX_HASH), {
        wrapper: createWrapper(),
      });

      unmount();

      expect(result.current.isLoading).toBeDefined();
    });
  });

  // ── CONFIRMED state ─────────────────────────────────────────────────────────

  describe('CONFIRMED intermediate state', () => {
    it('shows CONFIRMED immediately (no debounce)', async () => {
      mockGetStatus.mockResolvedValue(makeResponse('CONFIRMED'));

      const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.status).toBe('CONFIRMED'));
    });

    it('continues polling after CONFIRMED (isTerminalState is false)', async () => {
      mockGetStatus.mockResolvedValue(makeResponse('CONFIRMED'));

      const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.status).toBe('CONFIRMED'));

      expect(result.current.isTerminalState).toBe(false);
    });
  });

  // ── Edge cases ──────────────────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('handles a 64-character transaction hash', async () => {
      const longHash = 'f'.repeat(64);
      mockGetStatus.mockResolvedValue(makeResponse('SUCCESS', { transactionHash: longHash }));

      const { result } = renderHook(() => useTxTracker(longHash), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isTerminalState).toBe(true));

      expect(mockGetStatus).toHaveBeenCalledWith(longHash);
    });

    it('handles an empty message gracefully', async () => {
      mockGetStatus.mockResolvedValue(makeResponse('SUCCESS', { message: '' }));

      const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isTerminalState).toBe(true));

      expect(result.current.message).toBe('');
    });

    it('handles responses with full metadata fields', async () => {
      mockGetStatus.mockResolvedValue(
        makeResponse('SUCCESS', {
          confirmations: 5,
          amount: 200,
          destination: 'GDEST',
          source: 'GSRC',
        })
      );

      const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isTerminalState).toBe(true));

      expect(result.current.status).toBe('SUCCESS');
    });
  });

  // ── Stellar Explorer URL ────────────────────────────────────────────────────

  describe('Stellar Explorer URL', () => {
    it('returns the explorer URL from the service response', async () => {
      mockGetStatus.mockResolvedValue(makeResponse('SUCCESS'));

      const { result } = renderHook(() => useTxTracker(MOCK_TX_HASH), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isTerminalState).toBe(true));

      expect(result.current.stellarExplorerUrl).toContain('testnet.steexp.com');
      expect(result.current.stellarExplorerUrl).toContain(MOCK_TX_HASH);
    });
  });
});
