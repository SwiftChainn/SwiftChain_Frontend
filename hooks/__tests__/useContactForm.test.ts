import { renderHook, act } from '@testing-library/react';
import { useContactForm } from '@/hooks/useContactForm';
import { contactService } from '@/services/contactService';

jest.mock('@/services/contactService', () => ({
  contactService: {
    submitTicket: jest.fn().mockResolvedValue({
      success: true,
      ticketId: 'TKT-123',
      message: 'Ticket submitted',
    }),
  },
}));

describe('useContactForm', () => {
  afterEach(() => jest.clearAllMocks());

  it('should initialise with isSuccess false', () => {
    const { result } = renderHook(() => useContactForm());
    expect(result.current.isSuccess).toBe(false);
  });

  it('should initialise with ticketId null', () => {
    const { result } = renderHook(() => useContactForm());
    expect(result.current.ticketId).toBeNull();
  });

  it('should initialise with no attachment', () => {
    const { result } = renderHook(() => useContactForm());
    expect(result.current.attachment).toBeNull();
  });

  it('should set attachment when handleAttachmentChange is called with a valid file', () => {
    const { result } = renderHook(() => useContactForm());
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    act(() => {
      result.current.handleAttachmentChange(file);
    });
    expect(result.current.attachment).toBe(file);
  });

  it('should set attachmentError for invalid file type', () => {
    const { result } = renderHook(() => useContactForm());
    const file = new File(['test'], 'test.exe', { type: 'application/exe' });
    act(() => {
      result.current.handleAttachmentChange(file);
    });
    expect(result.current.attachmentError).toBeTruthy();
    expect(result.current.attachment).toBeNull();
  });

  it('should clear attachment when called with null', () => {
    const { result } = renderHook(() => useContactForm());
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    act(() => { result.current.handleAttachmentChange(file); });
    act(() => { result.current.handleAttachmentChange(null); });
    expect(result.current.attachment).toBeNull();
  });

  it('should set isSuccess and ticketId after successful submit', async () => {
    const { result } = renderHook(() => useContactForm());
    await act(async () => {
      await result.current.onSubmit({
        subject: 'Valid subject here',
        category: 'technical',
        message: 'This is a valid message with enough characters to pass validation.',
      });
    });
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.ticketId).toBe('TKT-123');
  });

  it('should call contactService.submitTicket on submit', async () => {
    const { result } = renderHook(() => useContactForm());
    await act(async () => {
      await result.current.onSubmit({
        subject: 'Valid subject here',
        category: 'billing',
        message: 'This is a valid message with enough characters to pass validation.',
      });
    });
    expect(contactService.submitTicket).toHaveBeenCalledTimes(1);
  });

  it('should reset isSuccess and ticketId when resetForm is called', async () => {
    const { result } = renderHook(() => useContactForm());
    await act(async () => {
      await result.current.onSubmit({
        subject: 'Valid subject here',
        category: 'general',
        message: 'This is a valid message with enough characters to pass validation.',
      });
    });
    act(() => { result.current.resetForm(); });
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.ticketId).toBeNull();
  });
});