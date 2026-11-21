import debounce from 'lodash.debounce';
import type { Notification } from '@/context/NotificationContext';

/**
 * Constants governing burst detection and the quiet-period flush.
 *
 * The canonical home for these is `lib/notificationProcessor.ts`; they are
 * re-declared here so this module compiles standalone before that module
 * lands. Values are kept identical to avoid any behavioural divergence.
 */
const BURST_THRESHOLD = 10; // strictly more than 10 events in the window
const BURST_WINDOW_MS = 1000; // 1-second sliding window
const QUIET_PERIOD_MS = 2000; // 2-second debounce quiet period

export interface PipelineCallbacks {
  /** Called for an event processed immediately (no burst active). */
  onImmediate: (notification: Notification) => void;
  /** Called once after a 2-second quiet period with the whole accumulated batch. */
  onBatch: (batch: Notification[]) => void;
}

/**
 * Stateful notification pipeline.
 *
 * Feeds WebSocket `notification:new` events through a sliding 1-second window.
 * While the window holds strictly more than `BURST_THRESHOLD` (10) timestamps —
 * or a burst is already active — incoming events accumulate into a pending
 * batch whose flush is (re)armed via a `lodash.debounce` `QUIET_PERIOD_MS`
 * (2-second) quiet timer. Once 2 seconds pass with no new event, the whole
 * batch is handed to `onBatch`. Otherwise each event is passed straight to
 * `onImmediate`.
 *
 * Validates: Requirements 3.1
 */
export class NotificationPipeline {
  private window: number[] = [];
  private pending: Notification[] = [];
  private inBurst = false;
  private flush = debounce(() => this.doFlush(), QUIET_PERIOD_MS);

  constructor(private readonly cb: PipelineCallbacks) {}

  /** Feed a WebSocket event. Decides immediate processing vs. accumulation. */
  ingest(notification: Notification): void {
    const now = Date.now();
    // Keep only timestamps within the 1-second sliding window.
    this.window = this.window.filter((t) => now - t <= BURST_WINDOW_MS);
    this.window.push(now);

    const bursting = this.window.length > BURST_THRESHOLD;

    if (bursting || this.inBurst) {
      this.inBurst = true;
      this.pending.push(notification);
      // (Re)arm the 2-second quiet timer; debounce resets on every call.
      this.flush();
    } else {
      // <=10 events/sec — process at once.
      this.cb.onImmediate(notification);
    }
  }

  /** Synchronously flush any pending batch (used by tests). */
  flushPending(): void {
    this.doFlush();
  }

  /** Cancel any pending debounce and clear state. Call on unmount. */
  destroy(): void {
    this.flush.cancel();
    this.pending = [];
    this.inBurst = false;
  }

  private doFlush(): void {
    const batch = this.pending;
    this.pending = [];
    this.inBurst = false;
    if (batch.length > 0) {
      this.cb.onBatch(batch);
    }
  }
}
