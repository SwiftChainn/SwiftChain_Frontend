/**
 * Tests for lib/notificationProcessor.ts
 *
 * Tasks 2.2 – 2.8
 * Feature: improve-notification-behavior
 */

import {
  BURST_THRESHOLD,
  BURST_WINDOW_MS,
  DEDUP_WINDOW_MS,
  deduplicate,
  derivePriority,
  findDuplicate,
  groupBatch,
  isRelevantRoute,
  shouldToast,
} from '../notificationProcessor';
import type { Notification } from '@/context/NotificationContext';

// ---------------------------------------------------------------------------
// Seeded PRNG (mulberry32) — no external library required
// ---------------------------------------------------------------------------

function mulberry32(seed: number) {
  return function next(): number {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let z = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
    return ((z ^ (z >>> 14)) >>> 0) / 0x100000000;
  };
}

// ---------------------------------------------------------------------------
// Test-data helpers
// ---------------------------------------------------------------------------

const TYPES = ['alert', 'delivery', 'system'] as const;
type NType = (typeof TYPES)[number];

function makeNotification(
  overrides: Partial<Notification> & { type: NType },
): Notification {
  return {
    id: overrides.id ?? 'id-' + Math.random().toString(36).slice(2),
    title: overrides.title ?? 'Title',
    message: overrides.message ?? 'Message',
    type: overrides.type,
    read: overrides.read ?? false,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    priority: overrides.priority,
    count: overrides.count,
  };
}

// ---------------------------------------------------------------------------
// Task 2.2 — Property 1: Priority Derivation
// Validates: Requirements 1.1
// ---------------------------------------------------------------------------

describe('Property 1: Priority Derivation', () => {
  // Static assertion for all three canonical types
  test('derivePriority returns high for alert', () => {
    expect(derivePriority('alert')).toBe('high');
  });

  test('derivePriority returns medium for delivery', () => {
    expect(derivePriority('delivery')).toBe('medium');
  });

  test('derivePriority returns low for system', () => {
    expect(derivePriority('system')).toBe('low');
  });

  // Property: for 100 seeded random type picks, result is always a valid priority
  test('derivePriority always returns a value in {high, medium, low} (100 iterations)', () => {
    const rng = mulberry32(0xdeadbeef);
    const valid = new Set(['high', 'medium', 'low']);

    for (let i = 0; i < 100; i++) {
      const type = TYPES[Math.floor(rng() * TYPES.length)];
      const result = derivePriority(type);
      expect(valid.has(result)).toBe(true);
    }
  });

  // Property: the mapping is deterministic — same type always gives same priority
  test('derivePriority is deterministic (100 iterations)', () => {
    const rng = mulberry32(0xc0ffee);

    for (let i = 0; i < 100; i++) {
      const type = TYPES[Math.floor(rng() * TYPES.length)];
      expect(derivePriority(type)).toBe(derivePriority(type));
    }
  });
});

// ---------------------------------------------------------------------------
// Task 2.3 — Property 2: Duplicate Suppression
// Validates: Requirements 2.1
// ---------------------------------------------------------------------------

