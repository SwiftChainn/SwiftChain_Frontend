import './global.css';
import OfflineBanner from '@/components/wallet/ui/OfflineBanner';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Providers } from './providers';
import TopLoader from '@/components/ui/TopLoader';
import CommandPalette from '@/components/ui/CommandPalette';
import ToastProvider from '@/components/providers/ToastProvider';
import ModalProvider from '@/components/providers/ModalProvider';

export const metadata = {
  title: 'SwiftChain',
  description: 'Blockchain-Powered Logistics Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ModalProvider>
          <Providers>
            <ToastProvider>
              <OfflineBanner />
              <div className="fixed right-4 top-4 z-50">
                <ThemeToggle />
              </div>
              <TopLoader />
              <CommandPalette />
              {children}
            </ToastProvider>
          </Providers>
        </ModalProvider>
      </body>
    </html>
  );
}
