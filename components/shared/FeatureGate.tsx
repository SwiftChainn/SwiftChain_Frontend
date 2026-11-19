'use client';

import type { ReactNode } from 'react';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import type { FeatureFlag } from '@/lib/featureFlags';

interface FeatureGateProps {
  flag: FeatureFlag;
  children: ReactNode;
  /** Rendered when the flag is off. Defaults to nothing. */
  fallback?: ReactNode;
}

/** Renders `children` only when the feature flag is enabled. */
export default function FeatureGate({ flag, children, fallback = null }: FeatureGateProps) {
  const enabled = useFeatureFlag(flag);
  return <>{enabled ? children : fallback}</>;
}
