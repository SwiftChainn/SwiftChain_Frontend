const TOKEN_KEY = 'authToken';

function expiresAt(token: string): number | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))) as {
      exp?: number;
    };
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return 0;
  }
}

export const sessionService = {
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem(TOKEN_KEY);
    const expiry = token ? expiresAt(token) : null;
    if (token && expiry !== null && expiry <= Date.now()) {
      this.clear();
      return null;
    }
    return token;
  },
  save(token: string, role?: string) {
    localStorage.setItem(TOKEN_KEY, token);
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${TOKEN_KEY}=${encodeURIComponent(token)}; Path=/; SameSite=Lax${secure}`;
    if (role) document.cookie = `userRole=${encodeURIComponent(role)}; Path=/; SameSite=Lax${secure}`;
  },
  clear() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
    document.cookie = `${TOKEN_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
    document.cookie = 'userRole=; Path=/; Max-Age=0; SameSite=Lax';
  },
};
