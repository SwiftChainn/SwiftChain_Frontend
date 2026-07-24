import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TransactionTracker } from '@/components/wallet/TransactionTracker';
import { useTxTracker } from '@/hooks/useTxTracker';

// ─── Mock the hook layer ──────────────────────────────────────────────────────

jest.mock('@/hooks/useTxTracker');

const mockUseTxTracker = useTxTracker as jest.MockedFunction<typeof useTxTracker>;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_TX_HASH = 'c670b91e8c2d91e4cf6bae2f6a6373a3b64e3c8ce73f3c2b6a5d8f9e4c3b2a1';
const MOCK_EXPLORER_URL = `https://testnet.steexp.com/tx/${MOCK_TX_HASH}`;

type HookReturn = ReturnType<typeof useTxTracker>;

function makeHookState(overrides: Partial<HookReturn> = {}): HookReturn {
  return {
    transactionHash: MOCK_TX_HASH,
    status: null,
    message: '',
    stellarExplorerUrl: MOCK_EXPLORER_URL,
    isLoading: false,
    isPolling: false,
    error: null,
    isTerminalState: false,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TransactionTracker component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Guard states ───────────────────────────────────────────────────────────

  describe('Guard states', () => {
    it('renders the empty-state placeholder when transactionHash is null', () => {
      mockUseTxTracker.mockReturnValue(makeHookState({ transactionHash: null }));

      render(<TransactionTracker transactionHash={null} />);

      expect(screen.getByText('No transaction hash provided')).toBeInTheDocument();
    });

    it('renders the loading state when isLoading is true', () => {
      mockUseTxTracker.mockReturnValue(makeHookState({ isLoading: true }));

      render(<TransactionTracker transactionHash={MOCK_TX_HASH} />);

      expect(screen.getByText('Loading transaction status...')).toBeInTheDocument();
      expect(screen.getByText(MOCK_TX_HASH)).toBeInTheDocument();
    });

    it('renders the error state when error is non-null', () => {
      mockUseTxTracker.mockReturnValue(makeHookState({ error: 'Network timeout' }));

      render(<TransactionTracker transactionHash={MOCK_TX_HASH} />);

      expect(screen.getByText('Error loading transaction')).toBeInTheDocument();
      expect(screen.getByText('Network timeout')).toBeInTheDocument();
    });
  });

  // ── Status display ─────────────────────────────────────────────────────────

  describe('Status display', () => {
    it('renders PENDING badge and spinning icon', () => {
      mockUseTxTracker.mockReturnValue(
        makeHookState({ status: 'PENDING', message: 'Waiting for confirmation', isPolling: true })
      );

      render(<TransactionTracker transactionHash={MOCK_TX_HASH} />);

      expect(screen.getByText('Pending Confirmation')).toBeInTheDocument();
      expect(screen.getByText('Waiting for confirmation')).toBeInTheDocument();
      expect(screen.getByText('Polling...')).toBeInTheDocument();
    });

    it('renders SUCCESS badge without Polling indicator', () => {
      mockUseTxTracker.mockReturnValue(
        makeHookState({
          status: 'SUCCESS',
          message: 'Transaction confirmed',
          isTerminalState: true,
        })
      );

      render(<TransactionTracker transactionHash={MOCK_TX_HASH} />);

      expect(screen.getByText('Confirmed')).toBeInTheDocument();
      expect(screen.getByText('Transaction confirmed')).toBeInTheDocument();
      expect(screen.queryByText('Polling...')).not.toBeInTheDocument();
    });

    it('renders FAILED badge', () => {
      mockUseTxTracker.mockReturnValue(
        makeHookState({
          status: 'FAILED',
          message: 'Transaction failed: Insufficient balance',
          isTerminalState: true,
        })
      );

      render(<TransactionTracker transactionHash={MOCK_TX_HASH} />);

      expect(screen.getByText('Failed')).toBeInTheDocument();
      expect(screen.getByText('Transaction failed: Insufficient balance')).toBeInTheDocument();
    });

    it('renders CONFIRMED badge', () => {
      mockUseTxTracker.mockReturnValue(
        makeHookState({ status: 'CONFIRMED', message: 'Confirmed on-chain' })
      );

      render(<TransactionTracker transactionHash={MOCK_TX_HASH} />);

      expect(screen.getByText('Confirmed')).toBeInTheDocument();
      expect(screen.getByText('Confirmed on-chain')).toBeInTheDocument();
    });

    it('suppresses the message section when message is empty', () => {
      mockUseTxTracker.mockReturnValue(
        makeHookState({ status: 'SUCCESS', message: '', isTerminalState: true })
      );

      const { container } = render(<TransactionTracker transactionHash={MOCK_TX_HASH} />);

      // Message paragraph should not be rendered when empty.
      const paragraphs = container.querySelectorAll('p');
      const textContent = Array.from(paragraphs).map((p) => p.textContent);
      expect(textContent.every((t) => t !== '')).toBe(true);
    });
  });

  // ── Transaction hash display ───────────────────────────────────────────────

  describe('Transaction hash display', () => {
    it('shows the transaction hash in a code element', () => {
      mockUseTxTracker.mockReturnValue(makeHookState({ status: 'SUCCESS', isTerminalState: true }));

      render(<TransactionTracker transactionHash={MOCK_TX_HASH} />);

      const code = screen.getByText(MOCK_TX_HASH);
      expect(code.tagName).toBe('CODE');
    });

    it('renders the Transaction Hash section label', () => {
      mockUseTxTracker.mockReturnValue(makeHookState({ status: 'SUCCESS', isTerminalState: true }));

      render(<TransactionTracker transactionHash={MOCK_TX_HASH} />);

      expect(screen.getByText('Transaction Hash')).toBeInTheDocument();
    });

    it('handles a long (64-char) hash without breaking layout', () => {
      const longHash = 'a'.repeat(64);
      mockUseTxTracker.mockReturnValue(
        makeHookState({ transactionHash: longHash, status: 'SUCCESS', isTerminalState: true })
      );

      render(<TransactionTracker transactionHash={longHash} />);

      expect(screen.getByText(longHash)).toBeInTheDocument();
    });
  });

  // ── Stellar Explorer link ──────────────────────────────────────────────────

  describe('Stellar Explorer link', () => {
    it('renders a link to the Stellar Explorer', () => {
      mockUseTxTracker.mockReturnValue(makeHookState({ status: 'SUCCESS', isTerminalState: true }));

      render(<TransactionTracker transactionHash={MOCK_TX_HASH} />);

      const link = screen.getByRole('link', { name: /view on stellar explorer/i });
      expect(link).toHaveAttribute('href', MOCK_EXPLORER_URL);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('sets the correct title attribute on the explorer link', () => {
      mockUseTxTracker.mockReturnValue(makeHookState({ status: 'SUCCESS', isTerminalState: true }));

      render(<TransactionTracker transactionHash={MOCK_TX_HASH} />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('title', 'View on Stellar Explorer');
    });
  });

  // ── Polling indicator ──────────────────────────────────────────────────────

  describe('Polling indicator', () => {
    it('shows the "Polling…" badge when isPolling is true', () => {
      mockUseTxTracker.mockReturnValue(
        makeHookState({ status: 'PENDING', isPolling: true })
      );

      render(<TransactionTracker transactionHash={MOCK_TX_HASH} />);

      expect(screen.getByText('Polling...')).toBeInTheDocument();
    });

    it('hides the "Polling…" badge for terminal states', () => {
      mockUseTxTracker.mockReturnValue(
        makeHookState({ status: 'SUCCESS', isPolling: false, isTerminalState: true })
      );

      render(<TransactionTracker transactionHash={MOCK_TX_HASH} />);

      expect(screen.queryByText('Polling...')).not.toBeInTheDocument();
    });
  });

  // ── Network display ────────────────────────────────────────────────────────

  describe('Network display', () => {
    it('renders the Network section', () => {
      mockUseTxTracker.mockReturnValue(makeHookState({ status: 'SUCCESS', isTerminalState: true }));

      render(<TransactionTracker transactionHash={MOCK_TX_HASH} />);

      expect(screen.getByText('Network:')).toBeInTheDocument();
    });
  });

  // ── onStatusChange callback ────────────────────────────────────────────────

  describe('onStatusChange callback', () => {
    it('calls onStatusChange when the status first renders', () => {
      const onStatusChange = jest.fn();

      mockUseTxTracker.mockReturnValue(
        makeHookState({ status: 'PENDING', isPolling: true })
      );

      render(
        <TransactionTracker
          transactionHash={MOCK_TX_HASH}
          onStatusChange={onStatusChange}
        />
      );

      expect(onStatusChange).toHaveBeenCalledWith('PENDING');
    });

    it('calls onStatusChange again when status transitions to SUCCESS', () => {
      const onStatusChange = jest.fn();

      mockUseTxTracker.mockReturnValue(
        makeHookState({ status: 'PENDING', isPolling: true })
      );

      const { rerender } = render(
        <TransactionTracker
          transactionHash={MOCK_TX_HASH}
          onStatusChange={onStatusChange}
        />
      );

      expect(onStatusChange).toHaveBeenCalledWith('PENDING');

      mockUseTxTracker.mockReturnValue(
        makeHookState({ status: 'SUCCESS', isTerminalState: true })
      );

      rerender(
        <TransactionTracker
          transactionHash={MOCK_TX_HASH}
          onStatusChange={onStatusChange}
        />
      );

      expect(onStatusChange).toHaveBeenCalledWith('SUCCESS');
      expect(onStatusChange).toHaveBeenCalledTimes(2);
    });

    it('does not throw when onStatusChange is omitted', () => {
      mockUseTxTracker.mockReturnValue(makeHookState({ status: 'SUCCESS', isTerminalState: true }));

      expect(() =>
        render(<TransactionTracker transactionHash={MOCK_TX_HASH} />)
      ).not.toThrow();
    });
  });

  // ── Accessibility ──────────────────────────────────────────────────────────

  describe('Accessibility', () => {
    it('has a role="status" wrapper with aria-live="polite"', () => {
      mockUseTxTracker.mockReturnValue(makeHookState({ status: 'SUCCESS', isTerminalState: true }));

      render(<TransactionTracker transactionHash={MOCK_TX_HASH} />);

      const statusRegion = screen.getByRole('status');
      expect(statusRegion).toHaveAttribute('aria-live', 'polite');
    });

    it('has an aria-label reflecting the current status on the status region', () => {
      mockUseTxTracker.mockReturnValue(makeHookState({ status: 'SUCCESS', isTerminalState: true }));

      render(<TransactionTracker transactionHash={MOCK_TX_HASH} />);

      const statusRegion = screen.getByRole('status');
      expect(statusRegion).toHaveAttribute('aria-label', 'Transaction status: Confirmed');
    });

    it('has an aria-label on the explorer link', () => {
      mockUseTxTracker.mockReturnValue(makeHookState({ status: 'SUCCESS', isTerminalState: true }));

      render(<TransactionTracker transactionHash={MOCK_TX_HASH} />);

      expect(screen.getByLabelText(/view on stellar explorer/i)).toBeInTheDocument();
    });
  });

  // ── Dark mode ──────────────────────────────────────────────────────────────

  describe('Dark mode classes', () => {
    it('includes dark-mode Tailwind classes in the rendered output', () => {
      mockUseTxTracker.mockReturnValue(makeHookState({ status: 'SUCCESS', isTerminalState: true }));

      const { container } = render(<TransactionTracker transactionHash={MOCK_TX_HASH} />);

      const elementsWithDark = container.querySelectorAll('[class*="dark:"]');
      expect(elementsWithDark.length).toBeGreaterThan(0);
    });
  });

  // ── Edge cases ─────────────────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('renders special characters in the message without escaping issues', () => {
      const specialMessage = 'Error: Amount exceeds limit & balance < required';
      mockUseTxTracker.mockReturnValue(
        makeHookState({
          status: 'FAILED',
          message: specialMessage,
          isTerminalState: true,
        })
      );

      render(<TransactionTracker transactionHash={MOCK_TX_HASH} />);

      expect(screen.getByText(specialMessage)).toBeInTheDocument();
    });

    it('falls back to PENDING styling when status is null (grace period)', () => {
      // During the 300ms PENDING debounce, status is null.
      // The component should still render (using PENDING config as a fallback).
      mockUseTxTracker.mockReturnValue(makeHookState({ status: null, isPolling: true }));

      const { container } = render(<TransactionTracker transactionHash={MOCK_TX_HASH} />);

      // Container should exist and not throw.
      expect(container.firstChild).not.toBeNull();
    });
  });
});
