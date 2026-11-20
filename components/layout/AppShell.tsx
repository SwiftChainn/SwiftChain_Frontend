'use client';

import type { ReactNode } from 'react';
import { Providers } from '@/app/providers';
import { NotificationProvider } from '@/context/NotificationContext';
import { NotificationCenter } from '@/components/layout/NotificationCenter';
import { CurrencySelector } from '@/components/layout/CurrencySelector';
import { PushNotificationButton } from '@/components/layout/PushNotificationButton';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import OfflineBanner from '@/components/ui/OfflineBanner';
import TopLoader from '@/components/ui/TopLoader';
import CommandPalette from '@/components/ui/CommandPalette';
import ToastProvider from '@/components/providers/ToastProvider';
import ModalProvider from '@/components/providers/ModalProvider';
import { GlobalFooter } from '@/components/shared/GlobalFooter';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ModalProvider>
      <Providers>
        <NotificationProvider>
          <ToastProvider>
            <OfflineBanner />
            <div className="fixed right-4 top-4 z-50 flex items-center gap-2">
              <CurrencySelector />
              <PushNotificationButton />
              <NotificationCenter />
              <ThemeToggle />
            </div>
            <TopLoader />
            <CommandPalette />
            {children}
            <GlobalFooter />
          </ToastProvider>
        </NotificationProvider>
      </Providers>
    </ModalProvider>
  );
}
