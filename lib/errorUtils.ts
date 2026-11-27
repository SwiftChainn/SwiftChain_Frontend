/**
 * Typed helpers for working with caught values.
 *
 * `catch (error)` yields `unknown` under `strict`. These helpers narrow it to
 * the shape HTTP clients and `Error` instances actually expose, without `any`.
 */

/** Shape shared by `Error` and Axios-style HTTP errors. All fields are optional. */
export interface ApiErrorLike {
  name?: string;
  message?: string;
  code?: string;
  status?: number;
  response?: {
    status?: number;
    statusText?: string;
    data?: {
      message?: string;
      error?: string;
      [key: string]: unknown;
    };
  };
}

/**
 * Narrows a caught value to {@link ApiErrorLike}.
 * Objects (including `Error` instances) are returned unchanged so identity,
 * `instanceof` checks and rethrows keep working; primitives are wrapped.
 */
export function toApiError(caught: unknown): ApiErrorLike {
  if (typeof caught === 'object' && caught !== null) {
    return caught as ApiErrorLike;
  }
  return { message: typeof caught === 'string' ? caught : undefined };
}

/**
 * Best-effort human readable message for a caught value: the API response
 * message first, then the error's own message, then `fallback`.
 */
export function getErrorMessage(
  caught: unknown,
  fallback = 'An unexpected error occurred',
): string {
  const error = toApiError(caught);
  return error.response?.data?.message || error.message || fallback;
}
