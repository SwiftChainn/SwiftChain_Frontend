# Design Document: Improve Notification Behavior

## Overview

This feature inserts a **notification processing pipeline** between the WebSocket event source and the display layer (`NotificationCenter` + `ToastService`). Today, every `notification:new` event flows directly into `addNotification`, producing duplicate spam, burst spam, no grouping, route-blind toasts, and no priority model.

The pipeline performs five transformations, in order, before anything reaches the display layer:

1. **Priority assignment** — derive `high | medium | low` from the existing `type` union.
2. **Duplicate suppression** — drop events identical (title + message + type) to an existing unread notification received within the last 5 minutes.
3. **Burst rate limiting** — when more than 10 events arrive within a 1-second window, accumulate them and flush as a single batch after a 2-second quiet period.
4. **Grouping** — within a batch, collapse non-alert notifications sharing `type + title` into one entry carrying a count; alerts stay separate.
5. **Context-aware, priority-based toast delivery** — decide whether each resulting entry toasts based on priority and the current route.

The design is layered to preserve the existing **Component → Hook → Service** architecture. All pure logic lives in `lib/`; the stateful burst/debounce orchestration lives in a small `lib/` class; the hook wires everything together; the context gains one backward-compatible batch method; the component renders the optional count.

## Architecture

```mermaid
flowchart TD
  WS[WebSocket notification:new] --> Pipeline[NotificationPipeline.ingest]
  Pipeline -->|"<=10 events/sec (normal)"| Imm[onImmediate: process [n]]
  Pipeline -->|">10 events/sec (burst)"| Accum[Accumulate pending]
  Accum -->|"2s quiet via lodash.debounce"| Batch[onBatch: process batch]
  Imm --> Process[processNotifications]
  Batch --> Process
  Process --> Dedup[deduplicate vs existing unread<br/>5-min window]
  Dedup -->|suppressed| Drop[(dropped: no toast, no center)]
  Dedup -->|survivors| Group[groupBatch<br/>alerts separate, others collapse by type+title]
  Group --> Ctx[NotificationContext.addNotifications]
  Group --> ToastDec[shouldToast type vs route]
  Ctx --> Badge[Unread badge +1 per entry]
  ToastDec -->|true| Toast[ToastService.error/info]
  ToastDec -->|false| NoToast[(center entry only)]
  Path[usePathname] -.current route.-> ToastDec
  CtxRef[notificationsRef] -.existing unread.-> Dedup
```

The pipeline runs entirely client-side. The backend contract (`notificationService`, the `Notification` shape) is unchanged. The only schema change is two **optional** fields on `Notification`, so existing consumers and tests that do not set them continue to type-check.

## Data Models

### Notification (extended, backward-compatible)

Two optional fields are added. Because they are optional, every existing call site, mock, and test that constructs a `Notification` without them continues to compile under `strict` mode.

```typescript
// context/NotificationContext.tsx
export type NotificationPriority = 'high' | 'medium' | 'low';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'delivery' | 'system' | 'alert';
  read: boolean;
  createdAt: string;
  /** Derived by the pipeline from `type`. Optional for backward compatibility. */
  priority?: NotificationPriority;
  /** Number of collapsed notifications this entry represents. Defaults to 1. */
  count?: number;
}
```

The `type` union is **unchanged** — priority is derived, never stored as a new source type. This satisfies the "no schema-breaking change" constraint.

### Constants

```typescript
// lib/notificationProcessor.ts
export const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
export const BURST_THRESHOLD = 10;            // strictly more than 10
export const BURST_WINDOW_MS = 1000;           // 1-second sliding window
export const QUIET_PERIOD_MS = 2000;          // 2-second debounce quiet period
```

### Pipeline support types

```typescript
// lib/notificationProcessor.ts
export interface DedupResult {
  unique: Notification[];     // survivors (not duplicates)
  suppressed: Notification[];  // dropped duplicates
}
```

