/**
 * PaymentLock component tests
 *
 * Strategy: mock useLocalizedFiatPreview at the hook boundary so tests run
 * fast without a QueryClient or network. Focus on UI behaviour, the live
 * NGN/USD equivalents, form validation, accessibility, and the onLock
 * callback contract.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PaymentLock } from '@/components/escrow/PaymentLock';
import {
  useLocalizedFiatPreview,
  type UseLocalizedFiatPreviewResult,
  type LocalizedFiatEquivalent,
} from '@/hooks/useLocalizedFiatPreview';

// ---------------------------------------------------------------------------
// Mock the hook layer
// ---------------------------------------------------------------------------
jest.mock('@/hooks/useLocalizedFiatPreview');

const mockUseLocalizedFiatPreview =
  useLocalizedFiatPreview as jest.MockedFunction<
    typeof useLocalizedFiatPreview
  >;

// Mock FX rates (test doubles only — no rates are hardcoded in the component)
const NGN_RATE = 2_500; // 1 XLM = ₦2,500
const USD_RATE = 0.4; // 1 XLM = $0.40

const formatFiat = (value: number, fiatCode: 'NGN' | 'USD'): string =>
  new Intl.NumberFormat(fiatCode === 'NGN' ? 'en-NG' : 'en-US', {
    style: 'currency',
    currency: fiatCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

/**
 * Builds a hook result for a given XLM amount, mirroring the real hook:
 * positive amounts get formatted NGN + USD equivalents, anything else gets
 * empty equivalents.
 */
const previewFor = (xlmAmount: number): UseLocalizedFiatPreviewResult => {
  const isValid = Number.isFinite(xlmAmount) && xlmAmount > 0;
  const equivalents: LocalizedFiatEquivalent[] = (
    ['NGN', 'USD'] as const
  ).map((fiatCode) => ({
    fiatCode,
    formatted: isValid
      ? formatFiat(xlmAmount * (fiatCode === 'NGN' ? NGN_RATE : USD_RATE), fiatCode)
      : '',
    isLoading: false,
    isError: false,
  }));

  return {
    equivalents,
    ngnRate: isValid ? NGN_RATE : null,
    rateUpdatedAt: isValid ? '2026-06-27T10:00:00.000Z' : null,
    isLoading: false,
    isError: false,
  };
};

const DEFAULT_PREVIEW: UseLocalizedFiatPreviewResult = {
  equivalents: [
    { fiatCode: 'NGN', formatted: '', isLoading: false, isError: false },
    { fiatCode: 'USD', formatted: '', isLoading: false, isError: false },
  ],
  ngnRate: null,
  rateUpdatedAt: null,
  isLoading: false,
  isError: false,
};

