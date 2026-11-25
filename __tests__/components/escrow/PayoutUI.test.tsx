import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PayoutUI } from '@/components/escrow/PayoutUI';
import { escrowService } from '@/services/escrowService';
import { escrowPayoutService } from '@/services/escrowPayoutService';
import { payoutQuote, payoutResponses, releaseResponse } from '@/__tests__/fixtures/escrowPayoutResponses';
import type { EscrowDetails } from '@/types/escrow';

jest.mock('@/services/escrowService', () => ({ escrowService: {
  getEscrowDetails: jest.fn(), releaseFunds: jest.fn(),
} }));
jest.mock('@/services/escrowPayoutService', () => ({ escrowPayoutService: { getPayoutFeeQuote: jest.fn() } }));
jest.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast: jest.fn() }) }));

const escrowId = 'synthetic-testnet-escrow';
let client: QueryClient;

beforeEach(() => {
  jest.resetAllMocks();
  client = new QueryClient({ defaultOptions: {
    queries: { retry: false, gcTime: 0 },
    mutations: { retry: false },
  } });
  (escrowPayoutService.getPayoutFeeQuote as jest.Mock).mockResolvedValue(payoutQuote);
  (escrowService.releaseFunds as jest.Mock).mockResolvedValue(releaseResponse);
});
afterEach(() => { cleanup(); client.clear(); });

async function showPayout(response: EscrowDetails) {
  (escrowService.getEscrowDetails as jest.Mock).mockResolvedValue(response);
  render(<QueryClientProvider client={client}><PayoutUI escrowId={escrowId} /></QueryClientProvider>);
  return screen.findByRole('button', { name: 'Release Funds' });
}

describe('PayoutUI multi-signature states through the real hook and service boundary', () => {
  it.each([
    ['zero of two', payoutResponses.unsigned],
    ['one of two', payoutResponses.oneOfTwo],
    ['two of three', payoutResponses.twoOfThree],
  ] as const)('keeps release disabled for %s signatures', async (_name, response) => {
    const button = await showPayout(response);
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('disabled');
    expect(() => fireEvent.click(button)).not.toThrow();
    await userEvent.click(button);
    expect(escrowService.releaseFunds).not.toHaveBeenCalled();
    expect(escrowService.getEscrowDetails).toHaveBeenCalledWith(escrowId);
  });

  it.each([
    ['two of two', payoutResponses.twoOfTwo],
    ['three of three', payoutResponses.threeOfThree],
  ] as const)('enables release when %s signatures meet the threshold', async (_name, response) => {
    const button = await showPayout(response);
    expect(button).toBeEnabled();
    expect(button).not.toHaveAttribute('disabled');
    await userEvent.click(button);
    await waitFor(() => expect(escrowService.releaseFunds).toHaveBeenCalledTimes(1));
    expect(escrowService.releaseFunds).toHaveBeenCalledWith(escrowId);
  });

  it('enables release only after a backend refetch confirms the second signature', async () => {
    const button = await showPayout(payoutResponses.oneOfTwo);
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(escrowService.releaseFunds).not.toHaveBeenCalled();

    (escrowService.getEscrowDetails as jest.Mock).mockResolvedValue(payoutResponses.twoOfTwo);
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['escrowPayout', escrowId] });
    });
    await waitFor(() => expect(button).toBeEnabled());
    await userEvent.click(button);
    await waitFor(() => expect(escrowService.releaseFunds).toHaveBeenCalledTimes(1));
  });

  it('prevents a second release after the escrow is already released', async () => {
    const button = await showPayout(payoutResponses.released);
    expect(button).toHaveAttribute('disabled');
    expect(() => fireEvent.click(button)).not.toThrow();
    expect(escrowService.releaseFunds).not.toHaveBeenCalled();
  });

  it('does not expose a release control while the initial response is pending', () => {
    (escrowService.getEscrowDetails as jest.Mock).mockReturnValue(new Promise(() => {}));
    render(<QueryClientProvider client={client}><PayoutUI escrowId={escrowId} /></QueryClientProvider>);
    expect(screen.getByLabelText('Loading payout UI')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Release Funds' })).not.toBeInTheDocument();
    expect(escrowService.releaseFunds).not.toHaveBeenCalled();
  });

  it('shows a failed state without exposing a release control', async () => {
    (escrowService.getEscrowDetails as jest.Mock).mockRejectedValue(new Error('Testnet API unavailable'));
    render(<QueryClientProvider client={client}><PayoutUI escrowId={escrowId} /></QueryClientProvider>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Testnet API unavailable');
    expect(screen.queryByRole('button', { name: 'Release Funds' })).not.toBeInTheDocument();
  });
});
