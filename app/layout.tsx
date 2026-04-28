import './global.css';
import CommandPalette from '@/components/ui/CommandPalette';

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
        <CommandPalette />
        {children}
      </body>
    </html>
  );
}