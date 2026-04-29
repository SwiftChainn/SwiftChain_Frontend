import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, UserRole } from '@/store/authStore';

interface UseRequireRoleResult {
  isAuthorized: boolean;
  isAuthenticated: boolean;
  role: UserRole | null;
}

/**
 * useRequireRole — gate a page strictly to a specific role.
 *
 * Behavior:
 *   - Unauthenticated visitors are redirected to /login.
 *   - Authenticated users with a different role are redirected to /.
 *   - Returns isAuthorized=true only when the role matches exactly.
 */
export function useRequireRole(required: UserRole): UseRequireRoleResult {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const isAuthorized = useMemo(
    () => isAuthenticated && user?.role === required,
    [isAuthenticated, user?.role, required],
  );

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (user && user.role !== required) {
      router.replace('/');
    }
  }, [isAuthenticated, user, required, router]);

  return {
    isAuthorized,
    isAuthenticated,
    role: user?.role ?? null,
  };
}
