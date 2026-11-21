import type { Notification, NotificationPriority } from '@/context/NotificationContext';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Req 2.1 — duplicate suppression window (5 minutes). */
export const DEDUP_WINDOW_MS = 5 * 60 * 1000;

/** Req 3.1 — a burst is strictly more than this many events per window. */
export const BURST_THRESHOLD = 10;

/** Req 3.1 — sliding-window length used to count events (1 second). */
export const BURST_WINDOW_MS = 1000;

/** Req 3.1 — debounce quiet period before an accumulated batch flushes (2 seconds). */
export const QUIET_PERIOD_MS = 2000;

// ---------------------------------------------------------------------------
// Priority (Req 1.1)
// ---------------------------------------------------------------------------

export const PRIORITY_MAP: Record<Notification['type'], NotificationPriority> = {
  alert: 'high',
  delivery: 'medium',
  system: 'low',
};

/** Req 1.1 — derive priority from the existing type union. */
export function derivePriority(type: Notification['type']): NotificationPriority {
  return PRIORITY_MAP[type];
}

// ---------------------------------------------------------------------------
// Route relevance (Req 5.2)
// ---------------------------------------------------------------------------

/**
 * Req 5.2 — is the current route relevant to this notification type?
 * A relevant route suppresses the toast (the user can already see the info).
 */
export function isRelevantRoute(
  type: Notification['type'],
  pathname: string,
): boolean {
  switch (type) {
    case 'delivery':
      return pathname.startsWith('/deliveries');
    case 'system':
      return pathname.startsWith('/admin');
    case 'alert':
      return false;
  }
}

// ---------------------------------------------------------------------------
// Toast decision (Req 5.1, 6.1, 7.1)
// ---------------------------------------------------------------------------

/**
 * Req 5.1, 6.1, 7.1 — toast decision.
 * alert   -> true  (always, regardless of route)              [6.1]
 * delivery -> false on /deliveries, else true                 [5.1 / 7.1]
 * system  -> false on /admin, else true                       [5.1 / 7.1]
 */
export function shouldToast(
  type: Notification['type'],
  pathname: string,
): boolean {
  if (type === 'alert') return true;
  return !isRelevantRoute(type, pathname);
}

// ---------------------------------------------------------------------------
// Duplicate suppression (Req 2.1)
// ---------------------------------------------------------------------------

export interface DedupResult {
  /** Survivors (not duplicates). */
  unique: Notification[];
  /** Dropped duplicates. */
  suppressed: Notification[];
}

/**
 * Req 2.1 — return the matching existing unread notification within the
 * window, or null. A match requires `e.read === false`, exact
 * `title` + `message` + `type`, and `now - Date.parse(e.createdAt) <= window`.
 * Malformed `createdAt` (NaN) never matches.
 */
export function findDuplicate(
  incoming: Notification,
  existing: Notification[],
  now: number,
  windowMs?: number,
): Notification | null {
  const window = windowMs ?? DEDUP_WINDOW_MS;
  for (const e of existing) {
    if (e.read) continue;
    if (e.title !== incoming.title) continue;
    if (e.message !== incoming.message) continue;
    if (e.type !== incoming.type) continue;
    const t = Date.parse(e.createdAt);
    // Malformed createdAt must not match.
    if (Number.isNaN(t)) continue;
    if (now - t <= window) return e;
  }
  return null;
}

/**
 * Req 2.1 — split incoming into survivors and suppressed duplicates.
 * The exact-match rule is applied both against existing unread entries AND
 * within the batch itself (against earlier unique entries), so a burst of
 * identical events collapses to a single survivor before grouping.
 */
export function deduplicate(
  incoming: Notification[],
  existing: Notification[],
  now: number,
  windowMs?: number,
): DedupResult {
  const unique: Notification[] = [];
  const suppressed: Notification[] = [];

  for (const n of incoming) {
    // First against existing unread notifications...
    if (findDuplicate(n, existing, now, windowMs) !== null) {
      suppressed.push(n);
      continue;
    }
    // ...then against earlier survivors within this same batch.
    if (findDuplicate(n, unique, now, windowMs) !== null) {
      suppressed.push(n);
      continue;
    }
    unique.push(n);
  }

  return { unique, suppressed };
}

// ---------------------------------------------------------------------------
// Batch grouping (Req 4.1, 4.3)
// ---------------------------------------------------------------------------

/** Parsed createdAt, treating malformed (NaN) as the oldest possible time. */
function parsedCreatedAt(n: Notification): number {
  const t = Date.parse(n.createdAt);
  return Number.isNaN(t) ? -Infinity : t;
}

/** Pick the latest notification by createdAt (NaN treated as oldest). */
function latestByCreatedAt(list: Notification[]): Notification {
  let best = list[0];
  let bestTs = parsedCreatedAt(best);
  for (let i = 1; i < list.length; i++) {
    const ts = parsedCreatedAt(list[i]);
    if (ts > bestTs) {
      best = list[i];
      bestTs = ts;
    }
  }
  return best;
}

/**
 * Req 4.1, 4.3 — collapse a batch.
 * - Non-alert notifications sharing (type, title) collapse into one entry
 *   whose `count` equals the group size; the representative is the latest by
 *   createdAt and keeps its `id`, `message`, `read`, and `createdAt`.
 * - Every alert remains its own entry with `count = 1`.
 * - Every returned entry has `priority` (via derivePriority) and `count` set.
 * - Returned order: newest representative first (ready to prepend).
 */
export function groupBatch(notifications: Notification[]): Notification[] {
  if (notifications.length === 0) return [];

  // type -> title -> members (non-alert only)
  const groups = new Map<Notification['type'], Map<string, Notification[]>>();
  const alerts: Notification[] = [];

  for (const n of notifications) {
    if (n.type === 'alert') {
      alerts.push(n);
      continue;
    }
    let byTitle = groups.get(n.type);
    if (!byTitle) {
      byTitle = new Map<string, Notification[]>();
      groups.set(n.type, byTitle);
    }
    const list = byTitle.get(n.title);
    if (list) {
      list.push(n);
    } else {
      byTitle.set(n.title, [n]);
    }
  }

  const result: Notification[] = [];

  for (const byTitle of groups.values()) {
    for (const list of byTitle.values()) {
      const representative = latestByCreatedAt(list);
      result.push({
        ...representative,
        count: list.length,
        priority: derivePriority(representative.type),
      });
    }
  }

  for (const a of alerts) {
    result.push({
      ...a,
      count: 1,
      priority: derivePriority(a.type),
    });
  }

  // Newest representative first (ready to prepend).
  result.sort((a, b) => parsedCreatedAt(b) - parsedCreatedAt(a));

  return result;
}