## Components and Interfaces

### New files

| File | Purpose |
|------|---------|
| `lib/notificationProcessor.ts` | Pure functions: priority derivation, route relevance, toast decision, duplicate detection, batch grouping. Pure → unit + property tested. |
| `lib/notificationPipeline.ts` | Stateful `NotificationPipeline` class: sliding-window burst detection + lodash.debounce accumulation/flush. |
| `lib/__tests__/notificationProcessor.test.ts` | Property-based + unit tests for the pure processor. |
| `lib/__tests__/notificationPipeline.test.ts` | Integration tests (fake timers) for burst batching. |

### Modified files

| File | Change |
|------|--------|
| `context/NotificationContext.tsx` | Add optional `priority` / `count` to `Notification`; add `NotificationPriority` type; add batch `addNotifications(items)`. `addNotification` delegates to it. `markAllAsRead` unchanged. |
| `hooks/useNotifications.ts` | Add `usePathname`; add `notificationsRef` + `pathnameRef`; instantiate `NotificationPipeline`; route WS events through `ingest`; add `processNotifications` (dedup → group → add → toast). `markAllAsRead` unchanged. |
| `components/layout/NotificationCenter.tsx` | `NotificationItem` renders a visible count when `count > 1`; map passes `count`/`priority`. Existing rendering preserved when fields absent. |
| `hooks/__tests__/useNotifications.test.ts` | Mock `next/navigation` `usePathname`; add `addNotifications` to mock context; add tests for pipeline routing, dedup, grouping, toast decisions. Existing `markAllAsRead` tests preserved. |
| `components/layout/__tests__/NotificationCenter.test.tsx` | Add a test asserting a grouped entry renders its count. Existing tests preserved. |

### Pure processor interfaces — `lib/notificationProcessor.ts`

```typescript
import type { Notification, NotificationPriority } from '@/context/NotificationContext';

export const PRIORITY_MAP: Record<Notification['type'], NotificationPriority> = {
  alert: 'high',
  delivery: 'medium',
  system: 'low',
};

/** Req 1.1 — derive priority from the existing type union. */
export function derivePriority(type: Notification['type']): NotificationPriority;

/** Req 5.2 — is the current route relevant to this notification type? */
export function isRelevantRoute(type: Notification['type'], pathname: string): boolean;

/**
 * Req 5.1, 6.1, 7.1 — toast decision.
 * alert  -> true  (always, regardless of route)              [6.1]
 * delivery -> false on /deliveries, else true                [5.1 / 7.1]
 * system  -> false on /admin, else true                      [5.1 / 7.1]
 */
export function shouldToast(type: Notification['type'], pathname: string): boolean;

/** Req 2.1 — the matching existing unread notification within the window, or null. */
export function findDuplicate(
  incoming: Notification,
  existing: Notification[],
  now: number,
  windowMs?: number,
): Notification | null;

/** Req 2.1 — split incoming into survivors and suppressed duplicates. */
export function deduplicate(
  incoming: Notification[],
  existing: Notification[],
  now: number,
  windowMs?: number,
): DedupResult;

/**
 * Req 4.1, 4.3 — collapse a batch.
 * - Non-alert notifications sharing (type, title) collapse into one entry
 *   whose `count` equals the group size; representative = latest by createdAt.
 * - Every alert remains its own entry with count = 1.
 * - Every returned entry has `priority` and `count` set.
 * - Returned order: newest representative first (ready to prepend).
 */
export function groupBatch(notifications: Notification[]): Notification[];
```

### Stateful pipeline interface — `lib/notificationPipeline.ts`

