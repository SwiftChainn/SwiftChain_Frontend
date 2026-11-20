# Implementation Plan: Improve Notification Behavior

## Overview

Insert a client-side notification processing pipeline between the WebSocket `notification:new` event source and the display layer (`NotificationCenter` + `ToastService`). Implementation proceeds in four incremental layers that each build on the previous one and end fully wired:

1. **Foundation** — extend the `Notification` schema with two optional fields (`priority`, `count`) and add a backward-compatible batch `addNotifications` method to `NotificationContext`. Every later layer imports these types, so this goes first.
2. **Pure processor** — `lib/notificationProcessor.ts` derives priority, detects duplicates, decides route relevance and toasts, and groups batches. All logic is pure, so it is covered by six property tests plus unit tests.
3. **Stateful pipeline** — `lib/notificationPipeline.ts` does sliding-window burst detection and a `lodash.debounce` 2-second quiet-period batch flush.
4. **Wiring** — `useNotifications` routes WebSocket events through the pipeline using refs for current route/notifications; `NotificationCenter` renders the grouped count and priority; `ToastService.emit` gets a last-line dedup guard so back-to-back identical toasts never render.

The schema change is additive (optional fields only), `markAllAsRead` is untouched, and the existing hook/component tests are extended rather than replaced, so the change is non-regressing. `npm run type-check` (`tsc --noEmit`, `strict`) must pass at the end.

## Tasks

- [ ] 1. Foundation — extend Notification schema and add the context batch method
  - [ ] 1.1 Extend `context/NotificationContext.tsx` with priority, count, and `addNotifications`
    - Add `export type NotificationPriority = 'high' | 'medium' | 'low';`
    - Add optional `priority?: NotificationPriority;` and `count?: number;` to the `Notification` interface (optional keeps existing consumers/mocks/tests compiling under `strict`)
    - Add `addNotifications: (notifications: Notification[]) => void;` to `NotificationContextValue`; implement it with the functional updater `setNotificationsState((prev) => [...items, ...prev])` (atomic batch prepend)
    - Refactor `addNotification` to delegate: `addNotification = useCallback((n) => addNotifications([n]), [addNotifications])`
    - Add `addNotifications` to the provider value; leave `markAllAsRead` and `setNotifications` unchanged
    - _Requirements: 1.1, 4.2, 7.2_

- [ ] 2. Pure notification processor
  - [ ] 2.1 Implement `lib/notificationProcessor.ts`
    - Export constants: `DEDUP_WINDOW_MS` (5 min), `BURST_THRESHOLD` (10), `BURST_WINDOW_MS` (1000), `QUIET_PERIOD_MS` (2000)
    - Export `PRIORITY_MAP` and `derivePriority(type)`: `alert→high`, `delivery→medium`, `system→low`
    - Export `isRelevantRoute(type, pathname)`: `delivery`→`pathname.startsWith('/deliveries')`, `system`→`pathname.startsWith('/admin')`, `alert`→`false`
    - Export `shouldToast(type, pathname)`: `alert→true`, otherwise `!isRelevantRoute(type, pathname)`
    - Export `findDuplicate(incoming, existing, now, windowMs?)` returning the matching unread existing notification (exact `title`+`message`+`type`, `e.read === false`, `now - parse(e.createdAt) <= windowMs`) or `null`; malformed `createdAt` (NaN) must not match
    - Export `DedupResult` type and `deduplicate(incoming, existing, now, windowMs?)` splitting into `unique` / `suppressed` (apply exact-match rule both against existing unread and within the batch)
    - Export `groupBatch(notifications)` collapsing non-alert notifications sharing `(type, title)` into one entry whose `count` equals the group size and representative is the latest by `createdAt`; every alert stays its own entry with `count = 1`; set `priority` and `count` on every returned entry; return newest representative first
    - Import `Notification`, `NotificationPriority` from `@/context/NotificationContext`
    - _Requirements: 1.1, 2.1, 4.1, 4.3, 5.1, 5.2, 6.1, 7.1_

  - [ ]* 2.2 Write property test for priority derivation
    - **Property 1: Priority Derivation**
    - **Validates: Requirements 1.1**
    - In `lib/__tests__/notificationProcessor.test.ts`: assert `derivePriority` maps each type correctly and always returns a member of `{high, medium, low}`; run ≥100 iterations over random types with a seeded PRNG; tag `Feature: improve-notification-behavior, Property 1: Priority Derivation`

  - [ ]* 2.3 Write property test for duplicate suppression
    - **Property 2: Duplicate Suppression**
    - **Validates: Requirements 2.1**
    - Assert `deduplicate`/`findDuplicate` suppress exactly when an unread existing entry with matching `title`+`message`+`type` exists within `DEDUP_WINDOW_MS`; cover edge cases (read entries must not suppress, exactly-at-boundary, malformed `createdAt`); ≥100 seeded iterations

  - [ ]* 2.4 Write property test for burst detection predicate
    - **Property 3: Burst Detection Predicate**
    - **Validates: Requirements 3.1**
    - Assert the burst predicate is true iff the count of timestamps strictly within `(now - BURST_WINDOW_MS, now]` exceeds `BURST_THRESHOLD` (10); random timestamp multisets and `now` values; ≥100 seeded iterations

  - [ ]* 2.5 Write property test for batch grouping and alert separation
    - **Property 4: Batch Grouping and Alert Separation**
    - **Validates: Requirements 4.1, 4.3**
    - Assert per-`(type, title)` collapse, `count` correctness, every alert is its own entry with `count = 1`, and the sum of output `count` values equals the input batch size; ≥100 seeded iterations

  - [ ]* 2.6 Write property test for route relevance
    - **Property 5: Route Relevance**
    - **Validates: Requirements 5.2**
    - Assert `isRelevantRoute('delivery', r)` iff `r` starts with `/deliveries`; `isRelevantRoute('system', r)` iff `r` starts with `/admin`; `isRelevantRoute('alert', r)` always `false`; ≥100 seeded random route strings

  - [ ]* 2.7 Write property test for toast decision policy
    - **Property 6: Toast Decision Policy**
    - **Validates: Requirements 5.1, 6.1, 7.1**
    - Assert the full decision table: `alert`→true always; `delivery`→false on `/deliveries…` else true; `system`→false on `/admin…` else true; equivalently `shouldToast(t, r) = (t === 'alert') || !isRelevantRoute(t, r)`; ≥100 seeded `(type, route)` pairs

  - [ ]* 2.8 Write unit tests for notificationProcessor edge cases
    - Specific examples complementing the properties: empty batch returns `[]`; a single non-alert notification groups to `count = 1`; duplicate within a batch is removed before grouping (survivor groups to `count = 1`); malformed `createdAt` is treated as outside the dedup window (no suppression, no throw)
    - _Requirements: 2.1, 4.1, 4.3_

