'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { endOfDay, isAfter, isBefore, isValid, parseISO, startOfDay } from 'date-fns';
import { toast } from 'sonner';
import { auditTrailService } from '@/services/auditTrailService';
import type { AuditTrailEvent, AuditTrailSortOrder } from '@/types/auditTrail';

export function sortAuditEvents(
  events: AuditTrailEvent[],
  order: AuditTrailSortOrder,
): AuditTrailEvent[] {
  return [...events].sort((a, b) => {
    const aTime = new Date(a.timestamp).getTime();
    const bTime = new Date(b.timestamp).getTime();
    const aIsValid = Number.isFinite(aTime);
    const bIsValid = Number.isFinite(bTime);

    if (!aIsValid && !bIsValid) return 0;
    if (!aIsValid) return 1;
    if (!bIsValid) return -1;
    return order === 'newest' ? bTime - aTime : aTime - bTime;
  });
}

export function useAuditTrailList(deliveryId: string | null) {
  const [sortOrder, setSortOrder] = useState<AuditTrailSortOrder>('newest');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [copiedEventId, setCopiedEventId] = useState<string | null>(null);
  const copiedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const query = useQuery({
    queryKey: ['auditTrailList', deliveryId],
    queryFn: ({ signal }) => {
      if (!deliveryId) throw new Error('A delivery must be selected to load its audit trail.');
      return auditTrailService.getDeliveryEvents(deliveryId, signal);
    },
    enabled: Boolean(deliveryId),
    retry: false,
  });

  useEffect(
    () => () => {
      if (copiedTimeout.current) clearTimeout(copiedTimeout.current);
    },
    [],
  );

  const events = useMemo(() => {
    const from = startDate ? startOfDay(parseISO(startDate)) : null;
    const through = endDate ? endOfDay(parseISO(endDate)) : null;

    const filtered = (query.data ?? []).filter((event) => {
      const timestamp = parseISO(event.timestamp);
      if (!isValid(timestamp)) return !from && !through;
      if (from && isBefore(timestamp, from)) return false;
      if (through && isAfter(timestamp, through)) return false;
      return true;
    });

    return sortAuditEvents(filtered, sortOrder);
  }, [query.data, startDate, endDate, sortOrder]);

  const toggleSortOrder = useCallback(
    () => setSortOrder((current) => (current === 'newest' ? 'oldest' : 'newest')),
    [],
  );

  const resetDateRange = useCallback(() => {
    setStartDate('');
    setEndDate('');
  }, []);

  const copyEventId = useCallback(async (eventId: string) => {
    try {
      await navigator.clipboard.writeText(eventId);
      setCopiedEventId(eventId);
      if (copiedTimeout.current) clearTimeout(copiedTimeout.current);
      copiedTimeout.current = setTimeout(() => setCopiedEventId(null), 2000);
    } catch {
      toast.error('Could not copy the event ID');
      setCopiedEventId(null);
    }
  }, []);

  return {
    events,
    sortOrder,
    toggleSortOrder,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    hasDateFilter: Boolean(startDate || endDate),
    resetDateRange,
    isLoading: query.isLoading,
    isRefetching: query.isFetching && !query.isLoading,
    error: query.error instanceof Error
      ? query.error.message
      : query.error
        ? 'Unable to load the audit trail.'
        : null,
    retry: () => void query.refetch(),
    copiedEventId,
    copyEventId,
  };
}
