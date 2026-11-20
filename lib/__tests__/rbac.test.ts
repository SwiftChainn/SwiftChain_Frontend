import {
  ROLE_HOME_ROUTE,
  USER_ROLES,
  canAccessRoute,
  getAllowedRoles,
  getRoleHomeRoute,
  hasAnyRole,
} from '@/lib/rbac';

describe('getAllowedRoles', () => {
  it('restricts admin routes to Admin', () => {
    expect(getAllowedRoles('/admin')).toEqual(['Admin']);
    expect(getAllowedRoles('/admin/refunds')).toEqual(['Admin']);
  });

  it('restricts driver routes to Driver', () => {
    expect(getAllowedRoles('/driver/jobs')).toEqual(['Driver']);
  });

  it('allows fleet routes for Fleet Operator and Admin', () => {
    expect(getAllowedRoles('/fleet/analytics')).toEqual(['Fleet Operator', 'Admin']);
  });

  it('keeps delivery creation away from drivers', () => {
    expect(getAllowedRoles('/deliveries/create')).toEqual(['Customer', 'Fleet Operator', 'Admin']);
  });

  it('returns null for routes without a rule', () => {
    expect(getAllowedRoles('/')).toBeNull();
    expect(getAllowedRoles('/deliveries/abc')).toBeNull();
    expect(getAllowedRoles('/settings/profile')).toBeNull();
  });

  it('matches on segment boundaries only', () => {
    expect(getAllowedRoles('/administrator')).toBeNull();
    expect(getAllowedRoles('/drivers')).toBeNull();
    expect(getAllowedRoles('/fleetwood')).toBeNull();
  });

  it('ignores trailing slashes, query strings and hashes', () => {
    expect(getAllowedRoles('/admin/')).toEqual(['Admin']);
    expect(getAllowedRoles('/admin?tab=1')).toEqual(['Admin']);
    expect(getAllowedRoles('/driver/jobs#top')).toEqual(['Driver']);
  });
});

describe('canAccessRoute', () => {
  it('allows only the permitted roles on restricted routes', () => {
    expect(canAccessRoute('Admin', '/admin/overview')).toBe(true);
    expect(canAccessRoute('Customer', '/admin/overview')).toBe(false);
    expect(canAccessRoute('Driver', '/admin/overview')).toBe(false);
    expect(canAccessRoute('Fleet Operator', '/admin/overview')).toBe(false);

    expect(canAccessRoute('Driver', '/driver/earnings')).toBe(true);
    expect(canAccessRoute('Admin', '/driver/earnings')).toBe(false);
    expect(canAccessRoute('Customer', '/driver/earnings')).toBe(false);

    expect(canAccessRoute('Customer', '/deliveries/create')).toBe(true);
    expect(canAccessRoute('Driver', '/deliveries/create')).toBe(false);
  });

  it('denies a missing role on restricted routes but not on open ones', () => {
    expect(canAccessRoute(null, '/admin')).toBe(false);
    expect(canAccessRoute(undefined, '/driver/jobs')).toBe(false);
    expect(canAccessRoute(null, '/settings/profile')).toBe(true);
  });

  it('lets every role open routes without a rule', () => {
    for (const role of USER_ROLES) {
      expect(canAccessRoute(role, '/support')).toBe(true);
    }
  });
});

describe('getRoleHomeRoute', () => {
  it('maps every role to a route that role can access (no redirect loops)', () => {
    for (const role of USER_ROLES) {
      expect(canAccessRoute(role, ROLE_HOME_ROUTE[role])).toBe(true);
      expect(getRoleHomeRoute(role)).toBe(ROLE_HOME_ROUTE[role]);
    }
  });

  it('sends an unknown role to the login page', () => {
    expect(getRoleHomeRoute(null)).toBe('/login');
  });
});

describe('hasAnyRole', () => {
  it('accepts a single role or a list', () => {
    expect(hasAnyRole('Driver', 'Driver')).toBe(true);
    expect(hasAnyRole('Driver', ['Admin', 'Driver'])).toBe(true);
    expect(hasAnyRole('Customer', ['Admin', 'Driver'])).toBe(false);
  });

  it('is false without a role', () => {
    expect(hasAnyRole(null, ['Admin'])).toBe(false);
  });
});
