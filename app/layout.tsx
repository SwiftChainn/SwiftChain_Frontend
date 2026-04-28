import './global.css';
import CommandPalette from '@/components/ui/CommandPalette';
import TopLoader from '@/components/ui/TopLoader';

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
        <TopLoader />
        <CommandPalette />
        {children}
      </body>
    </html>
  );
}
