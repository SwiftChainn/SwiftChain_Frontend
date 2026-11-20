/**
 * Coverage for wallet approval (multi-sig) and escrow decision (lock / release) flows.
 * Complements useMultiSigApprovals.test.ts, useEscrowRelease.integration.test.ts and
 * useEscrowActions.test.tsx with boundary, rejection and guard-rail cases.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { EscrowActions } from '@/components/escrow/EscrowActions';
import { useEscrowRelease } from '@/hooks/useEscrowRelease';
import {
  assessOperationRisk,
  DEFAULT_HIGH_VALUE_THRESHOLD_XLM,
  useMultiSigApprovals,
} from '@/hooks/useMultiSigApprovals';
import { escrowActionsService } from '@/services/escrowActionsService';
import { escrowService } from '@/services/escrowService';
import { freighterService } from '@/services/freighterService';
import { walletService } from '@/services/walletService';
import type { PendingMultiSigOperation } from '@/types/multiSig';

jest.mock('@/services/walletService');
jest.mock('@/services/freighterService');
jest.mock('@/services/escrowService');
jest.mock('@/services/escrowActionsService', () => ({
  escrowActionsService: {
    getEscrow: jest.fn(),
    lockEscrow: jest.fn(),
    releaseEscrow: jest.fn(),
  },
}));
jest.mock('sonner', () => ({
  toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() },
}));

const mockWallet = jest.mocked(walletService);
const mockFreighter = jest.mocked(freighterService);
const mockEscrow = jest.mocked(escrowService);
const mockEscrowActions = jest.mocked(escrowActionsService);
const mockToast = jest.mocked(toast);

const SIGNER_KEY = 'GBUQWP3BOUZX34ULNQG23RQ6F4BVWCIRUUOKLVFEFK4QB26WVJDBKFEA';

const BASE_OPERATION: PendingMultiSigOperation = {
  operationId: 'op-1',
  transactionEnvelope: 'AAAA...',
  description: 'Release cargo escrow',
  signaturesRequired: 2,
  currentSignatures: 1,
  signers: [
    { publicKey: 'GACV3JHPXU7CKKYIRSTNLPFVFWGCAYDGBVNFNFJDG5BFCPJV7ZRKJSGN', weight: 1, approved: true },
    { publicKey: SIGNER_KEY, weight: 1, approved: false },
  ],
  createdAt: '2026-06-01T10:00:00Z',
  status: 'pending',
  expiresAt: '2026-06-08T10:00:00Z',
};

describe('assessOperationRisk boundaries', () => {
  const threshold = DEFAULT_HIGH_VALUE_THRESHOLD_XLM;

  it.each([
    [threshold, 'high', true],
    [threshold + 1, 'high', true],
    [threshold - 1, 'medium', false],
    [threshold / 2, 'medium', false],
    [threshold / 2 - 1, 'low', false],
    [0, 'low', false],
  ])('amount %p is %s risk', (amountXlm, riskLevel, isHighValue) => {
    expect(assessOperationRisk({ ...BASE_OPERATION, amountXlm })).toMatchObject({
      riskLevel,
      isHighValue,
    });
  });

  it('keeps operations with a missing or non-finite amount on the standard flow', () => {
    expect(assessOperationRisk(BASE_OPERATION).riskLevel).toBe('low');
    expect(assessOperationRisk({ ...BASE_OPERATION, amountXlm: NaN }).riskLevel).toBe('low');
    expect(assessOperationRisk({ ...BASE_OPERATION, amountXlm: Infinity }).riskLevel).toBe('low');
  });

  it('does not mutate the operation it is given', () => {
    const input = { ...BASE_OPERATION, amountXlm: threshold };
    assessOperationRisk(input);
    expect(input).not.toHaveProperty('isHighValue');
  });
});

describe('useMultiSigApprovals approval decisions', () => {
  const highValue = { ...BASE_OPERATION, operationId: 'op-high', amountXlm: 20000 };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFreighter.getPublicKey.mockResolvedValue(SIGNER_KEY);
    mockFreighter.signTransaction.mockResolvedValue('signed-xdr');
  });

  it('confirming with nothing held does not sign', async () => {
    const { result } = renderHook(() => useMultiSigApprovals());

    let signed: boolean | undefined;
    await act(async () => {
      signed = await result.current.confirmHighValueOperation();
    });

    expect(signed).toBe(false);
    expect(mockFreighter.signTransaction).not.toHaveBeenCalled();
    expect(mockWallet.signMultiSigOperation).not.toHaveBeenCalled();
  });

  it('releases the held operation and reports failure when the wallet rejects the approval', async () => {
    mockFreighter.signTransaction.mockRejectedValue(new Error('User declined access'));
    const { result } = renderHook(() => useMultiSigApprovals());

    await act(async () => {
      await result.current.signOperation(highValue);
    });
    expect(result.current.pendingHighValueOperation?.operationId).toBe('op-high');

    let signed: boolean | undefined;
    await act(async () => {
      signed = await result.current.confirmHighValueOperation();
    });

    expect(signed).toBe(false);
    expect(mockToast.error).toHaveBeenCalledWith('User declined access');
    expect(mockWallet.signMultiSigOperation).not.toHaveBeenCalled();
    expect(result.current.pendingHighValueOperation).toBeNull();
    expect(result.current.isSigning).toBe(false);
  });

  it('keeps local signature counts unchanged when the backend rejects the signature', async () => {
    mockWallet.getPendingMultiSigOperations.mockResolvedValue({
      success: true,
      message: 'ok',
      operations: [BASE_OPERATION],
    });
    mockWallet.signMultiSigOperation.mockResolvedValue({
      success: false,
      message: 'Operation expired',
    });
    const { result } = renderHook(() => useMultiSigApprovals());

    await act(async () => {
      await result.current.fetchPendingOperations('G-wallet');
    });

    let signed: boolean | undefined;
    await act(async () => {
      signed = await result.current.signOperation(result.current.operations[0]);
    });

    expect(signed).toBe(false);
    expect(mockToast.error).toHaveBeenCalledWith('Operation expired');
    expect(result.current.operations[0].currentSignatures).toBe(1);
    expect(result.current.operations[0].signers[1].approved).toBe(false);
  });

  it('marks only the connected signer as approved after a successful signature', async () => {
    mockWallet.getPendingMultiSigOperations.mockResolvedValue({
      success: true,
      message: 'ok',
      operations: [BASE_OPERATION],
    });
    mockWallet.signMultiSigOperation.mockResolvedValue({
      success: true,
      message: 'ok',
      currentSignatures: 2,
    });
    const { result } = renderHook(() => useMultiSigApprovals());

    await act(async () => {
      await result.current.fetchPendingOperations('G-wallet');
    });
    await act(async () => {
      await result.current.signOperation(result.current.operations[0]);
    });

    const [first, second] = result.current.operations[0].signers;
    expect(first.approved).toBe(true);
    expect(second.approved).toBe(true);
    expect(result.current.operations[0].currentSignatures).toBe(2);
    expect(mockToast.success).toHaveBeenCalledWith('Signature submitted successfully');
  });

  it('clears the previous error after a later successful fetch', async () => {
    mockWallet.getPendingMultiSigOperations
      .mockResolvedValueOnce({ success: false, message: 'Backend unavailable' })
      .mockResolvedValueOnce({ success: true, message: 'ok', operations: [BASE_OPERATION] });
    const { result } = renderHook(() => useMultiSigApprovals());

    await act(async () => {
      await result.current.fetchPendingOperations('G-wallet');
    });
    expect(result.current.error).toBe('Backend unavailable');
    expect(result.current.operations).toEqual([]);

    await act(async () => {
      await result.current.refreshOperations('G-wallet');
    });
    expect(result.current.error).toBeNull();
    expect(result.current.operations).toHaveLength(1);
  });

  it('honours a custom threshold when deciding whether approval needs the modal', async () => {
    const onHighValueOperation = jest.fn();
    const { result } = renderHook(() =>
      useMultiSigApprovals({ highValueThresholdXlm: 500, onHighValueOperation }),
    );

    await act(async () => {
      await result.current.signOperation({ ...BASE_OPERATION, amountXlm: 500 });
    });

    expect(onHighValueOperation).toHaveBeenCalledTimes(1);
    expect(mockWallet.signMultiSigOperation).not.toHaveBeenCalled();
  });
});

describe('useEscrowRelease decision guard rails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('refuses to open the confirm dialog without a connected wallet', () => {
    const { result } = renderHook(() => useEscrowRelease());

    act(() => result.current.openConfirmDialog('escrow-1', 'delivery-1', ''));

    expect(result.current.step).toBe('idle');
    expect(mockToast.error).toHaveBeenCalledWith(
      'No wallet connected. Please connect your wallet first.',
    );
  });

  it('opens the confirm dialog when a wallet is connected', () => {
    const { result } = renderHook(() => useEscrowRelease());

    act(() => result.current.openConfirmDialog('escrow-1', 'delivery-1', 'G-wallet'));

    expect(result.current.step).toBe('confirming');
  });

  it('uses a default message when the release is rejected without one', async () => {
    mockEscrow.releaseEscrow.mockResolvedValue({ success: false } as never);
    const { result } = renderHook(() => useEscrowRelease());

    await act(async () => {
      await result.current.confirmAndRelease('escrow-1', 'delivery-1', 'G-wallet');
    });

    expect(result.current.step).toBe('idle');
    expect(result.current.transactionHash).toBeNull();
    expect(mockToast.error).toHaveBeenCalledWith('Release failed.');
  });

  it('marks loaded escrow details as released only after a successful release', async () => {
    mockEscrow.getEscrowDetails.mockResolvedValue({
      requiredSignatures: 2,
      currentSignatures: 2,
      isReleased: false,
      signers: ['GA', 'GB'],
    } as never);
    mockEscrow.releaseEscrow.mockResolvedValueOnce({ success: false, message: 'nope' } as never);
    mockEscrow.releaseEscrow.mockResolvedValueOnce({
      success: true,
      transactionHash: 'abcdef1234567890',
    } as never);
    const { result } = renderHook(() => useEscrowRelease());

    await act(async () => {
      await result.current.fetchEscrowDetails('escrow-1');
    });
    await act(async () => {
      await result.current.confirmAndRelease('escrow-1', 'delivery-1', 'G-wallet');
    });
    expect(result.current.escrowDetails?.isReleased).toBe(false);

    await act(async () => {
      await result.current.confirmAndRelease('escrow-1', 'delivery-1', 'G-wallet');
    });
    expect(result.current.escrowDetails?.isReleased).toBe(true);
    expect(result.current.step).toBe('done');
    expect(result.current.transactionHash).toBe('abcdef1234567890');
    expect(mockToast.success).toHaveBeenCalledWith('Payment released! Tx: abcdef123456…');
  });

  it('leaves loaded escrow details untouched when fetching them fails', async () => {
    mockEscrow.getEscrowDetails.mockRejectedValue(new Error('rpc down'));
    const { result } = renderHook(() => useEscrowRelease());

    await act(async () => {
      await result.current.fetchEscrowDetails('escrow-1');
    });

    expect(result.current.escrowDetails).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(mockToast.error).toHaveBeenCalledWith(
      'Unable to fetch escrow details. Please try again.',
    );
  });
});

describe('EscrowActions decision UI', () => {
  const escrow = (status: 'Pending' | 'Locked' | 'Released') => ({
    id: 'escrow-9',
    shipmentId: 'shipment-9',
    status,
    updatedAt: '2026-09-29T08:00:00.000Z',
  });

  function renderActions() {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return render(
      <QueryClientProvider client={client}>
        <EscrowActions shipmentId="shipment-9" />
      </QueryClientProvider>,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('offers only Lock funds while Pending', async () => {
    mockEscrowActions.getEscrow.mockResolvedValue(escrow('Pending'));
    renderActions();

    expect(await screen.findByRole('button', { name: /lock funds/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /release funds/i })).not.toBeInTheDocument();
  });

  it('offers only Release funds while Locked, and calls the release endpoint', async () => {
    mockEscrowActions.getEscrow.mockResolvedValue(escrow('Locked'));
    mockEscrowActions.releaseEscrow.mockResolvedValue(escrow('Released'));
    const user = userEvent.setup();
    renderActions();

    expect(screen.queryByRole('button', { name: /lock funds/i })).not.toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /release funds/i }));

    await waitFor(() => expect(mockEscrowActions.releaseEscrow).toHaveBeenCalledWith('shipment-9'));
    expect(await screen.findByText('Payment complete')).toBeInTheDocument();
    expect(mockEscrowActions.lockEscrow).not.toHaveBeenCalled();
  });

  it('shows no decision buttons once Released', async () => {
    mockEscrowActions.getEscrow.mockResolvedValue(escrow('Released'));
    renderActions();

    expect(await screen.findByText('Payment complete')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('disables the decision button while the request is in flight', async () => {
    mockEscrowActions.getEscrow.mockResolvedValue(escrow('Pending'));
    mockEscrowActions.lockEscrow.mockReturnValue(new Promise(() => undefined));
    const user = userEvent.setup();
    renderActions();

    await user.click(await screen.findByRole('button', { name: /lock funds/i }));

    // Optimistic state is Locked, so the Release button appears disabled until confirmed.
    expect(await screen.findByRole('button', { name: /release funds/i })).toBeDisabled();
  });

  it('restores Pending and explains the failure when locking is rejected', async () => {
    mockEscrowActions.getEscrow.mockResolvedValue(escrow('Pending'));
    mockEscrowActions.lockEscrow.mockRejectedValue(new Error('Insufficient balance'));
    const user = userEvent.setup();
    renderActions();

    await user.click(await screen.findByRole('button', { name: /lock funds/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Insufficient balance. The previous escrow status has been restored.',
    );
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('shows the load error when the escrow cannot be fetched', async () => {
    mockEscrowActions.getEscrow.mockRejectedValue(new Error('Escrow not found'));
    renderActions();

    expect(await screen.findByRole('alert')).toHaveTextContent('Escrow not found');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
