import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GlobalErrorBoundary } from '@/components/shared';
import GlobalError from '@/app/error';
import { errorLoggerService } from '@/services/errorLoggerService';

jest.mock('@/services/errorLoggerService', () => ({
  errorLoggerService: {
    logReactError: jest.fn().mockResolvedValue({ success: true, errorId: 'id' }),
    logJSError: jest.fn().mockResolvedValue({ success: true }),
    logNetworkError: jest.fn().mockResolvedValue({ success: true }),
  },
}));

const mockLog = jest.mocked(errorLoggerService.logReactError);

const FALLBACK_TITLE = 'Oops! Something went wrong';

/** Throws while `broken.value` is true, so a test can "fix" the cause before recovery. */
const broken = { value: true };

function Flaky({ label = 'recovered content' }: { label?: string }) {
  if (broken.value) throw new Error('flaky render failure');
  return <div>{label}</div>;
}

describe('GlobalErrorBoundary recovery (regression)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    broken.value = true;
    mockLog.mockResolvedValue({ success: true, errorId: 'id' } as never);
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the fallback, then renders children again once resetKeys change after the cause is fixed', () => {
    const { rerender } = render(
      <GlobalErrorBoundary resetKeys={['/a']}>
        <Flaky />
      </GlobalErrorBoundary>,
    );
    expect(screen.getByText(FALLBACK_TITLE)).toBeInTheDocument();

    broken.value = false;
    rerender(
      <GlobalErrorBoundary resetKeys={['/b']}>
        <Flaky />
      </GlobalErrorBoundary>,
    );

    expect(screen.getByText('recovered content')).toBeInTheDocument();
    expect(screen.queryByText(FALLBACK_TITLE)).not.toBeInTheDocument();
  });

  it('stays on the fallback when resetKeys change but the child still throws, and logs each failure', async () => {
    const { rerender } = render(
      <GlobalErrorBoundary resetKeys={[1]}>
        <Flaky />
      </GlobalErrorBoundary>,
    );
    await waitFor(() => expect(mockLog).toHaveBeenCalledTimes(1));

    rerender(
      <GlobalErrorBoundary resetKeys={[2]}>
        <Flaky />
      </GlobalErrorBoundary>,
    );

    expect(screen.getByText(FALLBACK_TITLE)).toBeInTheDocument();
    await waitFor(() => expect(mockLog).toHaveBeenCalledTimes(2));
  });

  it('does not recover on a rerender when resetKeys are unchanged', () => {
    const { rerender } = render(
      <GlobalErrorBoundary resetKeys={['same']}>
        <Flaky />
      </GlobalErrorBoundary>,
    );

    broken.value = false;
    rerender(
      <GlobalErrorBoundary resetKeys={['same']}>
        <Flaky />
      </GlobalErrorBoundary>,
    );

    expect(screen.getByText(FALLBACK_TITLE)).toBeInTheDocument();
  });

  it('recovers repeatedly across several error and reset cycles', () => {
    const { rerender } = render(
      <GlobalErrorBoundary resetKeys={[0]}>
        <Flaky />
      </GlobalErrorBoundary>,
    );

    for (let cycle = 1; cycle <= 3; cycle += 1) {
      broken.value = false;
      rerender(
        <GlobalErrorBoundary resetKeys={[cycle]}>
          <Flaky />
        </GlobalErrorBoundary>,
      );
      expect(screen.getByText('recovered content')).toBeInTheDocument();

      // Break the child and move to a new key: the retried render throws and is caught again.
      broken.value = true;
      rerender(
        <GlobalErrorBoundary resetKeys={[cycle + 100]}>
          <Flaky />
        </GlobalErrorBoundary>,
      );
      expect(screen.getByText(FALLBACK_TITLE)).toBeInTheDocument();
    }
  });

  it('keeps the fallback visible when error logging rejects', async () => {
    mockLog.mockRejectedValue(new Error('logging backend down'));

    render(
      <GlobalErrorBoundary>
        <Flaky />
      </GlobalErrorBoundary>,
    );

    await waitFor(() => expect(mockLog).toHaveBeenCalled());
    expect(screen.getByText(FALLBACK_TITLE)).toBeInTheDocument();
  });

  it('invokes onError again for a new failure after a recovery', async () => {
    const onError = jest.fn();
    const { rerender } = render(
      <GlobalErrorBoundary onError={onError} resetKeys={[1]}>
        <Flaky />
      </GlobalErrorBoundary>,
    );
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));

    broken.value = false;
    rerender(
      <GlobalErrorBoundary onError={onError} resetKeys={[2]}>
        <Flaky />
      </GlobalErrorBoundary>,
    );
    expect(screen.getByText('recovered content')).toBeInTheDocument();

    broken.value = true;
    rerender(
      <GlobalErrorBoundary onError={onError} resetKeys={[3]}>
        <Flaky label="second" />
      </GlobalErrorBoundary>,
    );
    // resetKeys changed while healthy, so the child re-rendered, threw, and was caught again.
    expect(screen.getByText(FALLBACK_TITLE)).toBeInTheDocument();
    await waitFor(() => expect(onError.mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it('prefers a custom fallback and still recovers through resetKeys', () => {
    const { rerender } = render(
      <GlobalErrorBoundary fallback={<p>custom fallback</p>} resetKeys={['a']}>
        <Flaky />
      </GlobalErrorBoundary>,
    );
    expect(screen.getByText('custom fallback')).toBeInTheDocument();

    broken.value = false;
    rerender(
      <GlobalErrorBoundary fallback={<p>custom fallback</p>} resetKeys={['b']}>
        <Flaky />
      </GlobalErrorBoundary>,
    );
    expect(screen.getByText('recovered content')).toBeInTheDocument();
  });

  it('resetErrorBoundary clears the error state when called on the instance', () => {
    const ref = React.createRef<GlobalErrorBoundary>();
    render(
      <GlobalErrorBoundary ref={ref}>
        <Flaky />
      </GlobalErrorBoundary>,
    );
    expect(screen.getByText(FALLBACK_TITLE)).toBeInTheDocument();

    broken.value = false;
    act(() => ref.current?.resetErrorBoundary());

    expect(screen.getByText('recovered content')).toBeInTheDocument();
  });

  it('Go Home resets the boundary so children render again', () => {
    const ref = React.createRef<GlobalErrorBoundary>();
    render(
      <GlobalErrorBoundary ref={ref}>
        <Flaky />
      </GlobalErrorBoundary>,
    );
    expect(screen.getByText(FALLBACK_TITLE)).toBeInTheDocument();

    broken.value = false;
    act(() => ref.current?.handleGoHome());

    expect(screen.getByText('recovered content')).toBeInTheDocument();
  });
});

describe('app/error.tsx route-level recovery (regression)', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the error message and calls reset when Try again is clicked', () => {
    const reset = jest.fn();
    render(<GlobalError error={new Error('route exploded')} reset={reset} />);

    expect(screen.getByText('route exploded')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('falls back to a generic message when the error has none', () => {
    render(<GlobalError error={new Error('')} reset={jest.fn()} />);

    expect(screen.getByText(/unexpected error occurred/i)).toBeInTheDocument();
  });

  it('logs the error to the console once per distinct error', () => {
    const first = new Error('first');
    const { rerender } = render(<GlobalError error={first} reset={jest.fn()} />);
    rerender(<GlobalError error={first} reset={jest.fn()} />);
    rerender(<GlobalError error={new Error('second')} reset={jest.fn()} />);

    const logged = (console.error as jest.Mock).mock.calls.filter(
      (call) => call[0] === '[GlobalError]',
    );
    expect(logged).toHaveLength(2);
  });
});
