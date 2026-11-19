/**
 * Feature flags for rollout-safe experimental features.
 *
 * To add a flag:
 *   1. Add its key + default to `FEATURE_FLAGS`.
 *   2. Add a matching static `process.env.NEXT_PUBLIC_FF_<NAME>` line to `ENV_VALUES`
 *      (Next.js only inlines env vars that are referenced statically, so they
 *      cannot be looked up dynamically).
 *   3. Document it in `.env.example`.
 *
 * Resolution order (highest wins): runtime override -> env var -> default.
 * All flags default to OFF so an unconfigured environment never exposes
 * experimental behaviour.
 */

export const FEATURE_FLAGS = {
  /** Experimental live tracking experience. */
  experimentalLiveTracking: false,
  /** Experimental bulk shipment import. */
  experimentalBulkShipments: false,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

/** Static references so Next.js can inline them at build time. */
const ENV_VALUES: Record<FeatureFlag, string | undefined> = {
  experimentalLiveTracking: process.env.NEXT_PUBLIC_FF_EXPERIMENTAL_LIVE_TRACKING,
  experimentalBulkShipments: process.env.NEXT_PUBLIC_FF_EXPERIMENTAL_BULK_SHIPMENTS,
};

const overrides: Partial<Record<FeatureFlag, boolean>> = {};
const listeners = new Set<() => void>();

/** Parse an env string. Unrecognised/empty values yield `undefined` (use default). */
export function parseFlagValue(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  switch (value.trim().toLowerCase()) {
    case '1':
    case 'true':
    case 'on':
    case 'yes':
      return true;
    case '0':
    case 'false':
    case 'off':
    case 'no':
      return false;
    default:
      return undefined;
  }
}

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  if (!(flag in FEATURE_FLAGS)) return false;
  const override = overrides[flag];
  if (override !== undefined) return override;
  return parseFlagValue(ENV_VALUES[flag]) ?? FEATURE_FLAGS[flag];
}

/** Snapshot of every flag's resolved value. */
export function getFeatureFlags(): Record<FeatureFlag, boolean> {
  return (Object.keys(FEATURE_FLAGS) as FeatureFlag[]).reduce(
    (acc, flag) => {
      acc[flag] = isFeatureEnabled(flag);
      return acc;
    },
    {} as Record<FeatureFlag, boolean>,
  );
}

/** Force a flag on/off at runtime (QA tooling, tests). Pass `undefined` to clear. */
export function setFeatureFlagOverride(flag: FeatureFlag, value: boolean | undefined): void {
  if (value === undefined) delete overrides[flag];
  else overrides[flag] = value;
  listeners.forEach((listener) => listener());
}

export function clearFeatureFlagOverrides(): void {
  (Object.keys(overrides) as FeatureFlag[]).forEach((flag) => delete overrides[flag]);
  listeners.forEach((listener) => listener());
}

export function subscribeToFeatureFlags(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
