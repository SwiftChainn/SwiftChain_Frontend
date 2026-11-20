'use client';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/shared/ThemeProvider';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { CurrencyProvider } from '@/context/CurrencyContext';
import { SessionProvider } from '@/context/SessionContext';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: true,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <SessionProvider>
            <CurrencyProvider>{children}</CurrencyProvider>
          </SessionProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
