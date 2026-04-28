import './global.css';
import CommandPalette from '@/components/ui/CommandPalette';
import TopLoader from '@/components/ui/TopLoader';
import ToastProvider from '@/components/providers/ToastProvider';

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
        <ToastProvider>
          <TopLoader />
          <CommandPalette />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
