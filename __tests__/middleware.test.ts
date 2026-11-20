import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';

function request(path: string, cookies: Record<string, string> = {}) {
  const headers = new Headers();
  if (Object.keys(cookies).length) {
    headers.set('cookie', Object.entries(cookies).map(([key, value]) => `${key}=${value}`).join('; '));
  }
  return new NextRequest(`https://swiftchain.test${path}`, { headers });
}

describe('protected route middleware', () => {
  it('redirects missing and malformed tokens to login', () => {
    expect(middleware(request('/dashboard')).headers.get('location')).toBe(
      'https://swiftchain.test/login',
    );
    expect(middleware(request('/dashboard', { authToken: 'bad' })).headers.get('location')).toBe(
      'https://swiftchain.test/login',
    );
  });

  it('allows a usable token on dashboard routes', () => {
    expect(
      middleware(request('/dashboard', { authToken: 'opaque-session-token' })).headers.get(
        'location',
      ),
    ).toBeNull();
  });

  it('enforces the admin role without exposing the protected route', () => {
    expect(
      middleware(request('/admin/users', { authToken: 'opaque-session-token', userRole: 'driver' }))
        .headers.get('location'),
    ).toBe('https://swiftchain.test/dashboard');
    expect(
      middleware(request('/admin/users', { authToken: 'opaque-session-token', userRole: 'admin' }))
        .headers.get('location'),
    ).toBeNull();
  });
});
