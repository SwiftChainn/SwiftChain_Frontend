'use client';

import Joyride from 'react-joyride';
import { useOnboardingTour } from '@/hooks/useOnboardingTour';

export function Tour() {
  const { run, stepIndex, steps, onJoyrideEvent, skipTour } =
    useOnboardingTour();

  return (
    <Joyride
      callback={onJoyrideEvent}
      continuous
      disableOverlayClose
      hideCloseButton={false}
      run={run}
      scrollToFirstStep
      showProgress
      showSkipButton
      stepIndex={stepIndex}
      steps={steps}
      styles={{
        options: {
          zIndex: 2000,
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        skip: 'Skip Tour',
      }}
      spotlightClicks={false}
      floaterProps={{
        disableAnimation: true,
      }}
      tooltipComponent={(props) => {
        const {
          backProps,
          closeProps,
          index,
          isLastStep,
          primaryProps,
          skipProps,
          step,
          tooltipProps,
        } = props;

        return (
          <div
            {...tooltipProps}
            className="max-w-sm rounded-lg border border-secondary/30 bg-white p-4 text-black shadow-xl dark:bg-slate-900 dark:text-white"
          >
            <div className="mb-3 text-sm leading-relaxed">{step.content}</div>
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                {...skipProps}
                onClick={() => {
                  skipTour();
                  skipProps?.onClick?.({} as never);
                }}
                className="text-xs text-secondary underline"
              >
                Skip Tour
              </button>
              <div className="flex items-center gap-2">
                {index > 0 && (
                  <button
                    type="button"
                    {...backProps}
                    className="rounded border border-secondary/40 px-2 py-1 text-xs"
                  >
                    Back
                  </button>
                )}
                <button
                  type="button"
                  {...primaryProps}
                  className="rounded bg-primary px-3 py-1 text-xs text-white"
                >
                  {isLastStep ? 'Finish' : 'Next'}
                </button>
                <button
                  type="button"
                  {...closeProps}
                  className="rounded border border-secondary/40 px-2 py-1 text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      }}
    />
  );
}
