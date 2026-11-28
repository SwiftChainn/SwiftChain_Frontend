'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  addMonths,
  format,
  formatISO,
  isAfter,
  isSameMonth,
  isSameDay,
  isBefore,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  subMonths,
} from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, Save, Clock } from 'lucide-react';
import { usePayoutSchedule } from '@/hooks/usePayoutSchedule';

interface PayoutScheduleProps {
  escrowId: string;
  className?: string;
}

/**
 * PayoutSchedule — monthly calendar UI for scheduling future escrow payout
 * dates. Selecting a future date persists it via escrowPayoutService.
 */
export function PayoutSchedule({
  escrowId,
  className,
}: PayoutScheduleProps): React.ReactElement {
  const { schedulePayout, isLoading, error, scheduledDate } =
    usePayoutSchedule();
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const today = useMemo(() => startOfMonth(new Date()), []);

  const monthDays = useMemo(() => {
    const start = startOfMonth(viewDate);
    const end = endOfMonth(viewDate);
    return eachDayOfInterval({ start, end });
  }, [viewDate]);

  const monthLabel = useMemo(() => format(viewDate, 'MMMM yyyy'), [viewDate]);

  const handleSelectDate = useCallback(
    (day: Date) => {
      // Only allow selecting future dates (today or later)
      if (isBefore(day, today)) return;
      setSelectedDate(day);
    },
    [today]
  );

  const handleSchedule = useCallback(async () => {
    if (!selectedDate) return;
    setIsSaved(false);
    await schedulePayout(escrowId, formatISO(selectedDate));
    setIsSaved(true);
  }, [escrowId, selectedDate, schedulePayout]);

  const handlePrevMonth = useCallback(() => {
    setViewDate((d) => subMonths(d, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setViewDate((d) => addMonths(d, 1));
  }, []);

  const isSelected = useCallback(
    (day: Date) => Boolean(selectedDate && isSameDay(day, selectedDate)),
    [selectedDate]
  );

  const isDisabled = useCallback(
    (day: Date) => isBefore(day, today),
    [today]
  );

  const isFuture = useCallback(
    (day: Date) => isAfter(day, today),
    [today]
  );

  return (
    <section
      aria-label="Payout schedule calendar"
      className={`${className ?? ''} space-y-4`}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Schedule Payout Date
        </h2>
        <Calendar className="w-5 h-5 text-gray-400" />
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handlePrevMonth}
          disabled={isBefore(viewDate, today)}
          className="rounded p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-800"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {monthLabel}
        </h3>
        <button
          type="button"
          onClick={handleNextMonth}
          className="rounded p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="px-2 py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {monthDays.map((day) => {
          const disabled = isDisabled(day);
          const selected = isSelected(day);
          const future = isFuture(day);
          return (
            <button
              key={formatISO(day)}
              type="button"
              onClick={() => handleSelectDate(day)}
              disabled={disabled}
              aria-label={format(day, 'PPPP')}
              data-testid={`payout-date-${formatISO(day)}`}
              className={`aspect-square rounded-lg p-1 text-sm transition-all ${
                disabled
                  ? 'text-gray-300 bg-transparent'
                  : selected
                    ? 'bg-sky-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
              } ${future ? '' : 'opacity-50'}`}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 pt-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Only future dates can be scheduled. Selected:{' '}
          {selectedDate ? format(selectedDate, 'PPP') : 'none'}
        </p>

        <button
          type="button"
          onClick={handleSchedule}
          disabled={!selectedDate || isLoading || isSaved}
          className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
            !selectedDate || isSaved
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600'
              : 'bg-sky-600 text-white hover:bg-sky-700'
          }`}
        >
          {isSaved ? (
            <>
              <Clock className="w-4 h-4" /> Scheduled
            </>
          ) : (
            <>
              <Save className="w-4 h-4" /> Schedule Payout
            </>
          )}
        </button>
      </div>

      {isLoading && (
        <p className="text-sm text-gray-500 dark:text-gray-400">Scheduling…</p>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </section>
  );
}

export default PayoutSchedule;
