'use client';

import { useState } from 'react';
import type { FaqItem } from '@/services/faqService';
import styles from './Accordion.module.css';

interface AccordionProps {
  item: FaqItem;
  defaultOpen?: boolean;
}

/**
 * Accordion — renders a single FAQ question/answer pair.
 * Animates open/close via CSS max-height transition in Accordion.module.css.
 */
export function Accordion({ item, defaultOpen = false }: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={styles.accordionItem}>
      <button
        className={styles.trigger}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls={`faq-panel-${item.id}`}
        type="button"
      >
        <span>{item.question}</span>
        <svg
          className={`${styles.icon} ${isOpen ? styles.iconOpen : ''}`}
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M5 7.5L10 12.5L15 7.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div
        id={`faq-panel-${item.id}`}
        role="region"
        className={`${styles.panel} ${isOpen ? styles.panelOpen : ''}`}
        aria-hidden={!isOpen}
      >
        <p className={styles.panelText}>{item.answer}</p>
      </div>
    </div>
  );
}