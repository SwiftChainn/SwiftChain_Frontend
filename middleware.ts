import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function decodeToken(token: string): { exp?: number; role?: string } | null {
  const parts = token.split('.');
  if (parts.length !== 3) return token.length >= 16 ? {} : null;
  try {
    return JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('authToken')?.value;
  const { pathname } = request.nextUrl;

  const isProtected =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/admin');

  const claims = token ? decodeToken(token) : null;
  const expired = claims?.exp ? claims.exp * 1000 <= Date.now() : false;
  if (isProtected && (!claims || expired)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith('/admin')) {
    const role = (claims?.role ?? request.cookies.get('userRole')?.value)?.toLowerCase();
    if (role !== 'admin') {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = '/dashboard';
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
