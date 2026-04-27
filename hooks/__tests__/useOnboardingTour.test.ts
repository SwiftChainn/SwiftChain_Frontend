import { act, renderHook } from '@testing-library/react';
import { EVENTS, STATUS, type CallBackProps } from 'react-joyride';
import { useOnboardingTour } from '@/hooks/useOnboardingTour';
import { onboardingTourService } from '@/services/onboardingTourService';

jest.mock('@/services/onboardingTourService', () => ({
  onboardingTourService: {
    getTourState: jest.fn(),
    saveTourState: jest.fn(),
    completeTour: jest.fn(),
    skipTour: jest.fn(),
  },
}));

describe('useOnboardingTour', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (onboardingTourService.getTourState as jest.Mock).mockReturnValue({
      completed: false,
      stepIndex: 0,
    });
  });

  it('should start running tour for first-time users', () => {
    const { result } = renderHook(() => useOnboardingTour());

    expect(result.current.run).toBe(true);
    expect(result.current.stepIndex).toBe(0);
    expect(result.current.steps.length).toBeGreaterThan(0);
  });

  it('should not run when tour is already completed', () => {
    (onboardingTourService.getTourState as jest.Mock).mockReturnValue({
      completed: true,
      stepIndex: 0,
    });

    const { result } = renderHook(() => useOnboardingTour());

    expect(result.current.run).toBe(false);
    expect(result.current.stepIndex).toBe(0);
  });

  it('should persist step progress on next event', () => {
    const { result } = renderHook(() => useOnboardingTour());

    act(() => {
      result.current.onJoyrideEvent({
        status: 'running',
        type: EVENTS.STEP_AFTER,
        index: 0,
        action: 'next',
      } as CallBackProps);
    });

    expect(onboardingTourService.saveTourState).toHaveBeenCalledWith({
      completed: false,
      stepIndex: 1,
    });
    expect(result.current.stepIndex).toBe(1);
  });

  it('should complete tour when finished', () => {
    const { result } = renderHook(() => useOnboardingTour());

    act(() => {
      result.current.onJoyrideEvent({
        status: STATUS.FINISHED,
      } as CallBackProps);
    });

    expect(onboardingTourService.completeTour).toHaveBeenCalledTimes(1);
    expect(result.current.run).toBe(false);
  });

  it('should skip tour and persist completed state', () => {
    const { result } = renderHook(() => useOnboardingTour());

    act(() => {
      result.current.skipTour();
    });

    expect(onboardingTourService.skipTour).toHaveBeenCalledTimes(1);
    expect(result.current.run).toBe(false);
  });
});
