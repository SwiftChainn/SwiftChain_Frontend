'use client';

import { useSyncExternalStore } from 'react';
import {
  isFeatureEnabled,
  subscribeToFeatureFlags,
  type FeatureFlag,
} from '@/lib/featureFlags';

/** Returns whether a feature flag is enabled; re-renders on runtime overrides. */
export function useFeatureFlag(flag: FeatureFlag): boolean {
  return useSyncExternalStore(
    subscribeToFeatureFlags,
    () => isFeatureEnabled(flag),
    () => isFeatureEnabled(flag),
  );
}
