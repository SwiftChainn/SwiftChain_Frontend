import { act, render, screen } from '@testing-library/react';
import FeatureGate from '../FeatureGate';
import { clearFeatureFlagOverrides, setFeatureFlagOverride } from '@/lib/featureFlags';

afterEach(() => clearFeatureFlagOverrides());

describe('FeatureGate', () => {
  it('renders the fallback when the flag is off', () => {
    render(
      <FeatureGate flag="experimentalLiveTracking" fallback={<span>old</span>}>
        <span>new</span>
      </FeatureGate>,
    );
    expect(screen.getByText('old')).toBeInTheDocument();
    expect(screen.queryByText('new')).not.toBeInTheDocument();
  });

  it('renders children when enabled and reacts to runtime changes', () => {
    render(
      <FeatureGate flag="experimentalLiveTracking">
        <span>new</span>
      </FeatureGate>,
    );
    expect(screen.queryByText('new')).not.toBeInTheDocument();
    act(() => setFeatureFlagOverride('experimentalLiveTracking', true));
    expect(screen.getByText('new')).toBeInTheDocument();
  });
});
