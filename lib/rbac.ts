import type { UserRole } from '@/store/authStore';

export const USER_ROLES: readonly UserRole[] = ['Customer', 'Driver', 'Admin', 'Fleet Operator'];

interface RouteRule {
  /** Path prefix, matched on a segment boundary (`/admin` matches `/admin/x`, not `/administrator`). */
  prefix: string;
  roles: readonly UserRole[];
}

/**
 * Role-based access rules. The most specific (longest) matching prefix wins.
 * Routes without a matching rule are open to any authenticated user.
 */
export const ROUTE_RULES: readonly RouteRule[] = [
  { prefix: '/admin', roles: ['Admin'] },
  { prefix: '/driver', roles: ['Driver'] },
  { prefix: '/fleet', roles: ['Fleet Operator', 'Admin'] },
  { prefix: '/deliveries/create', roles: ['Customer', 'Fleet Operator', 'Admin'] },
];

/** Landing route for each role, used when a user reaches a route they may not access. */
export const ROLE_HOME_ROUTE: Readonly<Record<UserRole, string>> = {
  Customer: '/deliveries/create',
  Driver: '/driver/jobs',
  Admin: '/admin/overview',
  'Fleet Operator': '/fleet',
};

function normalizePath(pathname: string): string {
  const path = pathname.split(/[?#]/)[0] || '/';
  return path.length > 1 ? path.replace(/\/+$/, '') : path;
}

function matchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

/** Returns the roles allowed on `pathname`, or `null` when any authenticated user may visit. */
export function getAllowedRoles(pathname: string): readonly UserRole[] | null {
  const path = normalizePath(pathname);
  let best: RouteRule | null = null;

  for (const rule of ROUTE_RULES) {
    if (matchesPrefix(path, rule.prefix) && (!best || rule.prefix.length > best.prefix.length)) {
      best = rule;
    }
  }

  return best ? best.roles : null;
}

/** True when `role` may open `pathname`. A missing role is never allowed on a restricted route. */
export function canAccessRoute(role: UserRole | null | undefined, pathname: string): boolean {
  const allowed = getAllowedRoles(pathname);
  if (!allowed) return true;
  return !!role && allowed.includes(role);
}

export function getRoleHomeRoute(role: UserRole | null | undefined): string {
  return role ? ROLE_HOME_ROUTE[role] : '/login';
}

export function hasAnyRole(
  role: UserRole | null | undefined,
  roles: UserRole | readonly UserRole[],
): boolean {
  if (!role) return false;
  return (Array.isArray(roles) ? roles : [roles]).includes(role);
}
