export const dynamic = 'force-dynamic';

import { FaqHelpCenter } from '@/components/support/FaqHelpCenter';

export const metadata = {
  title: 'FAQ & Help Center | SwiftChain',
  description: 'Find answers to common questions about SwiftChain.',
};

export default function FaqPage() {
  return (
    <main style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#111827', marginBottom: '0.5rem' }}>
        FAQ & Help Center
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem', fontSize: '1rem' }}>
        Find answers to common questions about SwiftChain.
      </p>
      <FaqHelpCenter />
    </main>
  );
}