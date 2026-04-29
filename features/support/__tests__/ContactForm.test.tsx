import { render, screen } from '@testing-library/react';
import { ContactForm } from '@/features/support/components/ContactForm';

const mockUseContactForm = jest.fn();

jest.mock('@/hooks/useContactForm', () => ({
  useContactForm: () => mockUseContactForm(),
  SUPPORT_CATEGORIES: [
    { value: 'general', label: 'General Enquiry' },
    { value: 'technical', label: 'Technical Issue' },
  ],
}));

const defaultMockReturn = {
  form: {
    register: () => ({}),
    handleSubmit: (fn: unknown) => fn,
    formState: { errors: {} },
  },
  isSubmitting: false,
  isSuccess: false,
  ticketId: null,
  attachment: null,
  attachmentError: null,
  handleAttachmentChange: jest.fn(),
  onSubmit: jest.fn(),
  resetForm: jest.fn(),
};

describe('ContactForm', () => {
  beforeEach(() => {
    mockUseContactForm.mockReturnValue(defaultMockReturn);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the subject field', () => {
    render(<ContactForm />);
    expect(screen.getByLabelText(/subject/i)).toBeInTheDocument();
  });

  it('should render the category dropdown', () => {
    render(<ContactForm />);
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
  });

  it('should render the message textarea', () => {
    render(<ContactForm />);
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
  });

  it('should render the attachment file input', () => {
    render(<ContactForm />);
    expect(screen.getByLabelText(/attachment/i)).toBeInTheDocument();
  });

  it('should render the submit button', () => {
    render(<ContactForm />);
    expect(
      screen.getByRole('button', { name: /submit support request/i }),
    ).toBeInTheDocument();
  });

  it('should render SuccessConfirmation when isSuccess is true', () => {
    mockUseContactForm.mockReturnValue({
      ...defaultMockReturn,
      isSuccess: true,
      ticketId: 'TKT-999',
    });
    render(<ContactForm />);
    expect(screen.getByText(/ticket submitted/i)).toBeInTheDocument();
    expect(screen.getByText(/TKT-999/)).toBeInTheDocument();
  });
});