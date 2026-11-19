import { AxiosError, AxiosHeaders } from 'axios';
import { z } from 'zod';
import {
  ApiError,
  DEFAULT_ERROR_MESSAGE,
  getErrorMessage,
  mapResponse,
  toApiError,
  unwrapEnvelope,
} from '../apiResponse';

function axiosError(status: number | undefined, data?: unknown, code?: string) {
  const config = { headers: new AxiosHeaders() };
  const response =
    status === undefined ? undefined : { status, statusText: '', headers: {}, config, data };
  return new AxiosError('boom', code, config, {}, response);
}

describe('toApiError', () => {
  it('returns existing ApiError unchanged', () => {
    const err = new ApiError('x', { code: 'FORBIDDEN' });
    expect(toApiError(err)).toBe(err);
  });

  it('maps HTTP status to codes and uses backend message', () => {
    const err = toApiError(axiosError(404, { message: 'Delivery not found' }));
    expect(err.code).toBe('NOT_FOUND');
    expect(err.status).toBe(404);
    expect(err.message).toBe('Delivery not found');
  });

  it.each([
    [401, 'UNAUTHORIZED'],
    [403, 'FORBIDDEN'],
    [422, 'VALIDATION_ERROR'],
    [500, 'SERVER_ERROR'],
    [418, 'REQUEST_FAILED'],
  ])('maps status %i to %s', (status, code) => {
    expect(toApiError(axiosError(status, {})).code).toBe(code);
  });

  it('prefers a backend-provided code and normalises field errors', () => {
    const err = toApiError(
      axiosError(422, {
        message: 'Invalid',
        code: 'E_BAD',
        errors: { email: 'bad', name: ['a', 'b'], x: 5 },
      }),
    );
    expect(err.code).toBe('E_BAD');
    expect(err.fieldErrors).toEqual({ email: ['bad'], name: ['a', 'b'] });
  });

  it('flags network errors and timeouts', () => {
    const net = toApiError(axiosError(undefined));
    expect(net.code).toBe('NETWORK_ERROR');
    expect(net.isNetworkError).toBe(true);
    expect(toApiError(axiosError(undefined, undefined, 'ECONNABORTED')).code).toBe('TIMEOUT');
  });

  it('falls back to a default message for empty bodies', () => {
    expect(toApiError(axiosError(500, '')).message).toBe(DEFAULT_ERROR_MESSAGE);
  });

  it('handles Error, string and unknown values', () => {
    expect(toApiError(new Error('oops')).message).toBe('oops');
    expect(toApiError('plain').message).toBe('plain');
    expect(toApiError(undefined).message).toBe(DEFAULT_ERROR_MESSAGE);
    expect(getErrorMessage(null)).toBe(DEFAULT_ERROR_MESSAGE);
  });

  it('converts ZodError to RESPONSE_MAPPING_ERROR with field paths', () => {
    const result = z.object({ a: z.object({ b: z.string() }) }).safeParse({ a: {} });
    if (result.success) throw new Error('expected failure');
    const err = toApiError(result.error);
    expect(err.code).toBe('RESPONSE_MAPPING_ERROR');
    expect(Object.keys(err.fieldErrors)).toEqual(['a.b']);
  });
});

describe('mapResponse', () => {
  const schema = z.object({ id: z.string(), amount: z.coerce.number() });

  it('returns parsed/coerced data', () => {
    expect(mapResponse({ id: 'd1', amount: '12.5' }, schema)).toEqual({ id: 'd1', amount: 12.5 });
  });

  it('throws ApiError on malformed payloads', () => {
    expect(() => mapResponse({ id: 1 }, schema)).toThrow(ApiError);
  });
});

describe('unwrapEnvelope', () => {
  it('returns data from a successful envelope', () => {
    expect(unwrapEnvelope({ success: true, data: { n: 1 } })).toEqual({ n: 1 });
  });

  it('validates data when a schema is supplied', () => {
    const schema = z.object({ n: z.number() });
    expect(unwrapEnvelope({ success: true, data: { n: 1 } }, schema)).toEqual({ n: 1 });
    expect(() => unwrapEnvelope({ success: true, data: { n: 'x' } }, schema)).toThrow(
      expect.objectContaining({ code: 'RESPONSE_MAPPING_ERROR' }),
    );
  });

  it('throws with message, code and field errors on success: false', () => {
    let caught: unknown;
    try {
      unwrapEnvelope({ success: false, message: 'Nope', code: 'E1', errors: { f: ['bad'] } });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).message).toBe('Nope');
    expect((caught as ApiError).code).toBe('E1');
    expect((caught as ApiError).fieldErrors).toEqual({ f: ['bad'] });
  });

  it('rejects values that are not envelopes', () => {
    expect(() => unwrapEnvelope('html page')).toThrow(
      expect.objectContaining({ code: 'RESPONSE_MAPPING_ERROR' }),
    );
    expect(() => unwrapEnvelope(null)).toThrow(ApiError);
  });
});
