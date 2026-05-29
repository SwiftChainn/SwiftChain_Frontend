import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TxTracker } from '@/components/wallet/TxTracker';
import { useTxTracker } from '@/hooks/useTxTracker';

// Mock the useTxTracker hook
jest.mock('@/hooks/useTxTracker');

const mockUseTxTracker = useTxTracker as jest.MockedFunction<typeof useTxTracker>;

// Mock data
const MOCK_TX_HASH = 'c670b91e8c2d91e4cf6bae2f6a6373a3b64e3c8ce73f3c2b6a5d8f9e4c3b2a1';
const MOCK_EXPLORER_URL = `https://testnet.steexp.com/tx/${MOCK_TX_HASH}`;

describe('TxTracker Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render no transaction hash message when hash is null', () => {
      mockUseTxTracker.mockReturnValue({
        transactionHash: null,
        status: null,
        message: '',
        stellarExplorerUrl: '',
        isLoading: false,
        isPolling: false,
        error: null,
        isTerminalState: false,
      });

      render(<TxTracker transactionHash={null} />);
      expect(screen.getByText('No transaction hash provided')).toBeInTheDocument();
    });

    it('should render loading state', () => {
      mockUseTxTracker.mockReturnValue({
        transactionHash: null,
        status: null,
        message: '',
        stellarExplorerUrl: '',
        isLoading: true,
        isPolling: false,
        error: null,
        isTerminalState: false,
      });

      render(<TxTracker transactionHash={MOCK_TX_HASH} />);
      expect(screen.getByText('Loading transaction status...')).toBeInTheDocument();
      expect(screen.getByText(MOCK_TX_HASH)).toBeInTheDocument();
    });

    it('should render error state', () => {
      mockUseTxTracker.mockReturnValue({
        transactionHash: MOCK_TX_HASH,
        status: null,
        message: '',
        stellarExplorerUrl: '',
        isLoading: false,
        isPolling: false,
        error: 'Network error',
        isTerminalState: false,
      });

      render(<TxTracker transactionHash={MOCK_TX_HASH} />);
      expect(screen.getByText('Error loading transaction')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  describe('Status Display', () => {
    it('should display PENDING status correctly', () => {
      mockUseTxTracker.mockReturnValue({
        transactionHash: MOCK_TX_HASH,
        status: 'PENDING',
        message: 'Waiting for confirmation',
        stellarExplorerUrl: MOCK_EXPLORER_URL,
        isLoading: false,
        isPolling: true,
        error: null,
        isTerminalState: false,
      });

      render(<TxTracker transactionHash={MOCK_TX_HASH} />);
      expect(screen.getByText('Pending Confirmation')).toBeInTheDocument();
      expect(screen.getByText('Waiting for confirmation')).toBeInTheDocument();
      expect(screen.getByText('Polling...')).toBeInTheDocument();
    });

    it('should display SUCCESS status correctly', () => {
      mockUseTxTracker.mockReturnValue({
        transactionHash: MOCK_TX_HASH,
        status: 'SUCCESS',
        message: 'Transaction confirmed successfully',
        stellarExplorerUrl: MOCK_EXPLORER_URL,
        isLoading: false,
        isPolling: false,
        error: null,
        isTerminalState: true,
      });

      render(<TxTracker transactionHash={MOCK_TX_HASH} />);
      expect(screen.getByText('Confirmed')).toBeInTheDocument();
      expect(screen.getByText('Transaction confirmed successfully')).toBeInTheDocument();
      expect(screen.queryByText('Polling...')).not.toBeInTheDocument();
    });

    it('should display FAILED status correctly', () => {
      mockUseTxTracker.mockReturnValue({
        transactionHash: MOCK_TX_HASH,
        status: 'FAILED',
        message: 'Transaction failed: Insufficient balance',
        stellarExplorerUrl: MOCK_EXPLORER_URL,
        isLoading: false,
        isPolling: false,
        error: null,
        isTerminalState: true,
      });

      render(<TxTracker transactionHash={MOCK_TX_HASH} />);
      expect(screen.getByText('Failed')).toBeInTheDocument();
      expect(screen.getByText('Transaction failed: Insufficient balance')).toBeInTheDocument();
    });

    it('should display CONFIRMED status correctly', () => {
      mockUseTxTracker.mockReturnValue({
        transactionHash: MOCK_TX_HASH,
        status: 'CONFIRMED',
        message: 'Transaction confirmed',
        stellarExplorerUrl: MOCK_EXPLORER_URL,
        isLoading: false,
        isPolling: false,
        error: null,
        isTerminalState: true,
      });

      render(<TxTracker transactionHash={MOCK_TX_HASH} />);
      expect(screen.getByText('Confirmed')).toBeInTheDocument();
      expect(screen.getByText('Transaction confirmed')).toBeInTheDocument();
    });
  });

  describe('Transaction Hash Display', () => {
    it('should render transaction hash in code block', () => {
      mockUseTxTracker.mockReturnValue({
        transactionHash: MOCK_TX_HASH,
        status: 'SUCCESS',
        message: '',
        stellarExplorerUrl: MOCK_EXPLORER_URL,
        isLoading: false,
        isPolling: false,
        error: null,
        isTerminalState: true,
      });

      render(<TxTracker transactionHash={MOCK_TX_HASH} />);
      expect(screen.getByText(MOCK_TX_HASH)).toBeInTheDocument();
    });

    it('should display Transaction Hash label', () => {
      mockUseTxTracker.mockReturnValue({
        transactionHash: MOCK_TX_HASH,
        status: 'SUCCESS',
        message: '',
        stellarExplorerUrl: MOCK_EXPLORER_URL,
        isLoading: false,
        isPolling: false,
        error: null,
        isTerminalState: true,
      });

      render(<TxTracker transactionHash={MOCK_TX_HASH} />);
      expect(screen.getByText('Transaction Hash')).toBeInTheDocument();
    });
  });

  describe('Stellar Explorer Link', () => {
    it('should render clickable explorer link', () => {
      mockUseTxTracker.mockReturnValue({
        transactionHash: MOCK_TX_HASH,
        status: 'SUCCESS',
        message: '',
        stellarExplorerUrl: MOCK_EXPLORER_URL,
        isLoading: false,
        isPolling: false,
        error: null,
        isTerminalState: true,
      });

      render(<TxTracker transactionHash={MOCK_TX_HASH} />);
      
      const link = screen.getByRole('link', { name: /view on stellar explorer/i });
      expect(link).toHaveAttribute('href', MOCK_EXPLORER_URL);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should have correct explorer URL format', () => {
      mockUseTxTracker.mockReturnValue({
        transactionHash: MOCK_TX_HASH,
        status: 'SUCCESS',
        message: '',
        stellarExplorerUrl: MOCK_EXPLORER_URL,
        isLoading: false,
        isPolling: false,
        error: null,
        isTerminalState: true,
      });

      render(<TxTracker transactionHash={MOCK_TX_HASH} />);
      
      const link = screen.getByRole('link', { name: /view on stellar explorer/i });
      expect(link.href).toContain('testnet.steexp.com');
      expect(link.href).toContain(MOCK_TX_HASH);
    });
  });

  describe('Polling Indicator', () => {
    it('should show polling badge when isPolling is true', () => {
      mockUseTxTracker.mockReturnValue({
        transactionHash: MOCK_TX_HASH,
        status: 'PENDING',
        message: 'Waiting for confirmation',
        stellarExplorerUrl: MOCK_EXPLORER_URL,
        isLoading: false,
        isPolling: true,
        error: null,
        isTerminalState: false,
      });

      render(<TxTracker transactionHash={MOCK_TX_HASH} />);
      expect(screen.getByText('Polling...')).toBeInTheDocument();
    });

    it('should not show polling badge when transaction is in terminal state', () => {
      mockUseTxTracker.mockReturnValue({
        transactionHash: MOCK_TX_HASH,
        status: 'SUCCESS',
        message: '',
        stellarExplorerUrl: MOCK_EXPLORER_URL,
        isLoading: false,
        isPolling: false,
        error: null,
        isTerminalState: true,
      });

      render(<TxTracker transactionHash={MOCK_TX_HASH} />);
      expect(screen.queryByText('Polling...')).not.toBeInTheDocument();
    });
  });

  describe('Network Display', () => {
    it('should display network information', () => {
      mockUseTxTracker.mockReturnValue({
        transactionHash: MOCK_TX_HASH,
        status: 'SUCCESS',
        message: '',
        stellarExplorerUrl: MOCK_EXPLORER_URL,
        isLoading: false,
        isPolling: false,
        error: null,
        isTerminalState: true,
      });

      render(<TxTracker transactionHash={MOCK_TX_HASH} />);
      expect(screen.getByText('Network:')).toBeInTheDocument();
    });
  });

  describe('Status Change Callback', () => {
    it('should call onStatusChange when status changes', () => {
      const onStatusChange = jest.fn();
      
      mockUseTxTracker.mockReturnValue({
        transactionHash: MOCK_TX_HASH,
        status: 'PENDING',
        message: '',
        stellarExplorerUrl: MOCK_EXPLORER_URL,
        isLoading: false,
        isPolling: true,
        error: null,
        isTerminalState: false,
      });

      const { rerender } = render(
        <TxTracker transactionHash={MOCK_TX_HASH} onStatusChange={onStatusChange} />
      );

      expect(onStatusChange).toHaveBeenCalledWith('PENDING');

      // Update to SUCCESS status
      mockUseTxTracker.mockReturnValue({
        transactionHash: MOCK_TX_HASH,
        status: 'SUCCESS',
        message: '',
        stellarExplorerUrl: MOCK_EXPLORER_URL,
        isLoading: false,
        isPolling: false,
        error: null,
        isTerminalState: true,
      });

      rerender(<TxTracker transactionHash={MOCK_TX_HASH} onStatusChange={onStatusChange} />);
      expect(onStatusChange).toHaveBeenCalledWith('SUCCESS');
      expect(onStatusChange).toHaveBeenCalledTimes(2);
    });

    it('should not call onStatusChange if callback is not provided', () => {
      mockUseTxTracker.mockReturnValue({
        transactionHash: MOCK_TX_HASH,
        status: 'PENDING',
        message: '',
        stellarExplorerUrl: MOCK_EXPLORER_URL,
        isLoading: false,
        isPolling: true,
        error: null,
        isTerminalState: false,
      });

      // Should not throw error
      render(<TxTracker transactionHash={MOCK_TX_HASH} />);
      expect(screen.getByText('Pending Confirmation')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      mockUseTxTracker.mockReturnValue({
        transactionHash: MOCK_TX_HASH,
        status: 'SUCCESS',
        message: '',
        stellarExplorerUrl: MOCK_EXPLORER_URL,
        isLoading: false,
        isPolling: false,
        error: null,
        isTerminalState: true,
      });

      render(<TxTracker transactionHash={MOCK_TX_HASH} />);
      const link = screen.getByLabelText(/view on stellar explorer/i);
      expect(link).toBeInTheDocument();
    });

    it('should have proper title attribute on explorer link', () => {
      mockUseTxTracker.mockReturnValue({
        transactionHash: MOCK_TX_HASH,
        status: 'SUCCESS',
        message: '',
        stellarExplorerUrl: MOCK_EXPLORER_URL,
        isLoading: false,
        isPolling: false,
        error: null,
        isTerminalState: true,
      });

      render(<TxTracker transactionHash={MOCK_TX_HASH} />);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('title', 'View on Stellar Explorer');
    });
  });

  describe('Dark Mode Support', () => {
    it('should render with dark mode classes present', () => {
      mockUseTxTracker.mockReturnValue({
        transactionHash: MOCK_TX_HASH,
        status: 'SUCCESS',
        message: 'Transaction confirmed',
        stellarExplorerUrl: MOCK_EXPLORER_URL,
        isLoading: false,
        isPolling: false,
        error: null,
        isTerminalState: true,
      });

      const { container } = render(<TxTracker transactionHash={MOCK_TX_HASH} />);
      
      // Check for dark mode class presence
      const elements = container.querySelectorAll('[class*="dark:"]');
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long transaction hash', () => {
      const longHash = 'a'.repeat(64);
      mockUseTxTracker.mockReturnValue({
        transactionHash: longHash,
        status: 'SUCCESS',
        message: '',
        stellarExplorerUrl: MOCK_EXPLORER_URL,
        isLoading: false,
        isPolling: false,
        error: null,
        isTerminalState: true,
      });

      render(<TxTracker transactionHash={longHash} />);
      expect(screen.getByText(longHash)).toBeInTheDocument();
    });

    it('should handle empty message', () => {
      mockUseTxTracker.mockReturnValue({
        transactionHash: MOCK_TX_HASH,
        status: 'PENDING',
        message: '',
        stellarExplorerUrl: MOCK_EXPLORER_URL,
        isLoading: false,
        isPolling: true,
        error: null,
        isTerminalState: false,
      });

      render(<TxTracker transactionHash={MOCK_TX_HASH} />);
      expect(screen.getByText('Pending Confirmation')).toBeInTheDocument();
    });

    it('should handle special characters in message', () => {
      const specialMessage = 'Error: Amount exceeds limit & balance < required';
      mockUseTxTracker.mockReturnValue({
        transactionHash: MOCK_TX_HASH,
        status: 'FAILED',
        message: specialMessage,
        stellarExplorerUrl: MOCK_EXPLORER_URL,
        isLoading: false,
        isPolling: false,
        error: null,
        isTerminalState: true,
      });

      render(<TxTracker transactionHash={MOCK_TX_HASH} />);
      expect(screen.getByText(specialMessage)).toBeInTheDocument();
    });
  });
});
