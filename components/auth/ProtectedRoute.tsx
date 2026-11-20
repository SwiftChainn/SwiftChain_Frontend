'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useSession } from '@/context/SessionContext';
import type { UserRole } from '@/store/authStore';
import { getAllowedRoles, getRoleHomeRoute, hasAnyRole } from '@/lib/rbac';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Shorthand for `allowedRoles={[requiredRole]}`. */
  requiredRole?: UserRole;
  /** Roles allowed to view the children. Defaults to the rule for the current path in lib/rbac. */
  allowedRoles?: readonly UserRole[];
}

export function ProtectedRoute({ children, requiredRole, allowedRoles }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, role } = useSession();

  const roles = allowedRoles ?? (requiredRole ? [requiredRole] : getAllowedRoles(pathname ?? '/'));
  const isForbidden = !!roles && !hasAnyRole(role, roles);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (isForbidden) {
      router.replace(getRoleHomeRoute(role));
    }
  }, [isAuthenticated, isLoading, isForbidden, role, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated || isForbidden) {
    return null;
  }

  return <>{children}</>;
}