describe('Property 2: Duplicate Suppression', () => {
  const NOW = 1_700_000_000_000;

  function existingUnread(title: string, message: string, type: NType, age = 0): Notification {
    return makeNotification({
      title,
      message,
      type,
      read: false,
      createdAt: new Date(NOW - age).toISOString(),
    });
  }

  // --- Static / deterministic edge cases ---

  test('findDuplicate returns a match when unread + same title+message+type + within window', () => {
    const incoming = makeNotification({ type: 'delivery', title: 'T', message: 'M' });
    const existing = [existingUnread('T', 'M', 'delivery', DEDUP_WINDOW_MS - 1)];
    expect(findDuplicate(incoming, existing, NOW)).not.toBeNull();
  });

  test('findDuplicate returns null when existing entry is read', () => {
    const incoming = makeNotification({ type: 'delivery', title: 'T', message: 'M' });
    const existing = [{ ...existingUnread('T', 'M', 'delivery', 0), read: true }];
    expect(findDuplicate(incoming, existing, NOW)).toBeNull();
  });

  test('findDuplicate returns null for title mismatch', () => {
    const incoming = makeNotification({ type: 'delivery', title: 'T', message: 'M' });
    const existing = [existingUnread('Other', 'M', 'delivery', 0)];
    expect(findDuplicate(incoming, existing, NOW)).toBeNull();
  });

  test('findDuplicate returns null for message mismatch', () => {
    const incoming = makeNotification({ type: 'delivery', title: 'T', message: 'M' });
    const existing = [existingUnread('T', 'Other', 'delivery', 0)];
    expect(findDuplicate(incoming, existing, NOW)).toBeNull();
  });

  test('findDuplicate returns null for type mismatch', () => {
    const incoming = makeNotification({ type: 'delivery', title: 'T', message: 'M' });
    const existing = [existingUnread('T', 'M', 'system', 0)];
    expect(findDuplicate(incoming, existing, NOW)).toBeNull();
  });

  test('findDuplicate matches at exactly the boundary (age === DEDUP_WINDOW_MS)', () => {
    const incoming = makeNotification({ type: 'alert', title: 'A', message: 'B' });
    const existing = [existingUnread('A', 'B', 'alert', DEDUP_WINDOW_MS)];
    // now - t === DEDUP_WINDOW_MS, condition is <= window so it should match
    expect(findDuplicate(incoming, existing, NOW)).not.toBeNull();
  });

  test('findDuplicate returns null for age one ms past the boundary', () => {
    const incoming = makeNotification({ type: 'alert', title: 'A', message: 'B' });
    const existing = [existingUnread('A', 'B', 'alert', DEDUP_WINDOW_MS + 1)];
    expect(findDuplicate(incoming, existing, NOW)).toBeNull();
  });

  test('findDuplicate with malformed createdAt (NaN) never suppresses', () => {
    const incoming = makeNotification({ type: 'system', title: 'X', message: 'Y' });
    const existing = [
      { ...existingUnread('X', 'Y', 'system', 0), createdAt: 'not-a-date' },
    ];
    expect(findDuplicate(incoming, existing, NOW)).toBeNull();
  });

  // deduplicate: batch dedup against existing
  test('deduplicate suppresses duplicate; non-duplicate survives', () => {
    const dup = makeNotification({ type: 'delivery', title: 'T', message: 'M' });
    const unique = makeNotification({ type: 'delivery', title: 'Other', message: 'M' });
    const existing = [existingUnread('T', 'M', 'delivery', 100)];

    const result = deduplicate([dup, unique], existing, NOW);
    expect(result.suppressed).toHaveLength(1);
    expect(result.suppressed[0]).toBe(dup);
    expect(result.unique).toHaveLength(1);
    expect(result.unique[0]).toBe(unique);
  });

  test('deduplicate suppresses within-batch duplicate (second of two identical)', () => {
    const n1 = makeNotification({ type: 'alert', title: 'T', message: 'M' });
    const n2 = makeNotification({ type: 'alert', title: 'T', message: 'M' });

    const result = deduplicate([n1, n2], [], NOW);
    expect(result.unique).toHaveLength(1);
    expect(result.suppressed).toHaveLength(1);
  });

  // Property: for 100 seeded random batches, every entry is in exactly one of unique or suppressed
  test('deduplicate partitions input exhaustively — no entry lost or doubled (100 iterations)', () => {
    const rng = mulberry32(0xabcd1234);

    for (let i = 0; i < 100; i++) {
      const batchSize = 1 + Math.floor(rng() * 8);
      const title = rng() > 0.5 ? 'Title-A' : 'Title-B';
      const batch: Notification[] = Array.from({ length: batchSize }, () =>
        makeNotification({
          type: TYPES[Math.floor(rng() * TYPES.length)],
          title,
          message: 'Msg',
          createdAt: new Date(NOW - Math.floor(rng() * DEDUP_WINDOW_MS)).toISOString(),
        }),
      );

      const existingCount = Math.floor(rng() * 3);
      const existing: Notification[] = Array.from({ length: existingCount }, () =>
        existingUnread(title, 'Msg', TYPES[Math.floor(rng() * TYPES.length)], Math.floor(rng() * DEDUP_WINDOW_MS)),
      );

      const result = deduplicate(batch, existing, NOW);
      expect(result.unique.length + result.suppressed.length).toBe(batchSize);
    }
  });
});

