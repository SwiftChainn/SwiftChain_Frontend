import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaymentLock } from '@/components/escrow/PaymentLock';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const renderWithClient = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
};

describe('PaymentLock - Enter Key Validation', () => {
  it('does not call onLock when pressing Enter with an empty amount', async () => {
    const onLock = jest.fn();
    renderWithClient(<PaymentLock onLock={onLock} />);

    const form = screen.getByRole('form', { name: /lock escrow payment/i });
    fireEvent.submit(form);

    expect(onLock).not.toHaveBeenCalled();
  });

  it('does not call onLock when pressing Enter with a negative amount', async () => {
    const onLock = jest.fn();
    renderWithClient(<PaymentLock onLock={onLock} />);

    const input = screen.getByLabelText(/amount \(xlm\)/i);
    fireEvent.change(input, { target: { value: '-10' } });

    // Negative values are blocked by handleChange (/^\d*\.?\d*$/), so input stays empty
    // or we force submit with invalid state — either way onLock must not run
    const form = screen.getByRole('form', { name: /lock escrow payment/i });
    fireEvent.submit(form);

    expect(onLock).not.toHaveBeenCalled();
  });

  it('calls onLock when pressing Enter with a valid amount', async () => {
    const onLock = jest.fn().mockResolvedValue(undefined);
    renderWithClient(<PaymentLock onLock={onLock} />);

    const input = screen.getByLabelText(/amount \(xlm\)/i);
    fireEvent.change(input, { target: { value: '100' } });

    const form = screen.getByRole('form', { name: /lock escrow payment/i });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(onLock).toHaveBeenCalledWith(100);
    });
  });
});