- [ ] 3. Stateful notification pipeline
  - [ ] 3.1 Implement `lib/notificationPipeline.ts`
    - `import debounce from 'lodash.debounce'` (matches existing `useAddressAutocomplete.ts` / `useFederationResolver.ts` convention)
    - Export `PipelineCallbacks` (`onImmediate`, `onBatch`) and `NotificationPipeline` class with `ingest`, `flushPending`, `destroy`
    - `ingest` maintains a sliding 1-second window of timestamps; when the window holds strictly more than `BURST_THRESHOLD` (10) timestamps, or a burst is already active, accumulate into `pending` and (re)arm a `lodash.debounce` flush of `QUIET_PERIOD_MS`; otherwise call `onImmediate`
    - `doFlush` clears `pending`/`inBurst` and calls `onBatch` with the accumulated batch; `flushPending` calls `doFlush` synchronously; `destroy` cancels the debounce and clears state
    - Import `Notification` from `@/context/NotificationContext`
    - _Requirements: 3.1_

  - [ ]* 3.2 Write integration tests for NotificationPipeline
    - In `lib/__tests__/notificationPipeline.test.ts` using Jest fake timers
    - 11 events within 1 second → exactly one `onBatch` after a 2-second quiet; `onImmediate` not called for accumulated events
    - 5 events within 1 second → five `onImmediate` calls; no `onBatch`
    - `destroy()` mid-burst → no late flush; debounce cancelled
    - _Requirements: 3.1_

- [ ] 4. Checkpoint — pure and pipeline layers verified
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Wire WebSocket events through the pipeline
  - [ ] 5.1 Update `hooks/useNotifications.ts` to route events through the pipeline
    - Add `import { usePathname } from 'next/navigation'`, `useRef`, and pull `addNotifications` from context
    - Add `pathnameRef` (kept in sync with `usePathname()`) and `notificationsRef` (kept in sync with `notifications`) so the async batch flush reads current values, not stale closures
    - Add `processNotifications(incoming)`: `deduplicate` against `notificationsRef.current` → if no survivors return → `groupBatch` survivors → `addNotifications(grouped)` → for each entry call `fireToast` when `shouldToast(entry.type, pathnameRef.current ?? '')`
    - `fireToast` wraps `toastService.error` (alert) / `toastService.info` (delivery, system off `/admin`) in `try/catch` so a toast failure never blocks center recording
    - In the socket effect, construct `new NotificationPipeline({ onImmediate: (n) => processNotifications([n]), onBatch: (batch) => processNotifications(batch) })`, feed events via `pipeline.ingest(n)`, and on cleanup call `pipeline.destroy()` in addition to existing socket teardown
    - Leave `markAllAsRead` unchanged (service call then `markAllAsReadInContext()` in `finally`)
    - _Requirements: 2.1, 3.1, 4.1, 4.3, 5.1, 5.2, 6.1, 7.1, 7.2_

  - [ ]* 5.2 Update `hooks/__tests__/useNotifications.test.ts`
    - Mock `next/navigation` `usePathname`; add `addNotifications` to the mock context value
    - Emit a notification → assert `addNotifications` called with the grouped entry; assert toast fired/suppressed per current route
    - Emit a duplicate of an existing unread within 5 min → assert `addNotifications` not called
    - Preserve the three existing `markAllAsRead` tests (service called, context called even on API failure, badge → 0)
    - _Requirements: 2.1, 5.1, 5.2, 6.1, 7.1, 7.2_