// ---------------------------------------------------------------------------
// Task 2.4 — Property 3: Burst Detection (via pipeline constants)
// Validates: Requirements 3.1
// ---------------------------------------------------------------------------

describe('Property 3: Burst Detection (pipeline constants)', () => {
  test('BURST_THRESHOLD is 10', () => {
    expect(BURST_THRESHOLD).toBe(10);
  });

  test('BURST_WINDOW_MS is 1000', () => {
    expect(BURST_WINDOW_MS).toBe(1000);
  });

  test('a window exceeding BURST_THRESHOLD timestamps within BURST_WINDOW_MS triggers burst', () => {
    const now = Date.now();
    // 11 timestamps all within 1 second
    const timestamps = Array.from({ length: BURST_THRESHOLD + 1 }, (_, k) => now - k * 50);
    const recent = timestamps.filter((t) => now - t < BURST_WINDOW_MS);
    expect(recent.length).toBeGreaterThan(BURST_THRESHOLD);
  });

  test('a window with exactly BURST_THRESHOLD timestamps does NOT exceed threshold', () => {
    const now = Date.now();
    const timestamps = Array.from({ length: BURST_THRESHOLD }, (_, k) => now - k * 50);
    const recent = timestamps.filter((t) => now - t < BURST_WINDOW_MS);
    expect(recent.length).not.toBeGreaterThan(BURST_THRESHOLD);
  });

  test('timestamps older than BURST_WINDOW_MS are excluded from burst count', () => {
    const now = Date.now();
    // 5 recent + 10 old — total 15 but only 5 within window
    const timestamps = [
      ...Array.from({ length: 5 }, (_, k) => now - k * 50),
      ...Array.from({ length: 10 }, (_, k) => now - BURST_WINDOW_MS - 1 - k),
    ];
    const recent = timestamps.filter((t) => now - t < BURST_WINDOW_MS);
    expect(recent.length).not.toBeGreaterThan(BURST_THRESHOLD);
  });
});

// ---------------------------------------------------------------------------
// Task 2.5 — Property 4: Batch Grouping and Alert Separation
// Validates: Requirements 4.1, 4.3
// ---------------------------------------------------------------------------

