import './global.css';
import { themeService } from '@/services/themeService';
import { AppShell } from '@/components/layout/AppShell';

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeService.getThemeScript() }}
        />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
