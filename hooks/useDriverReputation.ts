'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { reputationService } from '@/services/reputationService';

export interface UseDriverReputationResult {
  onChainScore: number | null;
  isLoading: boolean;
  error: string | null;
}

interface ReputationSnapshot {
  driverId: string;
  onChainScore: number | null;
  error: string | null;
}

const EMPTY_SNAPSHOT: ReputationSnapshot = {
  driverId: '',
  onChainScore: null,
  error: null,
};

/**
 * useDriverReputation — fetches a driver's on-chain reputation token score.
 *
 * Components consume this hook; they never call reputationService directly.
 * Aborts in-flight requests on unmount or driverId change to avoid setting
 * state on an unmounted component.
 */
export function useDriverReputation(driverId: string): UseDriverReputationResult {
  const [snapshot, setSnapshot] = useState<ReputationSnapshot>(EMPTY_SNAPSHOT);

  useEffect(() => {
    if (!driverId) {
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    reputationService
      .getDriverReputation(driverId, controller.signal)
      .then((data) => {
        if (cancelled) return;
        setSnapshot({ driverId, onChainScore: data.onChainScore, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (axios.isCancel(err)) return;
        const message =
          err instanceof Error && err.message
            ? err.message
            : 'Failed to load on-chain reputation';
        setSnapshot({ driverId, onChainScore: null, error: message });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [driverId]);

  if (!driverId) {
    return { onChainScore: null, isLoading: false, error: null };
  }

  const isSettled = snapshot.driverId === driverId;

  return {
    onChainScore: isSettled ? snapshot.onChainScore : null,
    isLoading: !isSettled,
    error: isSettled ? snapshot.error : null,
  };
}