- [ ] 6. Render grouped notifications with count and priority
  - [ ] 6.1 Update `components/layout/NotificationCenter.tsx`
    - Pass `count` and `priority` into `NotificationItem` from the map
    - When `count > 1`, render a visible count indicator (e.g. a `×N` badge or pill with a `data-testid="notification-count"`) on the grouped entry
    - Render a priority indicator consistent with `priority` (high/medium/low), reusing the existing type color dot or a dedicated marker
    - Preserve all existing rendering when `count`/`priority` are absent (backward compatible)
    - _Requirements: 4.2, 4.3_

  - [ ]* 6.2 Update `components/layout/__tests__/NotificationCenter.test.tsx`
    - Render a grouped notification (`count > 1`) → assert a visible count indicator is present
    - Render a batch of same-title alerts → assert multiple distinct items (each `count = 1`)
    - Preserve all existing tests (bell, badge, empty state, mark-all-as-read, loading)
    - _Requirements: 4.2, 4.3_

- [ ] 7. Toast dedup guard
  - [ ] 7.1 Add deduplication to `ToastService.emit` in `lib/toast.ts`
    - Add a short-window guard so a toast whose `variant` + `message` matches one emitted within a brief window (e.g. 1000 ms) is suppressed before fan-out, as a last-line defense complementing pipeline dedup
    - Keep the public API (`success`, `error`, `info`, `loading`, `subscribe`) signatures unchanged so `ToastProvider` and its mock-based test are unaffected
    - _Requirements: 2.1_

  - [ ]* 7.2 Write unit tests for the toast dedup guard
    - In `lib/__tests__/toast.test.ts`: assert two identical `error` calls within the window emit to listeners only once; a different message or after the window emit again; non-duplicate variants are unaffected
    - _Requirements: 2.1_

- [ ] 8. Final checkpoint — ensure all tests pass and type-check passes
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP, though the property tests are the primary correctness guarantee for the pure processor.
- The implementation language is TypeScript (Next.js App Router) — already established; no language selection step was needed.
- Property tests run a minimum of 100 iterations. `fast-check` is not installed; use a seeded PRNG loop (fixed seed) for determinism and reproducibility without adding a dependency. Tag each property test `Feature: improve-notification-behavior, Property N: <text>`.
- The schema change is purely additive (`priority?`, `count?` optional fields), so existing call sites, mocks, and tests that construct a `Notification` without them continue to compile under `strict`.
- Grouping is batch-scoped (collapses within an incoming batch, not against existing center entries); dedup is exact (`title` + `message` + `type`) and runs before grouping; alerts are never grouped (`count = 1`) and each alert also produces its own toast.
- The design follows the formal requirements: a `system` notification toasts when the route is not `/admin` (this is what makes Req 5.2's `system → /admin` mapping meaningful). If review decides "system never toasts," amend Req 7.1 and short-circuit `shouldToast('system', _) → false` (Property 6's `system` clause would change accordingly).
- `markAllAsRead` is intentionally untouched (Req 7.2); the existing three hook tests for it are preserved.
- Each task references specific acceptance criteria for traceability; checkpoints enforce incremental validation.
- Run `npm run type-check` and `npm test` (jest) to validate. `lodash.debounce` is already a dependency.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "7.1"] },
    { "id": 1, "tasks": ["2.1", "3.1", "6.1", "7.2"] },
    { "id": 2, "tasks": ["2.2", "3.2", "5.1", "6.2"] },
    { "id": 3, "tasks": ["2.3", "5.2"] },
    { "id": 4, "tasks": ["2.4"] },
    { "id": 5, "tasks": ["2.5"] },
    { "id": 6, "tasks": ["2.6"] },
    { "id": 7, "tasks": ["2.7"] },
    { "id": 8, "tasks": ["2.8"] }
  ]
}
```
