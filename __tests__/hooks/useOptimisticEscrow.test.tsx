/**
 * useOptimisticEscrow Hook Tests
 * Verifies optimistic lock/release updates and rollback on backend error.
 */

import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { useOptimisticEscrow } from '@/hooks/useOptimisticEscrow';
import * as escrowActionsService from '@/services/escrowActionsService';

jest.mock('@/services/escrowActionsService');

const mockLockEscrow = escrowActionsService.escrowActionsService
  .lockEscrow as jest.MockedFunction<
  typeof escrowActionsService.escrowActionsService.lockEscrow
>;
const mockReleaseEscrow = escrowActionsService.escrowActionsService
  .releaseEscrow as jest.MockedFunction<
  typeof escrowActionsService.escrowActionsService.releaseEscrow
>;

function TestComponent() {
  const {
    escrow,
    isLoading,
    isOptimistic,
    error,
    lockEscrow,
    releaseEscrow,
    rollback,
  } = useOptimisticEscrow();
  return (
    <div>
      <span data-testid="escrow-status">{escrow?.status ?? 'none'}</span>
      <span data-testid="is-optimistic">{String(isOptimistic)}</span>
      <span data-testid="is-loading">{String(isLoading)}</span>
      <span data-testid="error">{error ?? 'none'}</span>
      <button
        type="button"
        onClick={async () => {
          try {
            await lockEscrow('shipment-1');
          } catch {
            // Error captured in state by hook
          }
        }}
      >
        Lock
      </button>
      <button
        type="button"
        onClick={async () => {
          try {
            await releaseEscrow('shipment-1');
          } catch {
            // Error captured in state by hook
          }
        }}
      >
        Release
      </button>
      <button type="button" onClick={rollback}>
        Rollback
      </button>
    </div>
  );
}

describe('useOptimisticEscrow', () => {
  const baseState: escrowActionsService.EscrowActionState = {
    id: 'escrow-1',
    shipmentId: 'shipment-1',
    status: 'Pending',
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLockEscrow.mockResolvedValue(baseState);
    mockReleaseEscrow.mockResolvedValue(baseState);
  });

  it('optimistically updates status to Locked immediately, then confirms with backend', async () => {
    let resolveLock: (() => void) | null = null;
    mockLockEscrow.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveLock = resolve;
          resolve({ ...baseState, status: 'Locked' });
        })
    );

    render(<TestComponent />);

    expect(screen.getByTestId('escrow-status')).toHaveTextContent('none');
    expect(screen.getByTestId('is-optimistic')).toHaveTextContent('false');

    act(() => {
      fireEvent.click(screen.getByText('Lock'));
    });

    // Optimistic update applied immediately (before backend resolves)
    expect(screen.getByTestId('escrow-status')).toHaveTextContent('Locked');
    expect(screen.getByTestId('is-optimistic')).toHaveTextContent('true');
    expect(screen.getByTestId('is-loading')).toHaveTextContent('true');

    // Backend called
    expect(mockLockEscrow).toHaveBeenCalledWith('shipment-1');

    // Allow async to complete
    await act(async () => {});

    // Confirmed, no longer optimistic
    expect(screen.getByTestId('is-optimistic')).toHaveTextContent('false');
    expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
  });

  it('rolls back UI state when lockEscrow backend rejects', async () => {
    let resolveLock: (() => void) | null = null;
    mockLockEscrow.mockImplementation(
      () =>
        new Promise((resolve, reject) => {
          resolveLock = resolve;
          reject(new Error('Backend rejected lock'));
        })
    );

    render(<TestComponent />);

    act(() => {
      fireEvent.click(screen.getByText('Lock'));
    });

    // Optimistic update applied
    expect(screen.getByTestId('escrow-status')).toHaveTextContent('Locked');
    expect(screen.getByTestId('is-optimistic')).toHaveTextContent('true');

    await act(async () => {});

    // Rolled back to previous state (null)
    expect(screen.getByTestId('escrow-status')).toHaveTextContent('none');
    expect(screen.getByTestId('is-optimistic')).toHaveTextContent('false');
    expect(screen.getByTestId('error')).toHaveTextContent(
      'Backend rejected lock'
    );
  });

  it('optimistically updates status to Released, then confirms', async () => {
    let resolveRelease: (() => void) | null = null;
    mockReleaseEscrow.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRelease = resolve;
          resolve({ ...baseState, status: 'Released' });
        })
    );

    render(<TestComponent />);

    act(() => {
      fireEvent.click(screen.getByText('Release'));
    });

    expect(screen.getByTestId('escrow-status')).toHaveTextContent('Released');
    expect(screen.getByTestId('is-optimistic')).toHaveTextContent('true');
    expect(mockReleaseEscrow).toHaveBeenCalledWith('shipment-1');

    await act(async () => {});

    expect(screen.getByTestId('is-optimistic')).toHaveTextContent('false');
  });

  it('rollback restores previous escrow state', async () => {
    mockLockEscrow.mockResolvedValue({
      ...baseState,
      status: 'Locked',
    });

    render(<TestComponent />);

    act(() => {
      fireEvent.click(screen.getByText('Lock'));
    });
    await act(async () => {});

    expect(screen.getByTestId('escrow-status')).toHaveTextContent('Locked');

    fireEvent.click(screen.getByText('Rollback'));

    expect(screen.getByTestId('escrow-status')).toHaveTextContent('none');
    expect(screen.getByTestId('is-optimistic')).toHaveTextContent('false');
  });
});
