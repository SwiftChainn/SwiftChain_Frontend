import { ContactForm } from '@/features/support/components/ContactForm';

export const metadata = {
  title: 'Contact Support | SwiftChain',
  description: 'Submit a support ticket to the SwiftChain team.',
};

export default function SupportPage() {
  return (
    <main style={{ maxWidth: '640px', margin: '0 auto', padding: '2rem 1rem' }}>
      <h1
        style={{
          fontSize: '1.875rem',
          fontWeight: 800,
          color: '#111827',
          marginBottom: '0.5rem',
        }}
      >
        Contact Support
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem', fontSize: '1rem' }}>
        Fill in the form below and our team will respond within 24 hours.
      </p>
      <ContactForm />
    </main>
  );
}