```typescript
import debounce from 'lodash.debounce';
import type { Notification } from '@/context/NotificationContext';

export interface PipelineCallbacks {
  /** Called for an event processed immediately (no burst active). */
  onImmediate: (notification: Notification) => void;
  /** Called once after a 2-second quiet period with the whole accumulated batch. */
  onBatch: (batch: Notification[]) => void;
}

export class NotificationPipeline {
  constructor(callbacks: PipelineCallbacks);

  /** Feed a WebSocket event. Decides immediate processing vs. accumulation. */
  ingest(notification: Notification): void;

  /** Synchronously flush any pending batch (used by tests). */
  flushPending(): void;

  /** Cancel any pending debounce and clear state. Call on unmount. */
  destroy(): void;
}
```

### Context additions — `context/NotificationContext.tsx`

```typescript
interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  addNotifications: (notifications: Notification[]) => void; // NEW — batch prepend
  markAllAsRead: () => void;                                  // unchanged
}
```

`addNotifications` prepends the batch atomically via the functional updater:

```typescript
const addNotifications = useCallback((items: Notification[]) => {
  setNotificationsState((prev) => [...items, ...prev]);
}, []);

const addNotification = useCallback(
  (n: Notification) => addNotifications([n]),
  [addNotifications],
);
```

## Processing Pipeline Flow

`useNotifications` owns the orchestration. Refs hold the latest `notifications` (for dedup) and `pathname` (for toast decisions) so the asynchronous batch flush always reads current values rather than stale closure captures.

```typescript
// hooks/useNotifications.ts (sketch)
const pathname = usePathname();
const pathnameRef = useRef(pathname);
pathnameRef.current = pathname;

const { notifications, setNotifications, addNotifications,
        markAllAsRead: markAllAsReadInContext } = useNotificationContext();
const notificationsRef = useRef(notifications);
notificationsRef.current = notifications;

const processNotifications = useCallback((incoming: Notification[]) => {
  if (incoming.length === 0) return;
  const now = Date.now();
  const { unique } = deduplicate(incoming, notificationsRef.current, now);
  if (unique.length === 0) return;          // all duplicates suppressed
  const grouped = groupBatch(unique);       // sets priority + count; alerts separate
  addNotifications(grouped);                 // record in center, badge increments
  const route = pathnameRef.current ?? '';
  for (const entry of grouped) {
    if (shouldToast(entry.type, route)) fireToast(entry);
  }
}, [addNotifications]);

function fireToast(n: Notification) {
  try {
    if (n.type === 'alert') toastService.error(n.title, n.message);
    else toastService.info(n.title, n.message);   // delivery (system off /admin)
  } catch {
    /* toast is best-effort UI; never break notification recording */
  }
}

useEffect(() => {
  if (!SOCKET_URL) return;
  const pipeline = new NotificationPipeline({
    onImmediate: (n) => processNotifications([n]),
    onBatch: (batch) => processNotifications(batch),
  });
  const socket = io(SOCKET_URL, { transports: ['websocket'] });
  socket.on('notification:new', (n: Notification) => pipeline.ingest(n));
  return () => {
    socket.off('notification:new');
    socket.disconnect();
    pipeline.destroy();
  };
}, [processNotifications]);
```

`markAllAsRead` is untouched: it still calls `notificationService.markAllAsRead()` then `markAllAsReadInContext()` in a `finally`, preserving the optimistic behavior the existing tests assert (Req 7.2).

### NotificationPipeline internal logic

```typescript
class NotificationPipeline {
  private window: number[] = [];
  private pending: Notification[] = [];
  private inBurst = false;
  private flush = debounce(() => this.doFlush(), QUIET_PERIOD_MS);

  constructor(private cb: PipelineCallbacks) {}

  ingest(n: Notification): void {
    const now = Date.now();
    this.window = this.window.filter((t) => now - t <= BURST_WINDOW_MS);
    this.window.push(now);
    const bursting = this.window.length > BURST_THRESHOLD;

    if (bursting || this.inBurst) {
      this.inBurst = true;
      this.pending.push(n);
      this.flush();           // (re)arm the 2-second quiet timer
    } else {
      this.cb.onImmediate(n); // <=10/sec — process at once
    }
  }

  private doFlush(): void {
    const batch = this.pending;
    this.pending = [];
    this.inBurst = false;
    if (batch.length > 0) this.cb.onBatch(batch);
  }

  flushPending(): void { this.doFlush(); }
  destroy(): void { this.flush.cancel(); this.pending = []; this.inBurst = false; }
}
```

