'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore, type AuthUser, type UserRole } from '@/store/authStore';
import { authApiService } from '@/services/auth.service';

interface UseAuthReturn {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  disconnect: () => void;
}

const API_TO_STORE_ROLE: Record<string, UserRole> = {
  customer: 'Customer',
  driver: 'Driver',
  admin: 'Admin',
};

export function useAuth(): UseAuthReturn {
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthenticated, setUser, clearUser } = useAuthStore();

  // Disconnect handler: drops the session token and clears the auth state.
  // Consumers that hold per-session data (e.g. useWalletBalance) reset
  // themselves when isAuthenticated flips to false.
  const disconnect = useCallback((): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
    }
    clearUser();
  }, [clearUser]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    const verify = async () => {
      if (!token) {
        clearUser();
        setIsLoading(false);
        return;
      }

      authApiService
        .getCurrentUser()
        .then((res) => {
          if (res.data) {
            const role: UserRole = API_TO_STORE_ROLE[res.data.role] ?? 'Customer';
            setUser({ id: res.data.id, email: res.data.email, role });
          } else {
            clearUser();
          }
        })
        .catch(() => {
          localStorage.removeItem('authToken');
          clearUser();
        })
        .finally(() => setIsLoading(false));
    };

    void verify();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isAuthenticated, isLoading, user, disconnect };
}
