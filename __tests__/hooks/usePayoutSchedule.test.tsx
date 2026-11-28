/**
 * usePayoutSchedule Hook Tests
 * Verifies scheduling a future payout date via the backend service.
 */

import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import React from 'react';
import { usePayoutSchedule } from '@/hooks/usePayoutSchedule';
import * as escrowPayoutService from '@/services/escrowPayoutService';

jest.mock('@/services/escrowPayoutService');

const mockSchedulePayout = escrowPayoutService.escrowPayoutService
  .schedulePayout as jest.MockedFunction<
  typeof escrowPayoutService.escrowPayoutService.schedulePayout
>;

function TestComponent() {
  const { scheduledDate, isLoading, error, schedulePayout } =
    usePayoutSchedule();
  return (
    <div>
      <span data-testid="scheduled-date">{scheduledDate ?? 'none'}</span>
      <span data-testid="is-loading">{String(isLoading)}</span>
      <span data-testid="error">{error ?? 'none'}</span>
      <button
        type="button"
        onClick={async () => {
          try {
            await schedulePayout('escrow-1', '2026-12-15T10:00:00.000Z');
          } catch {
            // Error captured in state by hook
          }
        }}
      >
        Schedule
      </button>
    </div>
  );
}

describe('usePayoutSchedule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSchedulePayout.mockResolvedValue({
      escrowId: 'escrow-1',
      scheduledDate: '2026-12-15T10:00:00.000Z',
      status: 'scheduled',
    });
  });

  it('calls escrowPayoutService.schedulePayout with escrowId and date', async () => {
    render(<TestComponent />);

    await act(async () => {
      fireEvent.click(screen.getByText('Schedule'));
    });

    expect(mockSchedulePayout).toHaveBeenCalledWith(
      'escrow-1',
      '2026-12-15T10:00:00.000Z'
    );

    expect(screen.getByTestId('scheduled-date')).toHaveTextContent(
      '2026-12-15T10:00:00.000Z'
    );
    expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
  });

  it('sets loading state while scheduling', async () => {
    let resolvePromise: (() => void) | null = null;
    mockSchedulePayout.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
    );

    render(<TestComponent />);

    // Fire the click without awaiting - the promise stays pending
    fireEvent.click(screen.getByText('Schedule'));

    // While the promise is pending, loading should be true
    expect(screen.getByTestId('is-loading')).toHaveTextContent('true');

    // Resolve the pending promise
    resolvePromise?.();

    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    });
  });

  it('sets error state when schedulePayout rejects', async () => {
    mockSchedulePayout.mockRejectedValue(new Error('Schedule failed'));

    render(<TestComponent />);

    await act(async () => {
      fireEvent.click(screen.getByText('Schedule'));
    });

    expect(screen.getByTestId('error')).toHaveTextContent('Schedule failed');
    expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
  });
});