Key behaviors:
- A burst is detected when the sliding 1-second window holds **strictly more than 10** timestamps. The 11th event (and onward) accumulates.
- `this.flush()` (lodash.debounce, 2000ms) resets its timer on every accumulated event, so the batch flushes exactly when 2 seconds pass with no new event — the "2-second quiet period."
- On flush, `inBurst` resets and the whole accumulated batch is handed to `processNotifications`, which dedups against current state, groups, records, and toasts.
- If events stop mid-burst, the small pending batch still flushes after the quiet period.

## Toast Decision Logic

`shouldToast(type, route)` is a single pure function encoding Reqs 5.1, 6.1, and 7.1:

```typescript
export function shouldToast(type: Notification['type'], pathname: string): boolean {
  if (type === 'alert') return true;               // 6.1 — always
  return !isRelevantRoute(type, pathname);         // 5.1 (relevant -> no toast) / 7.1 (else -> toast)
}

export function isRelevantRoute(type: Notification['type'], pathname: string): boolean {
  switch (type) {
    case 'delivery': return pathname.startsWith('/deliveries'); // 5.2
    case 'system':   return pathname.startsWith('/admin');        // 5.2
    case 'alert':    return false;                                 // no relevant route
  }
}
```

Decision table (formal spec interpretation):

| type | priority | route relevant? | toast? | requirement |
|------|----------|-----------------|--------|-------------|
| alert | high | never | **yes** | 6.1 |
| delivery | medium | yes (`/deliveries`) | no | 5.1 |
| delivery | medium | no | **yes** | 7.1 |
| system | low | yes (`/admin`) | no | 5.1 |
| system | low | no | **yes** | 7.1 |

> **Open discrepancy — needs review confirmation.** The feature brief summarized Req 6 as "low (system) never toasts (center only)." The formal requirements (Req 5.2 defines `system → /admin` relevance; Req 7.1 toasts when the route is not relevant) are self-consistent only if a system notification **does** toast when the user is off `/admin`. This design follows the **formal** requirements, because they are internally consistent and make Req 5.2's `system → /admin` mapping meaningful. If the true intent is "system never toasts," Req 7.1 should be amended to exclude low-priority notifications, and `shouldToast` would short-circuit `system → false`. See Design Decisions & Assumptions.

## Error Handling

- **WebSocket disconnect / unmount.** Cleanup cancels the pending debounce and clears `pending`, so no batch flushes after unmount (`pipeline.destroy()`). Existing socket teardown is preserved.
- **Toast failure.** `fireToast` is wrapped in `try/catch`. A toast error never prevents the notification from being recorded in the center (recording happens before toasts and is the important side effect).
- **Malformed `createdAt`.** In dedup, an unparseable `createdAt` yields `NaN`, which fails the `now - t <= windowMs` check, so such entries are treated as outside the dedup window (never suppress). No exception escapes.
- **Empty / missing route.** `pathnameRef.current ?? ''` defaults to the empty string; `''` starts with no prefix, so nothing is considered relevant — the safe (toast) default for delivery/system, and alert always toasts anyway.
- **Duplicate detection robustness.** Dedup compares only against **unread** existing notifications (Req 2.1), so marking all as read re-arms suppression for genuinely new identical events.
- **Type safety.** All new/modified code targets `strict` mode; optional fields default to `undefined` and are guarded (`count && count > 1`), so `npm run type-check` passes.

## Design Decisions & Assumptions

1. **Priority is derived, not a new source type.** The `type` union is untouched; `priority` is an optional derived field. This satisfies the "no schema-breaking change" constraint and keeps the backend contract stable.

