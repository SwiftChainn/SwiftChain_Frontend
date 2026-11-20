import { isAxiosError } from '@/lib/httpClient';

export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'SERVER_ERROR'
  | 'UNKNOWN';

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: AuthErrorCode,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export function normalizeAuthError(error: unknown): AuthError {
  if (error instanceof AuthError) return error;
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data as { message?: string } | undefined;
    if (status === 401 || status === 403) {
      return new AuthError(data?.message ?? 'Invalid email or password', 'INVALID_CREDENTIALS', status);
    }
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new AuthError('The login request timed out. Please try again.', 'TIMEOUT');
    }
    if (!error.response) {
      return new AuthError('Unable to reach the server. Check your connection.', 'NETWORK_ERROR');
    }
    return new AuthError(data?.message ?? 'The server could not complete login.', 'SERVER_ERROR', status);
  }
  return new AuthError(error instanceof Error ? error.message : 'Login failed', 'UNKNOWN');
}
