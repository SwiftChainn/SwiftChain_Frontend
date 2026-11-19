/**
 * API response mapping and error serialization.
 *
 * A single, consistent pattern for turning whatever the network layer hands us
 * (an envelope, an Axios error, a Zod failure, a thrown string) into either
 * validated domain data or a typed `ApiError`.
 *
 * Usage:
 *   const res = await api.get('/deliveries/1');
 *   const delivery = mapResponse(res.data, deliverySchema);   // throws ApiError
 *
 *   try { ... } catch (e) { notify.apiError(e); }             // see lib/uiFeedback
 */

import axios from 'axios';
import { ZodError, type ZodType } from 'zod';

/** Standard backend response envelope. */
export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
  /** Field-level errors, e.g. { email: ['Invalid email'] } */
  errors?: Record<string, string[]>;
  code?: string;
}

export type ApiErrorCode =
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'SERVER_ERROR'
  | 'REQUEST_FAILED'
  | 'RESPONSE_MAPPING_ERROR'
  | 'UNKNOWN_ERROR';

export const DEFAULT_ERROR_MESSAGE = 'Something went wrong. Please try again.';

/** Normalised error type used across the app. */
export class ApiError extends Error {
  readonly code: ApiErrorCode | string;
  readonly status?: number;
  readonly fieldErrors: Record<string, string[]>;
  readonly cause?: unknown;

  constructor(
    message: string,
    options: {
      code?: ApiErrorCode | string;
      status?: number;
      fieldErrors?: Record<string, string[]>;
      cause?: unknown;
    } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = options.code ?? 'UNKNOWN_ERROR';
    this.status = options.status;
    this.fieldErrors = options.fieldErrors ?? {};
    this.cause = options.cause;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  get isNetworkError(): boolean {
    return this.code === 'NETWORK_ERROR' || this.code === 'TIMEOUT';
  }

  get isValidationError(): boolean {
    return this.code === 'VALIDATION_ERROR';
  }
}

function codeFromStatus(status?: number): ApiErrorCode {
  if (status === undefined) return 'NETWORK_ERROR';
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 400 || status === 409 || status === 422) return 'VALIDATION_ERROR';
  if (status >= 500) return 'SERVER_ERROR';
  return 'REQUEST_FAILED';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Coerce arbitrary backend `errors` payloads into `{ field: string[] }`. */
function normalizeFieldErrors(raw: unknown): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  if (!isRecord(raw)) return result;
  for (const [field, value] of Object.entries(raw)) {
    if (typeof value === 'string') result[field] = [value];
    else if (Array.isArray(value)) {
      const messages = value.filter((v): v is string => typeof v === 'string');
      if (messages.length > 0) result[field] = messages;
    }
  }
  return result;
}

/** Convert Zod issues to `{ 'path.to.field': ['message'] }`. */
export function zodIssuesToFieldErrors(error: ZodError): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_root';
    (result[key] ??= []).push(issue.message);
  }
  return result;
}

/**
 * Normalise any thrown value into an `ApiError`. Never throws.
 * Already-normalised errors are returned unchanged.
 */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (error instanceof ZodError) {
    return new ApiError('The server returned data in an unexpected format.', {
      code: 'RESPONSE_MAPPING_ERROR',
      fieldErrors: zodIssuesToFieldErrors(error),
      cause: error,
    });
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const body: unknown = error.response?.data;
    const payload = isRecord(body) ? body : {};

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError('The request timed out. Please try again.', {
        code: 'TIMEOUT',
        cause: error,
      });
    }

    if (status === undefined) {
      return new ApiError('Unable to reach the server. Check your connection.', {
        code: 'NETWORK_ERROR',
        cause: error,
      });
    }

    const message =
      (typeof payload.message === 'string' && payload.message) ||
      (typeof payload.error === 'string' && payload.error) ||
      DEFAULT_ERROR_MESSAGE;

    return new ApiError(message, {
      code: typeof payload.code === 'string' ? payload.code : codeFromStatus(status),
      status,
      fieldErrors: normalizeFieldErrors(payload.errors),
      cause: error,
    });
  }

  if (error instanceof Error) {
    return new ApiError(error.message || DEFAULT_ERROR_MESSAGE, { cause: error });
  }

  if (typeof error === 'string' && error.length > 0) {
    return new ApiError(error, { cause: error });
  }

  return new ApiError(DEFAULT_ERROR_MESSAGE, { cause: error });
}

/** Human-readable message for any thrown value. */
export function getErrorMessage(error: unknown, fallback = DEFAULT_ERROR_MESSAGE): string {
  const message = toApiError(error).message;
  return message || fallback;
}

/**
 * Validate and map a raw payload with a Zod schema.
 * Throws `ApiError` (`RESPONSE_MAPPING_ERROR`) when the shape is wrong, so
 * serialization problems surface in one predictable way.
 */
export function mapResponse<Out, In = unknown>(
  raw: unknown,
  schema: ZodType<Out, any, In>,
): Out {
  const result = schema.safeParse(raw);
  if (!result.success) throw toApiError(result.error);
  return result.data;
}

/**
 * Unwrap a standard `{ success, data }` envelope.
 * - `success: false` -> throws `ApiError` carrying message/code/field errors
 * - with a schema -> validates `data` through `mapResponse`
 */
export function unwrapEnvelope<Out>(envelope: unknown, schema: ZodType<Out, any, any>): Out;
export function unwrapEnvelope<T = unknown>(envelope: unknown): T;
export function unwrapEnvelope(envelope: unknown, schema?: ZodType<unknown, any, any>): unknown {
  if (!isRecord(envelope) || typeof envelope.success !== 'boolean') {
    throw new ApiError('The server returned an invalid response.', {
      code: 'RESPONSE_MAPPING_ERROR',
    });
  }

  if (!envelope.success) {
    throw new ApiError(
      typeof envelope.message === 'string' && envelope.message
        ? envelope.message
        : DEFAULT_ERROR_MESSAGE,
      {
        code: typeof envelope.code === 'string' ? envelope.code : 'REQUEST_FAILED',
        fieldErrors: normalizeFieldErrors(envelope.errors),
      },
    );
  }

  return schema ? mapResponse(envelope.data, schema) : envelope.data;
}