const mockPreview = (overrides: Partial<UseLocalizedFiatPreviewResult> = {}) => {
  mockUseLocalizedFiatPreview.mockReturnValue({
    ...DEFAULT_PREVIEW,
    ...overrides,
  });
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
beforeEach(() => {
  jest.clearAllMocks();
  // Dynamic mock: equivalents follow whatever amount the component passes in,
  // so typing into the input updates the displayed fiat values.
  mockUseLocalizedFiatPreview.mockImplementation((amount) => previewFor(amount));
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('PaymentLock', () => {
  const mockOnLock = jest.fn();

  // -- Rendering -----------------------------------------------------------

  it('renders the form with the correct heading', () => {
    render(<PaymentLock onLock={mockOnLock} />);
    expect(
      screen.getByRole('heading', { name: /Lock Escrow Payment/i }),
    ).toBeInTheDocument();
  });

  it('renders the XLM amount input', () => {
    render(<PaymentLock onLock={mockOnLock} />);
    expect(screen.getByLabelText(/Amount \(XLM\)/i)).toBeInTheDocument();
  });

  it('pre-fills the input when initialAmount is provided', () => {
    render(<PaymentLock onLock={mockOnLock} initialAmount="1" />);
    expect(screen.getByLabelText(/Amount \(XLM\)/i)).toHaveValue('1');
  });

  it('renders a submit button', () => {
    render(<PaymentLock onLock={mockOnLock} />);
    expect(
      screen.getByRole('button', { name: /Lock Payment/i }),
    ).toBeInTheDocument();
  });

  it('renders the "Why XLM only?" tooltip trigger button', () => {
    render(<PaymentLock onLock={mockOnLock} />);
    expect(
      screen.getByRole('button', { name: /Why XLM only\?/i }),
    ).toBeInTheDocument();
  });

  // -- Accessibility -------------------------------------------------------

  it('has aria-label on the form', () => {
    render(<PaymentLock onLock={mockOnLock} />);
    expect(
      screen.getByRole('form', { name: /Lock escrow payment/i }),
    ).toBeInTheDocument();
  });

  it('has aria-live="polite" on the fiat equivalents section', () => {
    render(<PaymentLock onLock={mockOnLock} />);
    const liveRegion = document.getElementById('fiat-equivalents');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
  });

  // -- Tooltip interaction -------------------------------------------------

  it('shows the tooltip text on hover', async () => {
    render(<PaymentLock onLock={mockOnLock} />);
    const infoButton = screen.getByRole('button', { name: /Why XLM only\?/i });

    fireEvent.mouseEnter(infoButton);
    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      /Smart contracts on the Stellar network operate strictly in XLM/i,
    );

    fireEvent.mouseLeave(infoButton);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows the tooltip on keyboard focus', async () => {
    render(<PaymentLock onLock={mockOnLock} />);
    const infoButton = screen.getByRole('button', { name: /Why XLM only\?/i });

    fireEvent.focus(infoButton);
    expect(await screen.findByRole('tooltip')).toBeInTheDocument();

    fireEvent.blur(infoButton);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  // -- Fiat equivalents display --------------------------------------------

  it('shows loading text while the rate is being fetched', () => {
    mockPreview({ isLoading: true });
    render(<PaymentLock onLock={mockOnLock} />);
    expect(screen.getByText(/Fetching rate/i)).toBeInTheDocument();
  });

  it('shows "Fiat equivalents unavailable" when the rate fetch errors', () => {
    mockPreview({ isError: true });
    render(<PaymentLock onLock={mockOnLock} initialAmount="1" />);
    expect(
      screen.getByText(/Fiat equivalents unavailable/i),
    ).toBeInTheDocument();
  });

  it('displays the formatted NGN amount when a rate is available', () => {
    render(<PaymentLock onLock={mockOnLock} initialAmount="1" />);
    // The value span carries an aria-label, which disambiguates it from the
    // identical "₦2,500.00" in the rate line below.
    expect(
      screen.getByLabelText('Approximately ₦2,500.00'),
    ).toBeInTheDocument();
  });

  it('displays the formatted USD amount when a rate is available', () => {
    render(<PaymentLock onLock={mockOnLock} initialAmount="1" />);
    expect(screen.getByText('$0.40')).toBeInTheDocument();
  });

  it('shows "≈ NGN equivalent" and "≈ USD equivalent" labels next to the amounts', () => {
    render(<PaymentLock onLock={mockOnLock} initialAmount="0.5" />);
    expect(screen.getByText(/≈ NGN equivalent/i)).toBeInTheDocument();
    expect(screen.getByText(/≈ USD equivalent/i)).toBeInTheDocument();
  });

  it('renders NGN and USD amounts in a secondary text color', () => {
    render(<PaymentLock onLock={mockOnLock} initialAmount="1" />);
    // Both fiat values share the muted/secondary styling (gray-500)
    expect(screen.getByLabelText('Approximately ₦2,500.00')).toHaveClass(
      'text-gray-500',
    );
    expect(screen.getByText('$0.40')).toHaveClass('text-gray-500');
  });

  it('shows the placeholder text when input is empty and no error', () => {
    render(<PaymentLock onLock={mockOnLock} />);
    expect(
      screen.getByText(/Enter an amount to see the fiat equivalents/i),
    ).toBeInTheDocument();
  });

  it('updates the NGN equivalent instantly as the user types an XLM amount', () => {
    render(<PaymentLock onLock={mockOnLock} />);
    const input = screen.getByLabelText(/Amount \(XLM\)/i);

    fireEvent.change(input, { target: { value: '10' } });
    expect(screen.getByText('₦25,000.00')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: '20' } });
    expect(screen.getByText('₦50,000.00')).toBeInTheDocument();
    expect(screen.queryByText('₦25,000.00')).not.toBeInTheDocument();
  });

  it('updates the USD equivalent instantly as the user types an XLM amount', () => {
    render(<PaymentLock onLock={mockOnLock} />);
    const input = screen.getByLabelText(/Amount \(XLM\)/i);

    fireEvent.change(input, { target: { value: '10' } });
    expect(screen.getByText('$4.00')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: '2.5' } });
    expect(screen.getByText('$1.00')).toBeInTheDocument();
  });

  it('shows the NGN rate line when a rate is available', () => {
    render(<PaymentLock onLock={mockOnLock} initialAmount="1" />);
    const rateInfo = document.getElementById('rate-info');
    expect(rateInfo).toBeInTheDocument();
    expect(rateInfo).toHaveTextContent(/Rate: 1 XLM =/i);
    expect(rateInfo).toHaveTextContent(/₦2,500/);
  });

  // -- Missing / stale rates -----------------------------------------------

  it('keeps the available currency visible when the other rate fails', () => {
    mockPreview({
      isError: true,
      equivalents: [
        {
          fiatCode: 'NGN',
          formatted: '₦2,500.00',
          isLoading: false,
          isError: false,
        },
        { fiatCode: 'USD', formatted: '', isLoading: false, isError: true },
      ],
    });
    render(<PaymentLock onLock={mockOnLock} initialAmount="1" />);

    // NGN still shows; the failed USD rate gets an inline fallback, not a blank
    expect(screen.getByText('₦2,500.00')).toBeInTheDocument();
    expect(screen.getByText(/USD equivalent unavailable/i)).toBeInTheDocument();
    // The whole-form error must not appear when one currency is still usable
    expect(
      screen.queryByText('Fiat equivalents unavailable'),
    ).not.toBeInTheDocument();
  });

  it('shows no fiat values and no crash when rates are missing for a typed amount', () => {
    mockPreview({ isError: true });
    render(<PaymentLock onLock={mockOnLock} />);
    const input = screen.getByLabelText(/Amount \(XLM\)/i);

    fireEvent.change(input, { target: { value: '5' } });
    expect(
      screen.getByText(/Fiat equivalents unavailable/i),
    ).toBeInTheDocument();
    // The form stays usable: the submit button enables on a valid amount
    expect(
      screen.getByRole('button', { name: /Lock 5 XLM/i }),
    ).not.toBeDisabled();
  });

  it('hides the rate line when no rate is available', () => {
    mockPreview();
    render(<PaymentLock onLock={mockOnLock} />);
    expect(screen.queryByText(/Rate: 1 XLM =/i)).not.toBeInTheDocument();
  });

  // -- Input filtering / validation ----------------------------------------

  it('accepts numeric input', async () => {
    render(<PaymentLock onLock={mockOnLock} />);
    const input = screen.getByLabelText(/Amount \(XLM\)/i);
    fireEvent.change(input, { target: { value: '10' } });
    expect(input).toHaveValue('10');
  });

  it('accepts decimal input', async () => {
    render(<PaymentLock onLock={mockOnLock} />);
    const input = screen.getByLabelText(/Amount \(XLM\)/i);
    fireEvent.change(input, { target: { value: '0.5' } });
    expect(input).toHaveValue('0.5');
  });

  it('rejects non-numeric characters', async () => {
    render(<PaymentLock onLock={mockOnLock} />);
    const input = screen.getByLabelText(/Amount \(XLM\)/i);
    // The onChange handler filters non-numeric characters — value stays empty
    fireEvent.change(input, { target: { value: 'abc' } });
    expect(input).toHaveValue('');
  });

  it('shows a validation message when the input is non-empty but invalid', async () => {
    render(<PaymentLock onLock={mockOnLock} />);
    const input = screen.getByLabelText(/Amount \(XLM\)/i);
    // "0" is valid numerically but parsedXlm > 0 guard catches it
    // Simulate entering "0" which passes the regex but fails the > 0 check
    fireEvent.change(input, { target: { value: '0' } });
    expect(
      await screen.findByText(/valid XLM amount greater than 0/i),
    ).toBeInTheDocument();
  });

  // -- Submit button state -------------------------------------------------

  it('disables the submit button when input is empty', () => {
    render(<PaymentLock onLock={mockOnLock} />);
    expect(
      screen.getByRole('button', { name: /Lock Payment/i }),
    ).toBeDisabled();
  });

  it('enables the submit button when a valid amount is entered', async () => {
    render(<PaymentLock onLock={mockOnLock} initialAmount="1" />);
    expect(
      screen.getByRole('button', { name: /Lock 1 XLM/i }),
    ).not.toBeDisabled();
  });

  it('disables the entire form when the disabled prop is true', () => {
    render(<PaymentLock onLock={mockOnLock} disabled />);
    expect(screen.getByLabelText(/Amount \(XLM\)/i)).toBeDisabled();
  });

  // -- onLock callback -----------------------------------------------------

  it('calls onLock with the correct numeric value on submit', async () => {
    mockOnLock.mockResolvedValue(undefined);

    render(<PaymentLock onLock={mockOnLock} initialAmount="1" />);

    fireEvent.click(screen.getByRole('button', { name: /Lock 1 XLM/i }));

    await waitFor(() => expect(mockOnLock).toHaveBeenCalledWith(1));
  });

  it('calls onLock with a float value for decimal input', async () => {
    mockOnLock.mockResolvedValue(undefined);

    render(<PaymentLock onLock={mockOnLock} initialAmount="0.5" />);

    fireEvent.click(screen.getByRole('button', { name: /Lock 0.5 XLM/i }));

    await waitFor(() => expect(mockOnLock).toHaveBeenCalledWith(0.5));
  });

  // -- Submit error handling -----------------------------------------------

  it('shows an error alert when onLock throws', async () => {
    mockOnLock.mockRejectedValue(new Error('Wallet rejected transaction'));

    render(<PaymentLock onLock={mockOnLock} initialAmount="1" />);
    fireEvent.click(screen.getByRole('button', { name: /Lock 1 XLM/i }));

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent(/Wallet rejected transaction/i);
  });

  it('shows a generic error message when onLock throws a non-Error', async () => {
    mockOnLock.mockRejectedValue('unknown');

    render(<PaymentLock onLock={mockOnLock} initialAmount="1" />);
    fireEvent.click(screen.getByRole('button', { name: /Lock 1 XLM/i }));

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent(/Failed to lock escrow/i);
  });

  // -- useLocalizedFiatPreview called with correct value -------------------

  it('passes the current input value as a number to useLocalizedFiatPreview', () => {
    render(<PaymentLock onLock={mockOnLock} initialAmount="42" />);
    expect(mockUseLocalizedFiatPreview).toHaveBeenCalledWith(42);
  });

  it('passes 0 to useLocalizedFiatPreview when input is empty', () => {
    render(<PaymentLock onLock={mockOnLock} />);
    expect(mockUseLocalizedFiatPreview).toHaveBeenCalledWith(0);
  });

  it('passes the updated numeric value to the hook as the user types', () => {
    render(<PaymentLock onLock={mockOnLock} />);
    const input = screen.getByLabelText(/Amount \(XLM\)/i);
    fireEvent.change(input, { target: { value: '7.5' } });
    expect(mockUseLocalizedFiatPreview).toHaveBeenLastCalledWith(7.5);
  });
});