2. **Grouping is batch-scoped.** Req 4.1 says collapse "WHILE processing a Batch." Grouping collapses notifications **within an incoming batch**, not against entries already in the center. A new batch may therefore create a new grouped entry alongside an older similar one. This matches the literal requirement and avoids mutating existing entries.

3. **Dedup is exact and applies both against existing and within a batch.** Req 2.1 specifies exact (title + message + type) match against existing unread within 5 minutes. The same exact-match rule is applied **within a batch** before grouping, so a burst of identical events collapses to one (via dedup) rather than one grouped-with-count (a single survivor groups to count 1). This prevents duplicate pile-up inside bursts.

4. **Grouping uses `type + title` (not message).** Two notifications with the same type and title but different messages collapse into one grouped entry; the representative is the latest by `createdAt`, and its message is shown. Dedup (exact, including message) runs first, so true duplicates are removed before this coarser grouping.

5. **Alerts are never grouped.** Every alert becomes its own entry with `count = 1` (Req 4.3), so each alert also produces its own toast (Req 6.1).

6. **Unread badge counts entries, not underlying events.** `unreadCount = notifications.filter(n => !n.read).length` is unchanged. A grouped entry (count = N) contributes **1** to the badge, matching the single visible row it renders. This is the least disruptive choice and keeps the badge consistent with the displayed list. (Alternative — summing `count` — is noted but rejected to avoid a badge that exceeds the visible row count.)

7. **Route is read at processing time, not ingestion time.** For a debounced batch, the user may navigate during the 2-second quiet period. Toast decisions use `pathnameRef.current` at flush time, so toasts reflect the page the user is actually on when the batch is displayed.

8. **Toast variant mapping.** `alert → toastService.error` (red, critical); `delivery → toastService.info`; `system → toastService.info` (only fires off `/admin` per the formal spec). `message` is passed as the toast description.

9. **Open discrepancy — low-priority system toasts.** The design follows the formal requirements (system toasts when off `/admin`). The feature brief said "low (system) never toasts." This is flagged for review: confirm the intended behavior. If "never," amend Req 7.1 to exclude low-priority notifications and short-circuit `shouldToast('system', _) → false`.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Priority Derivation

*For any* notification type `t` in `{ delivery, system, alert }`, `derivePriority(t)` equals `high` when `t = alert`, `medium` when `t = delivery`, and `low` when `t = system`, and the result is always a member of `{ high, medium, low }`.

**Validates: Requirements 1.1**

### Property 2: Duplicate Suppression

*For any* incoming notification `n`, set of existing notifications `E`, and timestamp `now`, `n` is classified as a duplicate (suppressed) if and only if there exists some `e` in `E` with `e.read = false`, `e.title = n.title`, `e.message = n.message`, `e.type = n.type`, and `now - parse(e.createdAt) <= DEDUP_WINDOW_MS`; otherwise `n` is kept.

**Validates: Requirements 2.1**

### Property 3: Burst Detection Predicate

*For any* multiset of event timestamps `T` and reference time `now`, the burst predicate is true if and only if the count of timestamps in `T` strictly within the window `(now - BURST_WINDOW_MS, now]` is greater than `BURST_THRESHOLD` (10). An event is processed immediately when no burst is active, and accumulated into a single batch flushed after a `QUIET_PERIOD_MS` (2-second) quiet period when a burst is active.

**Validates: Requirements 3.1**

### Property 4: Batch Grouping and Alert Separation

*For any* batch of notifications `B` passed to `groupBatch`, every non-alert notification sharing a `(type, title)` pair with at least one other notification in `B` collapses into a single entry whose `count` equals the number of `B`'s notifications sharing that `(type, title)`; every alert in `B` appears as its own distinct entry with `count = 1`; and the sum of all output entries' `count` values equals `|B|`.

**Validates: Requirements 4.1, 4.3**

