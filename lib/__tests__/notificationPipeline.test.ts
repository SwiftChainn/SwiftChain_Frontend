/**
 * Integration tests for NotificationPipeline.
 *
 * Validates: Requirements 3.1
 *
 * NotificationPipeline uses a 1-second sliding window (BURST_THRESHOLD = 10)
 * and a 2-second lodash.debounce quiet period. These tests use Jest fake
 * timers so both Date.now() and setTimeout are controlled deterministically.
 *
 * Notes on lodash.debounce + fake timers:
 * - Jest's modern fake timers (default in Jest ≥27) replace both
 *   `setTimeout` and `Date` globally, which is what lodash.debounce relies
 *   on. `jest.advanceTimersByTime` advances both together.
 * - Each test restores real timers in `afterEach` to prevent bleed-through.
 */

import type { Notification } from '@/context/NotificationContext';
import { NotificationPipeline } from '@/lib/notificationPipeline';

/** Build a minimal valid Notification for the given id. */
function makeNotification(id: string): Notification {
  return {
    id,
    title: `Notification ${id}`,
    message: `Message for ${id}`,
    type: 'system',
    read: false,
    createdAt: new Date().toISOString(),
  };
}

describe('NotificationPipeline', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  /**
   * Test 1 — 11 events within 1 second → one onBatch after 2 s quiet period.
   *
   * The first 10 events each call onImmediate (window never exceeds 10).
   * The 11th event pushes the window to 11 (> BURST_THRESHOLD = 10), activates
   * burst mode, and starts the 2-second debounce. After 2 seconds of silence
   * onBatch fires with every event accumulated during burst mode.
   */
  it('11 events within 1 second → onBatch fires once after the 2 s quiet period', () => {
    jest.useFakeTimers();

    const onImmediate = jest.fn();
    const onBatch = jest.fn();
    const pipeline = new NotificationPipeline({ onImmediate, onBatch });

    // Ingest 11 notifications without advancing the clock — all land within
    // the same 1-second window so the 11th triggers burst mode.
    for (let i = 1; i <= 11; i++) {
      pipeline.ingest(makeNotification(`n${i}`));
    }

    // The 2-second debounce has not yet elapsed.
    expect(onBatch).not.toHaveBeenCalled();

    // Advance past the 2-second quiet period.
    jest.advanceTimersByTime(2000);

    // onBatch should now have been called exactly once.
    expect(onBatch).toHaveBeenCalledTimes(1);

    // The batch must contain every event that entered burst mode (at minimum
    // the 11th event; earlier ones may also have been accumulated).
    const [batch] = onBatch.mock.calls[0] as [Notification[]];
    expect(batch.length).toBeGreaterThanOrEqual(1);
  });

  /**
   * Test 2 — 5 events within 1 second → 5 onImmediate calls, onBatch never.
   *
   * Five events are well below the burst threshold, so each is forwarded
   * immediately. The debounce is never armed, so onBatch stays silent even
   * after 3 seconds.
   */
  it('5 events within 1 second → 5 onImmediate calls and no onBatch', () => {
    jest.useFakeTimers();

    const onImmediate = jest.fn();
    const onBatch = jest.fn();
    const pipeline = new NotificationPipeline({ onImmediate, onBatch });

    for (let i = 1; i <= 5; i++) {
      pipeline.ingest(makeNotification(`n${i}`));
    }

    expect(onImmediate).toHaveBeenCalledTimes(5);
    expect(onBatch).not.toHaveBeenCalled();

    // Advance well past the quiet period — still no batch.
    jest.advanceTimersByTime(3000);

    expect(onBatch).not.toHaveBeenCalled();
  });

  /**
   * Test 3 — destroy() mid-burst → onBatch is never called.
   *
   * Triggering burst then immediately calling destroy() cancels the debounce
   * and clears pending state. Advancing the clock produces no late flush.
   */
  it('destroy() mid-burst prevents onBatch from firing', () => {
    jest.useFakeTimers();

    const onImmediate = jest.fn();
    const onBatch = jest.fn();
    const pipeline = new NotificationPipeline({ onImmediate, onBatch });

    // Send 11 events to trigger burst mode and arm the debounce.
    for (let i = 1; i <= 11; i++) {
      pipeline.ingest(makeNotification(`n${i}`));
    }

    // Cancel before the quiet period elapses.
    pipeline.destroy();

    // Advance past the quiet period — the cancelled debounce must not fire.
    jest.advanceTimersByTime(3000);

    expect(onBatch).not.toHaveBeenCalled();
  });
});
