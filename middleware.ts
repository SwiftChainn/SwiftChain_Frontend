import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ROLE_ROUTES: Record<string, readonly string[]> = {
  '/admin': ['admin'],
};

function tokenIsUsable(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return token.length >= 16;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))) as {
      exp?: number;
    };
    return !payload.exp || payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('authToken')?.value;
  const { pathname } = request.nextUrl;

  const isProtected =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/admin');

  if (isProtected && (!token || !tokenIsUsable(token))) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  const restrictedRoute = Object.keys(ROLE_ROUTES).find((route) => pathname.startsWith(route));
  const role = request.cookies.get('userRole')?.value.toLowerCase();
  if (restrictedRoute && (!role || !ROLE_ROUTES[restrictedRoute].includes(role))) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = '/dashboard';
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
