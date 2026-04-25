// DEV-ONLY DEMO PAGE — delete before opening the PR.
// Primes the auth store with a Fleet Operator user so /fleet is viewable
// without a real auth backend.
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function DevLoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    setUser({
      id: 'demo-fleet-1',
      email: 'fleet@example.com',
      role: 'Fleet Operator',
    });
    router.replace('/fleet');
  }, [router, setUser]);

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui' }}>
      <p>Signing in as demo Fleet Operator…</p>
    </main>
  );
}
