export interface OnboardingTourState {
  completed: boolean;
  stepIndex: number;
}

const ONBOARDING_TOUR_STORAGE_KEY = 'onboarding_tour_v1';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export const onboardingTourService = {
  getTourState(): OnboardingTourState {
    if (!isBrowser()) {
      return { completed: false, stepIndex: 0 };
    }

    const rawValue = localStorage.getItem(ONBOARDING_TOUR_STORAGE_KEY);
    if (!rawValue) {
      return { completed: false, stepIndex: 0 };
    }

    try {
      const parsed = JSON.parse(rawValue) as Partial<OnboardingTourState>;
      return {
        completed: Boolean(parsed.completed),
        stepIndex:
          typeof parsed.stepIndex === 'number' && parsed.stepIndex >= 0
            ? parsed.stepIndex
            : 0,
      };
    } catch {
      return { completed: false, stepIndex: 0 };
    }
  },

  saveTourState(state: OnboardingTourState): void {
    if (!isBrowser()) {
      return;
    }

    localStorage.setItem(ONBOARDING_TOUR_STORAGE_KEY, JSON.stringify(state));
  },

  completeTour(): void {
    this.saveTourState({ completed: true, stepIndex: 0 });
  },

  skipTour(): void {
    this.completeTour();
  },
};

export { ONBOARDING_TOUR_STORAGE_KEY };