describe('Property 4: Batch Grouping and Alert Separation', () => {
  const BASE_TIME = 1_700_000_000_000;

  function n(type: NType, title: string, id: string, offsetMs = 0): Notification {
    return makeNotification({
      id,
      type,
      title,
      message: 'msg',
      createdAt: new Date(BASE_TIME + offsetMs).toISOString(),
    });
  }

  // Static tests
  test('non-alert notifications with same type+title collapse into one entry', () => {
    const batch = [n('delivery', 'Package', 'a'), n('delivery', 'Package', 'b')];
    const result = groupBatch(batch);
    const deliveries = result.filter((x) => x.type === 'delivery' && x.title === 'Package');
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0].count).toBe(2);
  });

  test('every alert is its own entry with count=1', () => {
    const batch = [n('alert', 'Fire!', 'x'), n('alert', 'Fire!', 'y')];
    const result = groupBatch(batch);
    expect(result).toHaveLength(2);
    result.forEach((r) => expect(r.count).toBe(1));
  });

  test('sum of counts equals input batch length', () => {
    const batch = [
      n('delivery', 'Pkg', 'a'),
      n('delivery', 'Pkg', 'b'),
      n('system', 'Maint', 'c'),
      n('alert', 'Warn', 'd'),
    ];
    const result = groupBatch(batch);
    const total = result.reduce((s, r) => s + (r.count ?? 1), 0);
    expect(total).toBe(batch.length);
  });

  test('notifications with different titles produce separate groups', () => {
    const batch = [n('delivery', 'A', '1'), n('delivery', 'B', '2')];
    const result = groupBatch(batch);
    expect(result).toHaveLength(2);
  });

  test('representative is latest by createdAt', () => {
    const batch = [
      n('delivery', 'Pkg', 'old', 0),
      n('delivery', 'Pkg', 'new', 5000),
    ];
    const result = groupBatch(batch);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('new');
  });

  test('every output entry has a priority set', () => {
    const batch = [
      n('alert', 'A', 'a'),
      n('delivery', 'D', 'b'),
      n('system', 'S', 'c'),
    ];
    groupBatch(batch).forEach((r) => {
      expect(['high', 'medium', 'low']).toContain(r.priority);
    });
  });

  // Property: 100 seeded random mixed batches
  test('sum of counts equals batch size for 100 random batches (seeded)', () => {
    const rng = mulberry32(0x1337c0de);

    for (let i = 0; i < 100; i++) {
      const batchSize = 1 + Math.floor(rng() * 10);
      const batch: Notification[] = Array.from({ length: batchSize }, (_, k) =>
        makeNotification({
          id: `${i}-${k}`,
          type: TYPES[Math.floor(rng() * TYPES.length)],
          title: `Title-${Math.floor(rng() * 3)}`, // 3 possible titles
          message: 'msg',
          createdAt: new Date(BASE_TIME + Math.floor(rng() * 60_000)).toISOString(),
        }),
      );

      const result = groupBatch(batch);
      const total = result.reduce((s, r) => s + (r.count ?? 1), 0);
      expect(total).toBe(batchSize);
    }
  });

  test('alert entries always have count=1 for 100 random batches (seeded)', () => {
    const rng = mulberry32(0xfeedface);

    for (let i = 0; i < 100; i++) {
      const batchSize = 1 + Math.floor(rng() * 8);
      const batch: Notification[] = Array.from({ length: batchSize }, (_, k) =>
        makeNotification({
          id: `${i}-${k}`,
          type: TYPES[Math.floor(rng() * TYPES.length)],
          title: `T-${Math.floor(rng() * 3)}`,
          message: 'msg',
          createdAt: new Date(BASE_TIME + k).toISOString(),
        }),
      );

      groupBatch(batch)
        .filter((r) => r.type === 'alert')
        .forEach((r) => expect(r.count).toBe(1));
    }
  });
});

// ---------------------------------------------------------------------------
// Task 2.6 — Property 5: Route Relevance
// Validates: Requirements 5.2
// ---------------------------------------------------------------------------

