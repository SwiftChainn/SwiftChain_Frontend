'use client';

import { useFaq } from '@/hooks/useFaq';
import { AccordionSection } from './AccordionSection';

/**
 * FaqHelpCenter — top-level FAQ component.
 * Consumes useFaq hook, handles loading/error/empty states,
 * and renders categorised AccordionSection components.
 */
export function FaqHelpCenter() {
  const { categories, isLoading, isError } = useFaq();

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
        Loading help articles…
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
        Failed to load FAQ. Please try again later.
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
        No FAQ articles available.
      </div>
    );
  }

  return (
    <div>
      {categories.map((category) => (
        <AccordionSection key={category.id} category={category} />
      ))}
    </div>
  );
}