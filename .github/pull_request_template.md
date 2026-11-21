## Summary

Closes #973

Improves notification behavior so the system is more contextual and less noisy. Inserts a client-side processing pipeline between the WebSocket event source and the display layer, addressing five noise problems in the existing implementation.

---

## Problem

The previous notification system had no deduplication, no rate limiting, no grouping, no priority model, and no awareness of the user's current route — every incoming WebSocket event went straight to the UI unchanged, causing duplicate spam, burst spam, and irrelevant toast interruptions.

---

## Solution

A two-layer pipeline (`lib/notificationProcessor.ts` + `lib/notificationPipeline.ts`) now processes every `notification:new` event before it reaches the display layer.

### Five noise problems resolved

| Problem | Fix |
|---|---|
| No deduplication | Exact `title+message+type` match against existing unread entries within a 5-minute window — duplicates are dropped |
| No rate limiting | Sliding 1-second window burst detector: >10 events/sec accumulate and flush as one batch after a 2-second quiet period |
| No grouping | Same `type+title` notifications within a batch collapse into one entry with a `×N` count indicator |
| No priority levels | Priority derived from `type` union — `alert=high`, `delivery=medium`, `system=low` |
| No context awareness | `usePathname` checks the current route — toast suppressed when user is already on the relevant page; center entry still recorded |

### Toast decision table

| Type | Priority | On relevant route | Toast? |
|---|---|---|---|
| `alert` | high | never relevant | always yes |
| `delivery` | medium | `/deliveries` | no (center only) |
| `delivery` | medium | elsewhere | yes |
| `system` | low | `/admin` | no (center only) |
| `system` | low | elsewhere | yes |

---

## Files Changed

| File | Change |
|---|---|
| `lib/notificationProcessor.ts` | NEW — pure functions: priority derivation, route relevance, toast decision, dedup, grouping |
| `lib/notificationPipeline.ts` | NEW — stateful burst detection + `lodash.debounce` 2s batch flush |
| `context/NotificationContext.tsx` | Added `NotificationPriority` type, optional `priority`/`count` fields, `addNotifications` batch method |
| `hooks/useNotifications.ts` | Wired WebSocket events through pipeline; added `pathnameRef` and `notificationsRef` to avoid stale closures |
| `components/layout/NotificationCenter.tsx` | Renders `×N` count badge and priority indicator on grouped entries |
| `lib/toast.ts` | Added 1-second dedup guard to `ToastService.emit` as a last-line defence |

---

## Tests

**98 tests passing across 6 suites. TypeScript strict mode clean.**

| Suite | Tests |
|---|---|
| `lib/__tests__/notificationProcessor.test.ts` | 77 (property-based + unit, 6 correctness properties, 100 iterations each) |
| `lib/__tests__/notificationPipeline.test.ts` | 5 (integration, Jest fake timers) |
| `lib/__tests__/toast.test.ts` | 5 (unit, dedup guard) |
| `hooks/__tests__/useNotifications.test.ts` | 6 (4 existing preserved + 2 new) |
| `components/layout/__tests__/NotificationCenter.test.tsx` | 11 (9 existing preserved + 2 new) |
| `components/providers/__tests__/ToastProvider.test.tsx` | existing — still passing |

---

## Non-Regression Guarantees

- `Notification` type union (`delivery | system | alert`) is unchanged — only optional fields added
- `markAllAsRead` behavior preserved exactly
- All existing tests extended rather than replaced
- Schema change is additive (`priority?`, `count?`) — existing consumers compile unchanged under strict mode

---

## Acceptance Criteria

- [x] Issue fully resolved without introducing regressions
- [x] `npm run type-check` passes strictly
- [x] Relevant unit tests added and updated
- [x] PR description includes approach summary and closes the issue
