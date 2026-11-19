import {
  clearFeatureFlagOverrides,
  getFeatureFlags,
  isFeatureEnabled,
  parseFlagValue,
  setFeatureFlagOverride,
  subscribeToFeatureFlags,
} from '../featureFlags';

afterEach(() => clearFeatureFlagOverrides());

describe('parseFlagValue', () => {
  it.each([
    ['true', true],
    ['TRUE', true],
    [' 1 ', true],
    ['on', true],
    ['false', false],
    ['0', false],
    ['off', false],
    ['maybe', undefined],
    ['', undefined],
    [undefined, undefined],
  ])('parses %p', (input, expected) => {
    expect(parseFlagValue(input as string | undefined)).toBe(expected);
  });
});

describe('isFeatureEnabled', () => {
  it('defaults experimental flags to off', () => {
    expect(isFeatureEnabled('experimentalLiveTracking')).toBe(false);
    expect(Object.values(getFeatureFlags()).every((v) => v === false)).toBe(true);
  });

  it('honours runtime overrides and clearing them', () => {
    setFeatureFlagOverride('experimentalLiveTracking', true);
    expect(isFeatureEnabled('experimentalLiveTracking')).toBe(true);
    setFeatureFlagOverride('experimentalLiveTracking', undefined);
    expect(isFeatureEnabled('experimentalLiveTracking')).toBe(false);
  });

  it('is false for unknown flags', () => {
    expect(isFeatureEnabled('nope' as never)).toBe(false);
  });

  it('notifies subscribers on change until unsubscribed', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeToFeatureFlags(listener);
    setFeatureFlagOverride('experimentalBulkShipments', true);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    setFeatureFlagOverride('experimentalBulkShipments', false);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
