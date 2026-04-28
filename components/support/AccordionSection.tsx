import type { FaqCategory } from '@/services/faqService';
import { Accordion } from './Accordion';

interface AccordionSectionProps {
  category: FaqCategory;
}

/**
 * AccordionSection — renders a single FAQ category heading
 * and its list of Accordion items.
 */
export function AccordionSection({ category }: AccordionSectionProps) {
  return (
    <section style={{ marginBottom: '2rem' }}>
      <h2
        style={{
          fontSize: '1.125rem',
          fontWeight: 700,
          color: '#1f2937',
          paddingBottom: '0.5rem',
          borderBottom: '2px solid #3b82f6',
          marginBottom: '0.5rem',
        }}
      >
        {category.category}
      </h2>
      {category.items.map((item) => (
        <Accordion key={item.id} item={item} />
      ))}
    </section>
  );
}