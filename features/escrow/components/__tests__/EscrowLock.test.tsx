import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EscrowLock } from '../EscrowLock';
import { useEscrowLock } from '@/hooks/useEscrowLock';
import { useWalletStore } from '@/store/walletStore';
import { toast } from 'sonner';

jest.mock('@/hooks/useEscrowLock');
jest.mock('@/store/walletStore');
jest.mock('sonner');

describe('EscrowLock Component', () => {
  const mockWalletAddress = '0x123...789';
  const mockDeliveryId = 'delivery-123';
  const mockAmount = 100.50;
  const mockCurrency = 'USDC';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display the total cost correctly', () => {
    (useWalletStore as jest.Mock).mockReturnValue({
      address: mockWalletAddress,
      isConnected: true,
    });

    (useEscrowLock as jest.Mock).mockReturnValue({
      isLoading: false,
      error: null,
      escrowId: null,
      transactionHash: null,
      lockEscrow: jest.fn(),
      reset: jest.fn(),
    });

    render(
      <EscrowLock
        deliveryId={mockDeliveryId}
        amount={mockAmount}
        currency={mockCurrency}
      />
    );

    expect(screen.getByText('100.50')).toBeInTheDocument();
    expect(screen.getByText(mockCurrency)).toBeInTheDocument();
  });

  it('should disable submit button when wallet is not connected', () => {
    (useWalletStore as jest.Mock).mockReturnValue({
      address: null,
      isConnected: false,
    });

    (useEscrowLock as jest.Mock).mockReturnValue({
      isLoading: false,
      error: null,
      escrowId: null,
      transactionHash: null,
      lockEscrow: jest.fn(),
      reset: jest.fn(),
    });

    render(
      <EscrowLock
        deliveryId={mockDeliveryId}
        amount={mockAmount}
        currency={mockCurrency}
      />
    );

    const button = screen.getByRole('button', { name: /Lock Payment in Escrow/i });
    expect(button).toBeDisabled();
  });

  it('should show spinner and disable button while loading', () => {
    (useWalletStore as jest.Mock).mockReturnValue({
      address: mockWalletAddress,
      isConnected: true,
    });

    (useEscrowLock as jest.Mock).mockReturnValue({
      isLoading: true,
      error: null,
      escrowId: null,
      transactionHash: null,
      lockEscrow: jest.fn(),
      reset: jest.fn(),
    });

    render(
      <EscrowLock
        deliveryId={mockDeliveryId}
        amount={mockAmount}
        currency={mockCurrency}
      />
    );

    expect(screen.getByText(/Locking Payment…/i)).toBeInTheDocument();
  });

  it('should show confirmation modal when lock button is clicked', async () => {
    const mockLockEscrow = jest.fn();

    (useWalletStore as jest.Mock).mockReturnValue({
      address: mockWalletAddress,
      isConnected: true,
    });

    (useEscrowLock as jest.Mock).mockReturnValue({
      isLoading: false,
      error: null,
      escrowId: null,
      transactionHash: null,
      lockEscrow: mockLockEscrow,
      reset: jest.fn(),
    });

    render(
      <EscrowLock
        deliveryId={mockDeliveryId}
        amount={mockAmount}
        currency={mockCurrency}
      />
    );

    const lockButton = screen.getByRole('button', { name: /Lock Payment in Escrow/i });
    fireEvent.click(lockButton);

    await waitFor(() => {
      expect(screen.getByText(/Lock Payment in Escrow/i)).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('should call lockEscrow with correct params when confirmed', async () => {
    const mockLockEscrow = jest.fn();

    (useWalletStore as jest.Mock).mockReturnValue({
      address: mockWalletAddress,
      isConnected: true,
    });

    (useEscrowLock as jest.Mock).mockReturnValue({
      isLoading: false,
      error: null,
      escrowId: null,
      transactionHash: null,
      lockEscrow: mockLockEscrow,
      reset: jest.fn(),
    });

    render(
      <EscrowLock
        deliveryId={mockDeliveryId}
        amount={mockAmount}
        currency={mockCurrency}
      />
    );

    const lockButton = screen.getByRole('button', { name: /Lock Payment in Escrow/i });
    fireEvent.click(lockButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: /Lock Payment/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockLockEscrow).toHaveBeenCalledWith({
        deliveryId: mockDeliveryId,
        amount: mockAmount,
        currency: mockCurrency,
        walletAddress: mockWalletAddress,
      });
    });
  });

  it('should display success state with transaction hash', () => {
    const mockTransactionHash = '0xabc123def456ghi789jkl';

    (useWalletStore as jest.Mock).mockReturnValue({
      address: mockWalletAddress,
      isConnected: true,
    });

    (useEscrowLock as jest.Mock).mockReturnValue({
      isLoading: false,
      error: null,
      escrowId: 'escrow-123',
      transactionHash: mockTransactionHash,
      lockEscrow: jest.fn(),
      reset: jest.fn(),
    });

    render(
      <EscrowLock
        deliveryId={mockDeliveryId}
        amount={mockAmount}
        currency={mockCurrency}
      />
    );

    expect(screen.getByText(/Payment Locked Successfully/i)).toBeInTheDocument();
    expect(screen.getByText(/100.50 USDC/)).toBeInTheDocument();
    expect(screen.getByText(mockTransactionHash)).toBeInTheDocument();
  });

  it('should display error state', () => {
    const mockError = 'Insufficient funds in wallet';

    (useWalletStore as jest.Mock).mockReturnValue({
      address: mockWalletAddress,
      isConnected: true,
    });

    (useEscrowLock as jest.Mock).mockReturnValue({
      isLoading: false,
      error: mockError,
      escrowId: null,
      transactionHash: null,
      lockEscrow: jest.fn(),
      reset: jest.fn(),
    });

    render(
      <EscrowLock
        deliveryId={mockDeliveryId}
        amount={mockAmount}
        currency={mockCurrency}
      />
    );

    expect(screen.getByText(/Failed to Lock Payment/i)).toBeInTheDocument();
    expect(screen.getByText(mockError)).toBeInTheDocument();
  });

  it('should call onSuccess callback when escrow is locked', async () => {
    const mockOnSuccess = jest.fn();
    const mockTransactionHash = '0xabc123def456ghi789jkl';

    (useWalletStore as jest.Mock).mockReturnValue({
      address: mockWalletAddress,
      isConnected: true,
    });

    (useEscrowLock as jest.Mock).mockReturnValue({
      isLoading: false,
      error: null,
      escrowId: 'escrow-123',
      transactionHash: mockTransactionHash,
      lockEscrow: jest.fn(),
      reset: jest.fn(),
    });

    render(
      <EscrowLock
        deliveryId={mockDeliveryId}
        amount={mockAmount}
        currency={mockCurrency}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith('escrow-123', mockTransactionHash);
    });
  });

  it('should show wallet connection warning when not connected', () => {
    (useWalletStore as jest.Mock).mockReturnValue({
      address: null,
      isConnected: false,
    });

    (useEscrowLock as jest.Mock).mockReturnValue({
      isLoading: false,
      error: null,
      escrowId: null,
      transactionHash: null,
      lockEscrow: jest.fn(),
      reset: jest.fn(),
    });

    render(
      <EscrowLock
        deliveryId={mockDeliveryId}
        amount={mockAmount}
        currency={mockCurrency}
      />
    );

    expect(screen.getByText(/Connect your wallet to lock this payment/i)).toBeInTheDocument();
  });
});