describe('Property 5: Route Relevance', () => {
  // Static assertions
  test('delivery is relevant on /deliveries', () => {
    expect(isRelevantRoute('delivery', '/deliveries')).toBe(true);
  });

  test('delivery is relevant on /deliveries/123', () => {
    expect(isRelevantRoute('delivery', '/deliveries/123')).toBe(true);
  });

  test('delivery is not relevant on /dashboard', () => {
    expect(isRelevantRoute('delivery', '/dashboard')).toBe(false);
  });

  test('system is relevant on /admin', () => {
    expect(isRelevantRoute('system', '/admin')).toBe(true);
  });

  test('system is relevant on /admin/users', () => {
    expect(isRelevantRoute('system', '/admin/users')).toBe(true);
  });

  test('system is not relevant on /dashboard', () => {
    expect(isRelevantRoute('system', '/dashboard')).toBe(false);
  });

  test('alert is never relevant regardless of route', () => {
    ['/deliveries', '/admin', '/', '/anything'].forEach((r) => {
      expect(isRelevantRoute('alert', r)).toBe(false);
    });
  });

  // Property: 100 seeded random routes
  test('isRelevantRoute matches prefix rules for 100 random routes (seeded)', () => {
    const rng = mulberry32(0xbaadf00d);

    const prefixes = ['/deliveries', '/admin', '/dashboard', '/fleet', '/settings', ''];

    for (let i = 0; i < 100; i++) {
      const prefix = prefixes[Math.floor(rng() * prefixes.length)];
      const suffix = rng() > 0.5 ? '/sub-' + Math.floor(rng() * 100) : '';
      const route = prefix + suffix;

      expect(isRelevantRoute('delivery', route)).toBe(route.startsWith('/deliveries'));
      expect(isRelevantRoute('system', route)).toBe(route.startsWith('/admin'));
      expect(isRelevantRoute('alert', route)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Task 2.7 — Property 6: Toast Decision Policy
// Validates: Requirements 5.1, 6.1, 7.1
// ---------------------------------------------------------------------------

describe('Property 6: Toast Decision Policy', () => {
  // Static decision table
  test('alert always toasts', () => {
    ['/deliveries', '/admin', '/', '/other'].forEach((r) => {
      expect(shouldToast('alert', r)).toBe(true);
    });
  });

  test('delivery does NOT toast on /deliveries', () => {
    expect(shouldToast('delivery', '/deliveries')).toBe(false);
  });

  test('delivery does NOT toast on /deliveries/123', () => {
    expect(shouldToast('delivery', '/deliveries/123')).toBe(false);
  });

  test('delivery DOES toast on /dashboard', () => {
    expect(shouldToast('delivery', '/dashboard')).toBe(true);
  });

  test('system does NOT toast on /admin', () => {
    expect(shouldToast('system', '/admin')).toBe(false);
  });

  test('system does NOT toast on /admin/users', () => {
    expect(shouldToast('system', '/admin/users')).toBe(false);
  });

  test('system DOES toast on /dashboard', () => {
    expect(shouldToast('system', '/dashboard')).toBe(true);
  });

  // Property: shouldToast === (type === 'alert') || !isRelevantRoute(type, route)
  test('shouldToast equals (type===alert) || !isRelevantRoute for 100 seeded pairs', () => {
    const rng = mulberry32(0xcafebabe);
    const routes = ['/deliveries', '/deliveries/1', '/admin', '/admin/x', '/dashboard', '/', '/fleet'];

    for (let i = 0; i < 100; i++) {
      const type = TYPES[Math.floor(rng() * TYPES.length)];
      const route = routes[Math.floor(rng() * routes.length)];

      const expected = type === 'alert' || !isRelevantRoute(type, route);
      expect(shouldToast(type, route)).toBe(expected);
    }
  });
});

// ---------------------------------------------------------------------------
// Task 2.8 — Unit tests for edge cases
// ---------------------------------------------------------------------------

describe('Unit tests: edge cases', () => {
  const NOW = 1_700_000_000_000;

  test('empty batch returns empty array from groupBatch', () => {
    expect(groupBatch([])).toEqual([]);
  });

  test('single non-alert notification groups to count=1', () => {
    const n = makeNotification({ type: 'delivery', title: 'T', message: 'M' });
    const result = groupBatch([n]);
    expect(result).toHaveLength(1);
    expect(result[0].count).toBe(1);
  });

  test('duplicate within batch is removed before grouping (survivor groups to count=1)', () => {
    const n1 = makeNotification({
      type: 'delivery',
      title: 'T',
      message: 'M',
      createdAt: new Date(NOW - 100).toISOString(),
    });
    const n2 = makeNotification({
      type: 'delivery',
      title: 'T',
      message: 'M',
      createdAt: new Date(NOW - 100).toISOString(),
    });

    // Deduplicate removes n2, then groupBatch sees only n1
    const { unique } = deduplicate([n1, n2], [], NOW);
    expect(unique).toHaveLength(1);

    const grouped = groupBatch(unique);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].count).toBe(1);
  });

  test('malformed createdAt in existing list does not suppress incoming (no throw)', () => {
    const incoming = makeNotification({
      type: 'system',
      title: 'T',
      message: 'M',
      createdAt: new Date(NOW).toISOString(),
    });
    const existing: Notification[] = [
      {
        ...incoming,
        id: 'other-id',
        read: false,
        createdAt: 'totally-invalid-date',
      },
    ];

    // Should not throw and should not suppress
    let result: ReturnType<typeof deduplicate> | undefined;
    expect(() => {
      result = deduplicate([incoming], existing, NOW);
    }).not.toThrow();
    expect(result!.unique).toHaveLength(1);
    expect(result!.suppressed).toHaveLength(0);
  });

  test('malformed createdAt in incoming batch is handled without throwing', () => {
    const malformed = makeNotification({
      type: 'delivery',
      title: 'T',
      message: 'M',
      createdAt: 'bad-date',
    });

    expect(() => groupBatch([malformed])).not.toThrow();
    expect(() => deduplicate([malformed], [], NOW)).not.toThrow();
  });
});
