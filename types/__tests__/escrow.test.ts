/**
 * Type-level tests for the escrow detail shapes.
 *
 * `EscrowDetails.status` is required: a payload without it must not compile,
 * so a missing status is caught here instead of crashing the UI at render.
 */

import type { EscrowDetails } from '@/types/escrow';

const BASE_DETAILS = {
  requiredSignatures: 2,
  currentSignatures: 2,
  isReleased: false,
  signers: ['GBX123'],
};

describe('EscrowDetails', () => {
  it('accepts a locked status', () => {
    const details: EscrowDetails = { ...BASE_DETAILS, status: 'locked' };
    expect(details.status).toBe('locked');
  });

  it('accepts Unknown as a status', () => {
    const details: EscrowDetails = { ...BASE_DETAILS, status: 'Unknown' };
    expect(details.status).toBe('Unknown');
  });

  it('does not compile without status', () => {
    // @ts-expect-error status is required on EscrowDetails
    const details: EscrowDetails = { ...BASE_DETAILS };
    expect(details).toBeDefined();
  });
});
