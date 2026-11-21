/**
 * Unit tests for the ToastService dedup guard.
 *
 * Validates: Requirements 2.1
 *
 * The dedup guard in `ToastService.emit` suppresses a toast whose `variant` +
 * `message` matches one emitted within a brief window (1000 ms) before fan-out
 * to listeners. These tests exercise the guard through the public API
 * (`success`, `error`) and assert listener call counts.
 *
 * Test isolation notes:
 * - `toastService` is a singleton, so its `lastEmitted` dedup state persists
 *   across tests. Each test uses a unique message so the message-mismatch
 *   short-circuits any cross-test dedup regardless of timestamps.
 * - The listener is unsubscribed in `afterEach` to prevent accumulation in
 *   the singleton's listener Set.
 * - Fake timers are used throughout so `Date.now()` is frozen between
 *   synchronous calls (keeping two identical calls within the window) and
 *   can be advanced deterministically for the window-elapsed case.
 */

import { toastService } from '@/lib/toast';

describe('ToastService dedup guard', () => {
  let listener: jest.Mock;
  let unsubscribe: () => void;

  beforeEach(() => {
    jest.useFakeTimers();
    listener = jest.fn();
    unsubscribe = toastService.subscribe(listener);
  });

  afterEach(() => {
    unsubscribe();
    jest.useRealTimers();
  });

  it('suppresses a second identical error toast emitted within the dedup window', () => {
    toastService.error('Network failure');
    toastService.error('Network failure');

    // Only the first call reaches listeners; the second is suppressed.
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({ variant: 'error', message: 'Network failure' }),
    );
  });

  it('emits a toast with a different message even within the window', () => {
    toastService.error('Connection lost');
    toastService.error('Server timeout');

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('emits an identical toast again once the dedup window has elapsed', () => {
    toastService.error('Window elapsed toast');
    expect(listener).toHaveBeenCalledTimes(1);

    // Advance past the 1000 ms dedup window (guard uses strict `<`).
    jest.advanceTimersByTime(1001);

    toastService.error('Window elapsed toast');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('does not suppress toasts that share a message but differ in variant', () => {
    toastService.error('Shared message text');
    toastService.success('Shared message text');

    // Dedup checks both variant and message, so a variant change defeats it.
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('emits a success toast and an error toast with different messages', () => {
    toastService.success('Profile saved');
    toastService.error('Save failed');

    expect(listener).toHaveBeenCalledTimes(2);
  });
});
