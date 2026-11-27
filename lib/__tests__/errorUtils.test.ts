import { getErrorMessage, toApiError } from '@/lib/errorUtils';

describe('errorUtils', () => {
  it('returns objects unchanged so identity and instanceof survive', () => {
    const err = new Error('boom');
    expect(toApiError(err)).toBe(err);
    expect(toApiError(err) instanceof Error).toBe(true);
  });

  it('wraps primitives', () => {
    expect(toApiError('oops').message).toBe('oops');
    expect(toApiError(null).message).toBeUndefined();
    expect(toApiError(42).message).toBeUndefined();
  });

  it('prefers the API response message, then the error message, then the fallback', () => {
    expect(getErrorMessage({ message: 'x', response: { data: { message: 'api' } } })).toBe('api');
    expect(getErrorMessage(new Error('own'))).toBe('own');
    expect(getErrorMessage(undefined)).toBe('An unexpected error occurred');
    expect(getErrorMessage(null, 'custom')).toBe('custom');
  });
});
