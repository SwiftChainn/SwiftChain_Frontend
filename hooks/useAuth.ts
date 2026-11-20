'use client';

import { useSession } from '@/context/SessionContext';
import type { AuthUser } from '@/store/authStore';

interface UseAuthReturn {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
}

/** Thin accessor over the centralized session; see SessionProvider. */
export function useAuth(): UseAuthReturn {
  const { isAuthenticated, isLoading, user } = useSession();
  return { isAuthenticated, isLoading, user };
}
