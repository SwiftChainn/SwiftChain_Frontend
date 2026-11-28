'use client';

import { useState, useCallback } from 'react';
import { escrowPayoutService } from '@/services/escrowPayoutService';

export interface UsePayoutScheduleReturn {
  /** Currently scheduled payout date (ISO string), if any. */
  scheduledDate: string | null;
  /** Whether a schedule request is currently in flight. */
  isLoading: boolean;
  /** Error message from the most recent schedule request, if any. */
  error: string | null;
  /** Schedule a future payout date for the given escrow via the backend API. */
  schedulePayout: (escrowId: string, scheduledDate: string) => Promise<void>;
}

/**
 * Hook for scheduling future escrow payout dates.
 * Follows the Component -> Hook -> Service layered architecture.
 * All data is retrieved from the backend API via escrowPayoutService.
 */
export function usePayoutSchedule(): UsePayoutScheduleReturn {
  const [scheduledDate, setScheduledDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const schedulePayout = useCallback(
    async (escrowId: string, date: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await escrowPayoutService.schedulePayout(
          escrowId,
          date
        );
        setScheduledDate(result.scheduledDate);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to schedule payout';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    scheduledDate,
    isLoading,
    error,
    schedulePayout,
  };
}
