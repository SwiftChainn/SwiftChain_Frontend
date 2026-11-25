'use client';

import { useCallback, useEffect, useState } from 'react';
import { disputeService } from '@/services/disputeService';
import type { DisputeCaseStatus, DisputeTimelineEvent } from '@/types/dispute';

interface TimelineResult {
  caseId: string;
  version: number;
  events: DisputeTimelineEvent[];
  currentStatus: DisputeCaseStatus | null;
  error: string | null;
}

function errorMessage(cause: unknown): string {
  if (cause instanceof Error) return cause.message;
  if (
    typeof cause === 'object' &&
    cause !== null &&
    'message' in cause &&
    typeof cause.message === 'string'
  ) {
    return cause.message;
  }
  return 'Failed to load dispute timeline.';
}

function sortTimeline(events: DisputeTimelineEvent[]): DisputeTimelineEvent[] {
  return [...events].sort((a, b) => {
    const aTime = new Date(a.timestamp).getTime();
    const bTime = new Date(b.timestamp).getTime();
    const aIsValid = Number.isFinite(aTime);
    const bIsValid = Number.isFinite(bTime);

    if (!aIsValid && !bIsValid) return 0;
    if (!aIsValid) return 1;
    if (!bIsValid) return -1;
    return aTime - bTime;
  });
}

export function useDisputeTimeline(caseId: string | null) {
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [result, setResult] = useState<TimelineResult | null>(null);

  useEffect(() => {
    if (!caseId) return;

    let active = true;

    Promise.all([
      disputeService.getDisputeTimeline(caseId),
      disputeService.getDisputeStatus(caseId),
    ])
      .then(([timeline, status]) => {
        if (!active) return;
        setResult({
          caseId,
          version: refreshVersion,
          events: sortTimeline(timeline.events),
          currentStatus: status.status,
          error: null,
        });
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setResult({
          caseId,
          version: refreshVersion,
          events: [],
          currentStatus: null,
          error: errorMessage(cause),
        });
      });

    return () => {
      active = false;
    };
  }, [caseId, refreshVersion]);

  const refresh = useCallback(() => setRefreshVersion((version) => version + 1), []);
  const hasCurrentResult =
    !!caseId && result?.caseId === caseId && result.version === refreshVersion;

  return {
    events: hasCurrentResult ? result.events : [],
    currentStatus: hasCurrentResult ? result.currentStatus : null,
    isLoading: !!caseId && !hasCurrentResult,
    error: hasCurrentResult ? result.error : null,
    refresh,
  };
}
