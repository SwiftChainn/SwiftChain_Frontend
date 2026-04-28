import { render, screen, fireEvent } from '@testing-library/react';
import { Accordion } from '@/components/support/Accordion';
import type { FaqItem } from '@/services/faqService';

jest.mock('@/components/support/Accordion.module.css', () => ({
  accordionItem: 'accordionItem',
  trigger: 'trigger',
  icon: 'icon',
  iconOpen: 'iconOpen',
  panel: 'panel',
  panelOpen: 'panelOpen',
  panelText: 'panelText',
}));

const mockItem: FaqItem = {
  id: 'item-1',
  question: 'How do I track my delivery?',
  answer: 'You can track your delivery from the dashboard.',
};

describe('Accordion', () => {
  it('should render the question', () => {
    render(<Accordion item={mockItem} />);
    expect(screen.getByText('How do I track my delivery?')).toBeInTheDocument();
  });

  it('should not show the answer by default', () => {
    render(<Accordion item={mockItem} />);
    const panel = screen.getByRole('region', { hidden: true });
    expect(panel).toHaveAttribute('aria-hidden', 'true');
  });

  it('should show the answer when the trigger is clicked', () => {
    render(<Accordion item={mockItem} />);
    const button = screen.getByRole('button');
    fireEvent.click(button);

    const panel = screen.getByRole('region');
    expect(panel).toHaveAttribute('aria-hidden', 'false');
    expect(
      screen.getByText('You can track your delivery from the dashboard.'),
    ).toBeInTheDocument();
  });

  it('should set aria-expanded to true when open', () => {
    render(<Accordion item={mockItem} />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('should close when clicked again', () => {
    render(<Accordion item={mockItem} />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    fireEvent.click(button);
    const panel = screen.getByRole('region', { hidden: true });
    expect(panel).toHaveAttribute('aria-hidden', 'true');
  });

  it('should render open by default when defaultOpen is true', () => {
    render(<Accordion item={mockItem} defaultOpen={true} />);
    const panel = screen.getByRole('region');
    expect(panel).toHaveAttribute('aria-hidden', 'false');
  });
});