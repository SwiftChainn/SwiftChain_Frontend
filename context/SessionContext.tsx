'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuthStore, type AuthUser, type UserRole } from '@/store/authStore';
import { authApiService } from '@/services/auth.service';
import { hasAnyRole } from '@/lib/rbac';

export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface SessionContextValue {
  user: AuthUser | null;
  role: UserRole | null;
  status: SessionStatus;
  isAuthenticated: boolean;
  /** True only while the initial session check is in flight. */
  isLoading: boolean;
  hasRole: (roles: UserRole | readonly UserRole[]) => boolean;
  signOut: () => void;
}

const API_TO_STORE_ROLE: Record<string, UserRole> = {
  customer: 'Customer',
  driver: 'Driver',
  admin: 'Admin',
};

const SessionContext = createContext<SessionContextValue | null>(null);

function readToken(): string | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage.getItem('authToken') : null;
  } catch {
    return null;
  }
}

function discardToken(): void {
  try {
    window.localStorage.removeItem('authToken');
  } catch {
    // Storage unavailable; nothing to discard.
  }
  document.cookie = 'authToken=; Max-Age=0; path=/';
}

/**
 * Verifies the stored auth token once on mount and exposes the resulting
 * session (user, role, loading state) to the whole app.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setUser = useAuthStore((s) => s.setUser);
  const clearUser = useAuthStore((s) => s.clearUser);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!readToken()) {
      // No token to verify; initial state must be resolved after mount to stay SSR-safe.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoading(false);
      return;
    }

    authApiService
      .getCurrentUser()
      .then((res) => {
        if (cancelled) return;
        if (res.data) {
          const role: UserRole = API_TO_STORE_ROLE[res.data.role] ?? 'Customer';
          setUser({ id: res.data.id, email: res.data.email, role });
        } else {
          clearUser();
        }
      })
      .catch(() => {
        if (cancelled) return;
        discardToken();
        clearUser();
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [setUser, clearUser]);

  const signOut = useCallback(() => {
    discardToken();
    clearUser();
  }, [clearUser]);

  const role = user?.role ?? null;

  const value = useMemo<SessionContextValue>(
    () => ({
      user,
      role,
      status: isLoading ? 'loading' : isAuthenticated ? 'authenticated' : 'unauthenticated',
      isAuthenticated,
      isLoading,
      hasRole: (roles) => hasAnyRole(role, roles),
      signOut,
    }),
    [user, role, isAuthenticated, isLoading, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return ctx;
}
