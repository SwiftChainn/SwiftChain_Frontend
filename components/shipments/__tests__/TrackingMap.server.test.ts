/** @jest-environment node */

import { TrackingMap, calculateEstimatedDeliveryDate } from '../TrackingMap';

describe('TrackingMap server entry point', () => {
  it('can be imported before any browser globals are available', () => {
    expect(typeof window).toBe('undefined');
    expect(TrackingMap).toBeDefined();
    expect(calculateEstimatedDeliveryDate('2026-05-29T10:30:00Z', 25)).toBe(
      '2026-05-29T10:55:00.000Z',
    );
  });
});
