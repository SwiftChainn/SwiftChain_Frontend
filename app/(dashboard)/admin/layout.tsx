import type { ReactNode } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function DashboardAdminLayout({ children }: { children: ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