### Property 5: Route Relevance

*For any* route string `r`, `isRelevantRoute('delivery', r)` is true if and only if `r` starts with `/deliveries`; `isRelevantRoute('system', r)` is true if and only if `r` starts with `/admin`; and `isRelevantRoute('alert', r)` is always false.

**Validates: Requirements 5.2**

### Property 6: Toast Decision Policy

*For any* notification type `t` and route string `r`, `shouldToast(t, r)` returns `true` when `t = 'alert'` (regardless of `r`); returns `false` when `t = 'delivery'` and `r` starts with `/deliveries`, and `true` otherwise; and returns `false` when `t = 'system'` and `r` starts with `/admin`, and `true` otherwise. Equivalently, `shouldToast(t, r) = (t = 'alert') OR NOT isRelevantRoute(t, r)`.

**Validates: Requirements 5.1, 6.1, 7.1**

> Note: this property encodes the formal-requirements interpretation (a `system` notification toasts when the route is not `/admin`). If the review decision in the Toast Decision Logic and Design Decisions sections changes to "system never toasts," this property's `system` clause becomes `shouldToast('system', r) = false` for all `r`, and Req 7.1 should be amended accordingly.

## Testing Strategy

**Dual testing approach.** Property-based tests validate universal behavior of the pure processor; unit/integration tests validate specific examples, edge cases, side effects, and component rendering.

### Property-based tests (`lib/__tests__/notificationProcessor.test.ts`)

Each property test runs a minimum of 100 iterations and is tagged `Feature: improve-notification-behavior, Property N: <text>`.

- **Property 1** — random `type` values → assert mapped priority and validity. (Req 1.1)
- **Property 2** — random existing sets (mixed read/unread, varied `createdAt` straddling the 5-min boundary, malformed `createdAt`) and random incoming notifications → assert suppression exactly matches the existence rule. Edge cases: read existing must not suppress; exactly-at-boundary; malformed date. (Req 2.1)
- **Property 3** — random timestamp multisets and `now` values → assert the burst predicate matches the sliding-window count rule. (Req 3.1)
- **Property 4** — random batches (mixed types/titles, varying alert counts) → assert per-`(type,title)` collapse, `count` correctness, alert separation, and total-count preservation. (Req 4.1, 4.3)
- **Property 5** — random route strings → assert the three prefix rules exactly. (Req 5.2)
- **Property 6** — random `(type, route)` pairs → assert the full decision table. (Req 5.1, 6.1, 7.1)

### Unit / integration tests

- `lib/__tests__/notificationPipeline.test.ts` (fake timers):
  - 11 events within 1 second → exactly one `onBatch` after a 2-second quiet; `onImmediate` not called for the accumulated events.
  - 5 events within 1 second → five `onImmediate` calls; no `onBatch`.
  - Unmount/`destroy()` → no late flush; debounce cancelled.
- `hooks/__tests__/useNotifications.test.ts` (updated):
  - Mock `next/navigation` `usePathname`; add `addNotifications` to the mock context.
  - Emit a notification → assert `addNotifications` called with the grouped entry; assert toast fired/suppressed per route.
  - Emit a duplicate of an existing unread within 5 min → assert `addNotifications` not called.
  - Preserve the three existing `markAllAsRead` tests (service called, context called even on API failure, badge → 0). (Req 7.2)
- `components/layout/__tests__/NotificationCenter.test.tsx` (updated):
  - Render a grouped notification (`count > 1`) → assert a visible count indicator. (Req 4.2)
  - Render a batch of same-title alerts → assert multiple distinct items. (Req 4.3)
  - Preserve all existing tests (bell, badge, empty state, mark-all-as-read, loading).

### Type safety gate

`npm run type-check` (`tsc --noEmit`, `strict`) must pass with no errors. The optional `priority`/`count` fields and the new `addNotifications` context method are the only interface changes, and both are additive, so existing consumers compile unchanged.
