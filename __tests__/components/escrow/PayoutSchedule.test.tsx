/**
 * PayoutSchedule Component Tests
 * Verifies monthly calendar rendering, future date selection, and scheduling.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { usePayoutSchedule } from '@/hooks/usePayoutSchedule';
import { PayoutSchedule } from '@/components/escrow/PayoutSchedule';

jest.mock('@/hooks/usePayoutSchedule');

const mockUsePayoutSchedule = usePayoutSchedule as jest.MockedFunction<
  typeof usePayoutSchedule
>;

describe('PayoutSchedule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePayoutSchedule.mockReturnValue({
      scheduledDate: null,
      isLoading: false,
      error: null,
      schedulePayout: jest.fn(),
    });
  });

  it('renders a monthly calendar with day labels', () => {
    render(<PayoutSchedule escrowId="escrow-1" />);

    expect(screen.getByText('Schedule Payout Date')).toBeInTheDocument();
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach((day) => {
      expect(screen.getByText(day)).toBeInTheDocument();
    });
  });

  it('allows selecting a future date', () => {
    render(<PayoutSchedule escrowId="escrow-1" />);

    // Get all date buttons (data-testid starts with payout-date-) that are not disabled
    const dateButtons = screen
      .getAllByTestId(/^payout-date-/)
      .filter((b) => !b.disabled);

    expect(dateButtons.length).toBeGreaterThan(0);

    fireEvent.click(dateButtons[0]);

    // Selected button should show the selected background color
    expect(dateButtons[0]).toHaveClass('bg-sky-600');
  });

  it('schedules the selected payout date via the service', async () => {
    mockUsePayoutSchedule.mockReturnValue({
      scheduledDate: '2026-11-28T00:00:00.000Z',
      isLoading: false,
      error: null,
      schedulePayout: jest.fn().mockResolvedValue(undefined),
    });

    render(<PayoutSchedule escrowId="escrow-1" />);

    // Select a future date button
    const dateButtons = screen
      .getAllByTestId(/^payout-date-/)
      .filter((b) => !b.disabled);

    fireEvent.click(dateButtons[0]);

    // Click schedule button (should be enabled now)
    const scheduleButton = screen.getByText('Schedule Payout');
    expect(scheduleButton).not.toBeDisabled();
    fireEvent.click(scheduleButton);

    expect(mockUsePayoutSchedule.mock.results[0].value.schedulePayout).toHaveBeenCalled();
  });

  it('shows loading state while scheduling', () => {
    mockUsePayoutSchedule.mockReturnValue({
      scheduledDate: null,
      isLoading: true,
      error: null,
      schedulePayout: jest.fn(),
    });

    render(<PayoutSchedule escrowId="escrow-1" />);

    expect(screen.getByText('Scheduling…')).toBeInTheDocument();
  });

  it('shows error state when scheduling fails', () => {
    mockUsePayoutSchedule.mockReturnValue({
      scheduledDate: null,
      isLoading: false,
      error: 'Failed to schedule payout',
      schedulePayout: jest.fn(),
    });

    render(<PayoutSchedule escrowId="escrow-1" />);

    expect(screen.getByText('Failed to schedule payout')).toBeInTheDocument();
  });

  it('disables past dates', () => {
    render(<PayoutSchedule escrowId="escrow-1" />);

    // Past date buttons should be disabled
    const disabledButtons = screen.getAllByRole('button', {
      disabled: true,
    });
    expect(disabledButtons.length).toBeGreaterThan(0);
  });
});
